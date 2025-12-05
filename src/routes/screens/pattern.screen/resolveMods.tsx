import {Path as PKPath} from 'canvaskit-wasm';
import {transformShape} from '../../../editor/tilingPoints';
import {cmdsToCoords, cmdsToSegments} from '../../../gcode/cmdsToSegments';
import {closeEnough, epsilon, withinLimit} from '../../../rendering/epsilonToZero';
import {Matrix, dist} from '../../../rendering/getMirrorTransforms';
import {pkPathToSegments} from '../../../sidebar/pkClipPaths';
import {BarePath, Coord} from '../../../types';
import {centroid} from '../../findReflectionAxes';
import {
    pkPathFromCoords,
    coordsFromBarePath,
    calcPolygonArea,
    getSimplePatternData,
    getShapeColors,
    sortShapesByPolar,
} from '../../getPatternData';
import {pk} from '../../pk';
import {segmentsCmds} from '../animator.screen/cropPath';
import {globals, mulberry32} from './eval-globals';
import {AnimCtx, a, Ctx, RenderItem, Patterns, isCoord, isColor} from './evaluate';
import {
    CropMode,
    PMods,
    modMatrix,
    ShapeStyle,
    insetPkPath,
    Pattern,
    Fill,
    Line,
    colorToRgb,
    EObject,
    Group,
    State,
    Shadow,
    ConcreteFill,
    ConcreteLine,
    Color,
    ShapeKind,
    TChunk,
} from './export-types';
import {easeFn, evalTimeline} from './evalEase';
import {scalePos} from '../../../editor/scalePos';
import {
    cutSegments,
    edgesByEndpoint,
    shapesFromSegments,
    splitOverlappingSegs,
    unique,
} from '../../shapesFromSegments';
import {lineLine, lineToSlope, SlopeIntercept, slopeKey} from '../../../rendering/intersect';
import {coordKey} from '../../../rendering/coordKey';
import {Bounds, boundsForCoords} from '../../../editor/Bounds';

type CCrop = {type: 'crop'; id: string; mode?: CropMode; hole?: boolean};
type CInset = {type: 'inset'; v: number};
export type CropsAndMatrices = (CCrop | Matrix[] | CInset)[];

export const resolvePMod = (ctx: AnimCtx, mod: PMods): CropsAndMatrices[0] => {
    switch (mod.type) {
        case 'inset':
            return {...mod, v: a.number(ctx, mod.v)};
        case 'crop':
            return mod;
        case 'scale':
            return modMatrix({
                ...mod,
                v: a.coordOrNumber(ctx, mod.v),
                origin: mod.origin ? a.coord(ctx, mod.origin) : undefined,
            });
        case 'rotate':
            return modMatrix({
                ...mod,
                v: a.number(ctx, mod.v),
                origin: mod.origin ? a.coord(ctx, mod.origin) : undefined,
            });
        case 'translate':
            return modMatrix({...mod, v: scalePos(a.coord(ctx, mod.v), 0.01)});
    }
};

const matchesDistances = (dist: number, distances: number[]) => {
    for (let i = 0; i < distances.length; i++) {
        if (dist < distances[i]) {
            return i % 2 === 1;
        }
    }
    return false;
};

const matchKind = (
    k: ShapeKind,
    i: number,
    color: number,
    center: Coord,
    eigenCorners: Coord[][],
): boolean | Coord => {
    switch (k.type) {
        case 'everything':
            return true;
        case 'alternating':
            return color === k.index;
        case 'explicit':
            return k.ids[i];
        case 'shape':
            console.log('not right');
            return false;
        case 'distance': {
            const corners = eigenCorners[k.corner];
            if (!k.repeat) {
                const d = dist(corners[0], center);
                const res = matchesDistances(d, k.distances);
                return res ? corners[0] : false;
            }
            let best: [number, Coord] = [Infinity, {x: 0, y: 0}];
            corners.forEach((corner) => {
                const d = dist(corner, center);
                if (d < best[0]) best = [d, corner];
            });
            return matchesDistances(best[0], k.distances) ? best[1] : false;
        }
    }
    return false;
};

const insetShape = (shape: Coord[], inset: number) => {
    if (!shape.length) return [];
    const path = pkPathFromCoords(shape, false)!;
    if (!path) return [];
    if (inset < 0.01) return [shape];
    insetPkPath(path, inset / 100);
    path.simplify();
    const items = pkPathToSegments(path);
    path.delete();
    return items.map(coordsFromBarePath);
};

const clipShape = (shape: Coord[], mod: CCrop, crop: PKPath) => {
    if (mod.mode === 'rough') {
        const center = centroid(shape);
        if (!crop.contains(center.x, center.y)) {
            return [];
        }
        return [shape];
    } else if (mod.mode === 'half') {
        const path = pkPathFromCoords(shape)!;
        const other = path.copy();
        other.op(crop, mod.hole ? pk.PathOp.Difference : pk.PathOp.Intersect);
        other.simplify();
        const size = pkPathToSegments(other)
            .map(coordsFromBarePath)
            .map(calcPolygonArea)
            .reduce((a, b) => a + b, 0);
        other.delete();
        path.delete();
        const area = calcPolygonArea(shape);
        if (size < area / 2 + epsilon) {
            return [];
        }
        return [shape];
    } else {
        const path = pkPathFromCoords(shape)!;
        path.op(crop, mod.hole ? pk.PathOp.Difference : pk.PathOp.Intersect);
        path.simplify();
        const items = pkPathToSegments(path);
        path.delete();
        return items.map(coordsFromBarePath);
    }
};

export const modsToShapes = (
    cropCache: Ctx['cropCache'],
    mods: CropsAndMatrices,
    shapes: {shape: Coord[]; i: number}[],
) => {
    return mods.reduce((shapes, mod) => {
        if (Array.isArray(mod)) {
            return shapes.map((shape) => ({
                shape: transformShape(shape.shape, mod),
                i: shape.i,
            }));
        }

        if (mod.type === 'inset') {
            if (Math.abs(mod.v) <= 0.01) return shapes;
            return shapes.flatMap((shape) => {
                return insetShape(shape.shape, mod.v).map((coords) => ({
                    shape: coords,
                    i: shape.i,
                }));
            });
        }

        const crop = cropCache.get(mod.id)!;
        if (!crop) {
            throw new Error(`No crop? ${mod.id} : ${[...cropCache.keys()]}`);
        }
        return shapes.flatMap((shape) => {
            return clipShape(shape.shape, mod, crop.path).map((coords) => ({
                shape: coords,
                i: shape.i,
            }));
        });
    }, shapes);
};

const unzip = <T,>(v: T[], test: (t: T) => boolean) => {
    const left: T[] = [];
    const right: T[] = [];
    v.forEach((item) => {
        if (test(item)) {
            right.push(item);
        } else {
            left.push(item);
        }
    });
    return [left, right] as const;
};

const coordPairs = (coords: Coord[]) => {
    const res: [Coord, Coord][] = [];
    coords.forEach((coord, i) => {
        res.push([coords[i === 0 ? coords.length - 1 : i - 1], coord]);
    });
    return res;
};

const overlapping = (one: SlopeIntercept, two: SlopeIntercept) =>
    closeEnough(one.m, two.m) &&
    closeEnough(one.b, two.b) &&
    (withinLimit(one.limit!, two.limit![0]) ||
        withinLimit(one.limit!, two.limit![1]) ||
        withinLimit(two.limit!, one.limit![0]) ||
        withinLimit(two.limit!, one.limit![1]));

const coordsIntersectCoords = (one: Coord[], twos: SlopeIntercept[]) => {
    return coordLines(one).some((one) => twos.some((two) => lineHit(one, two)));
};

const lineHit = (one: SlopeIntercept, two: SlopeIntercept) => {
    // if (overlapping(one, two)) {
    //     // console.log('yes overlap', one, two);
    //     return true;
    // }
    // const pt = lineLine(one, two);
    // if (pt) {
    //     // console.log('yes intersect', one, two, pt);
    //     return true;
    // }
    // console.log('no');
    return overlapping(one, two) || !!lineLine(one, two);
    // return false;
};

const coordPairKey = ([left, right]: [Coord, Coord]) => {
    if (closeEnough(left.x, right.x) ? right.y < left.y : right.x < left.x) {
        [left, right] = [right, left];
    }
    return `${coordKey(left)}:${coordKey(right)}`;
};

const coordLines = (coords: Coord[]) =>
    coordPairs(coords).map((pair) => lineToSlope(pair[0], pair[1], true));

const coordPairOnShape = (pair: [Coord, Coord], shape: SlopeIntercept[]) => {
    const line = lineToSlope(pair[0], pair[1], true);
    return shape.some((sline) => overlapping(line, sline));
};

const allSameLines = (one: SlopeIntercept[], two: SlopeIntercept[]) => {
    if (one.length !== two.length) return false;
    const kone = one.map(slopeKey);
    return two.every((line) => kone.includes(slopeKey(line)));
};

const adjustShapes = (
    anim: Ctx['anim'],
    cropCache: Ctx['cropCache'],
    uniqueShapes: Coord[][],
    adjustments: {shapes: BarePath[]; mods: PMods[]; t?: TChunk}[],
): Coord[][] => {
    let modified = false;
    for (let {shapes, mods, t} of adjustments) {
        const local: Record<string, any> = {};
        if (t) {
            const res = resolveT(t, anim.values.t);
            if (res == null) continue;
            local.t = res;
        }
        for (let shape of shapes) {
            const shapeCoords = coordsFromBarePath(shape);
            const center = centroid(shapeCoords);
            const resolved = mods.map((mod) =>
                resolvePMod({...anim, values: {...anim.values, ...local, center}}, mod),
            );
            const shapeLines = coordLines(shapeCoords);
            const moved = modsToShapes(cropCache, resolved, [{shape: shapeCoords, i: 0}]);
            const movedLines = moved.map((m) => coordLines(m.shape));
            if (allSameLines(shapeLines, movedLines.flat())) {
                continue;
            }
            // console.log('here we are', shapeLines, movedLines);
            const [left, right] = unzip(uniqueShapes, (coords) => {
                const got =
                    coordsIntersectCoords(coords, shapeLines) ||
                    movedLines.some((moved) => coordsIntersectCoords(coords, moved));
                // console.log('did intersect', got);
                return got;
            });
            let segs = unique(right.flatMap(coordPairs), coordPairKey).filter(
                (pair) => !coordPairOnShape(pair, shapeLines),
            );
            segs.push(...moved.flatMap((m) => coordPairs(m.shape)));
            segs = cutSegments(segs);
            const byEndPoint = edgesByEndpoint(segs);
            // TODO: so I want to find eigenpoints, only ones that are ... along the moved path maybe?
            // or like the original or moved path idk.
            const one = unique(segs.flat(), coordKey);
            const two = unique(
                moved.flatMap((m) => m.shape),
                coordKey,
            );
            const cmoved = centroid(moved.flatMap((m) => m.shape));
            const reconstructed = shapesFromSegments(byEndPoint, one).filter(
                (c) => !matchesBounds(boundsForCoords(...c), cmoved),
            );
            // uniqueShapes = reconstructed;
            modified = true;
            uniqueShapes = [...left, ...reconstructed];
            // console.log('eft', left);
            // uniqueShapes = [...left, ...right];
            // uniqueShapes = left;
        }
    }

    return modified ? sortShapesByPolar(uniqueShapes) : uniqueShapes;
};

const matchesBounds = (bounds: Bounds, coord: Coord) =>
    coord.x <= bounds.x1 && coord.x >= bounds.x0 && coord.y <= bounds.y1 && coord.y >= bounds.y0;

export const resolveT = (
    {chunk, total, ease}: {chunk: number; total: number; ease: string},
    t: number,
) => {
    const fn = easeFn(ease);
    const cur = t * (total - 0);
    const cnum = Math.floor(cur);
    if (cnum === chunk - 1) {
        return fn(cur - cnum);
    }
    return null;
};

const renderPattern = (ctx: Ctx, outer: CropsAndMatrices, pattern: Pattern) => {
    // not doing yet
    if (pattern.contents.type !== 'shapes') return;
    const tiling = ctx.patterns[pattern.tiling];
    if (!tiling) {
        throw new Error(`Pattern not found ${pattern.tiling}`);
    }
    const patternmods = pattern.mods.map((m) => resolvePMod(ctx.anim, m));

    const simple = getSimplePatternData(tiling, pattern.psize);
    let baseShapes = simple.uniqueShapes;
    ctx.keyPoints.push(...baseShapes.flat());
    if (Object.keys(pattern.adjustments).length) {
        // TODO: further check that any adjustments actually modify things
        baseShapes = adjustShapes(
            ctx.anim,
            ctx.cropCache,
            baseShapes,
            Object.values(pattern.adjustments)
                .filter((a) => !a.disabled)
                .map(({shapes, mods, t}) => ({
                    t,
                    shapes: shapes.map((key) => ctx.state.shapes[key]),
                    mods,
                })),
        );
    }

    const orderedStyles = Object.values(pattern.contents.styles).sort((a, b) => a.order - b.order);

    const needColors = orderedStyles.some((s) =>
        Array.isArray(s.kind)
            ? s.kind.some((k) => k.type === 'alternating')
            : s.kind.type === 'alternating',
    );
    const {colors} = needColors ? getShapeColors(baseShapes, simple.minSegLength) : {colors: []};

    const midShapes = modsToShapes(
        ctx.cropCache,
        patternmods,
        baseShapes.map((shape, i) => ({shape, i})),
    );

    ctx.items.push(
        ...midShapes.flatMap(({shape, i}) => {
            const center = centroid(shape);
            const radius = Math.min(...shape.map((s) => dist(s, center)));
            const fills: Record<string, ConcreteFill> = {};
            const lines: Record<string, ConcreteLine> = {};

            const stuff: string[] = [];

            const anim: (typeof ctx)['anim'] = {
                ...ctx.anim,
                values: {
                    ...ctx.anim.values,
                    center,
                    radius,
                    shape,
                    i,
                },
            };

            orderedStyles.forEach((s) => {
                const match = Array.isArray(s.kind)
                    ? s.kind.some((k) => matchKind(k, i, colors[i], center, simple.eigenCorners))
                    : matchKind(s.kind, i, colors[i], center, simple.eigenCorners);
                if (!match) {
                    return;
                }
                if (s.disabled) {
                    return;
                }
                const local: Record<string, any> = {};
                if (s.t) {
                    const got = resolveT(s.t, anim.values.t);
                    if (got == null) return; // out of range
                    local.t = got;
                }
                stuff.push(`style id: ${s.id}`);
                if (typeof match === 'object') {
                    local.styleCenter = match;
                }
                const localAnim = {...anim, values: {...anim.values, ...local}};
                // hmmm need to align the ... style that it came from ... with animvalues
                // like `styleCenter`
                Object.values(s.fills).forEach((fill) => {
                    const cfill = dropNully(resolveFill(localAnim, fill));
                    if (cfill.enabled === false) {
                        stuff.push(`disabled fill: ${fill.id}`);
                        return;
                    }
                    stuff.push(`fill: ${fill.id}`);
                    if (!fills[fill.id]) {
                        fills[fill.id] = cfill;
                        return;
                    }
                    // merge: mods.
                    const now = fills[fill.id];
                    cfill.mods.unshift(...now.mods);
                    Object.assign(now, cfill);
                });
                Object.values(s.lines).forEach((line) => {
                    const cline = dropNully(resolveLine(localAnim, line));
                    if (cline.enabled === false) return;
                    if (!lines[line.id]) {
                        lines[line.id] = cline;
                        return;
                    }
                    const now = lines[line.id];
                    cline.mods.unshift(...now.mods);
                    Object.assign(now, cline);
                });
            });

            const res: (RenderItem | undefined)[] = [
                ...Object.values(fills).flatMap((f, fi): RenderItem[] | RenderItem | undefined => {
                    if (f.color == null) return;
                    const color = a.color(anim, f.color);
                    if (!color) console.log('waht', color, f.color);
                    const rgb = colorToRgb(color);
                    const zIndex = f.zIndex;
                    const opacity = f.opacity ? a.number(anim, f.opacity) : undefined;
                    const shadow = resolveShadow(anim, f.shadow);
                    const key = `fill-${i}-${fi}`;
                    ctx.byKey[key] = stuff;

                    return {
                        type: 'path',
                        key,
                        color: rgb,
                        opacity,
                        shapes: f.mods.length
                            ? modsToShapes(ctx.cropCache, f.mods, [{shape, i: 0}]).map((s) =>
                                  barePathFromCoords(s.shape),
                              )
                            : [barePathFromCoords(shape)],
                        shadow,
                        zIndex,
                    };
                }),

                ...Object.values(lines).flatMap((f, fi): RenderItem[] | RenderItem | undefined => {
                    if (f.color == null) return;
                    if (!f.width) return;
                    const color = a.color(anim, f.color);
                    if (!color) console.log('waht', color, f.color);
                    const rgb = colorToRgb(color);
                    const width = a.number(anim, f.width) / 100;
                    const opacity = f.opacity ? a.number(anim, f.opacity) : undefined;
                    const shadow = resolveShadow(anim, f.shadow);
                    const zIndex = f.zIndex;
                    const key = `stroke-${i}-${fi}`;
                    ctx.byKey[key] = stuff;

                    return {
                        type: 'path',
                        key,
                        color: rgb,
                        strokeWidth: width,
                        shapes: f.mods.length
                            ? modsToShapes(ctx.cropCache, f.mods, [{shape, i: 0}]).map((s) =>
                                  barePathFromCoords(s.shape),
                              )
                            : [barePathFromCoords(shape)],
                        shadow,
                        opacity,
                        zIndex,
                    };
                }),
            ];

            return res.filter(notNull);
        }),
    );
};

export const notNull = <T,>(v: T): v is NonNullable<T> => v != null;

const resolveShadow = (anim: Ctx['anim'], shadow?: Shadow): RenderItem['shadow'] => {
    if (typeof shadow === 'string') {
        const v = a.value(anim, shadow);
        if (
            typeof v === 'object' &&
            v &&
            isCoord(v.offset) &&
            isCoord(v.blur) &&
            isColor(v.color)
        ) {
            return {
                offset: scalePos(v.offset, 0.1),
                blur: scalePos(v.blur, 0.1),
                color: colorToRgb(v.color),
            };
        }
        return;
    }
    if (!shadow) return undefined;
    return {
        blur: shadow.blur
            ? scalePos(numToCoord(a.coordOrNumber(anim, shadow.blur)), 0.1)
            : {x: 0, y: 0},
        offset: shadow.offset
            ? scalePos(numToCoord(a.coordOrNumber(anim, shadow.offset)), 0.1)
            : {x: 0, y: 0},
        color: shadow.color ? colorToRgb(a.color(anim, shadow.color)) : {r: 0, g: 0, b: 0},
    };
};

const numToCoord = (num: number | Coord) => (typeof num === 'number' ? {x: num, y: num} : num);

const resolveFill = (anim: Ctx['anim'], f: Fill): ConcreteFill => {
    return {
        id: f.id,
        mods: f.mods.map((m) => resolvePMod(anim, m)),
        color: f.color != null ? a.color(anim, f.color) : undefined,
        opacity: f.opacity != null ? a.number(anim, f.opacity) : undefined,
        rounded: f.rounded != null ? a.number(anim, f.rounded) : undefined,
        shadow: resolveShadow(anim, f.shadow),
        thickness: f.thickness != null ? a.number(anim, f.thickness) : undefined,
        tint: f.tint != null ? a.color(anim, f.tint) : undefined,
        zIndex: f.zIndex != null ? a.number(anim, f.zIndex) : undefined,
        enabled: f.enabled != null ? a.boolean(anim, f.enabled) : undefined,
    };
};

const resolveLine = (anim: Ctx['anim'], f: Line): ConcreteLine => {
    return {
        id: f.id,
        mods: f.mods.map((m) => resolvePMod(anim, m)),
        color: f.color != null ? a.color(anim, f.color) : undefined,
        opacity: f.opacity != null ? a.number(anim, f.opacity) : undefined,
        shadow: resolveShadow(anim, f.shadow),
        thickness: f.thickness != null ? a.number(anim, f.thickness) : undefined,
        tint: f.tint != null ? a.color(anim, f.tint) : undefined,
        zIndex: f.zIndex != null ? a.number(anim, f.zIndex) : undefined,
        width: f.width != null ? a.number(anim, f.width) : undefined,
        sharp: f.sharp != null ? a.boolean(anim, f.sharp) : undefined,
        enabled: f.enabled != null ? a.boolean(anim, f.enabled) : undefined,
    };
};

const dropNully = <T extends {}>(v: T): T => {
    (Object.keys(v) as (keyof T)[]).forEach((k) => {
        if (v[k] == null) {
            delete v[k];
        }
    });
    return v;
};

const renderObject = (ctx: Ctx, crops: CropsAndMatrices, object: EObject) => {
    const anim: (typeof ctx)['anim'] = {
        ...ctx.anim,
        values: {
            ...ctx.anim.values,
            // center,
            // radius,
            // shape,
            // i,
        },
    };

    const shape = ctx.state.shapes[object.shape];
    if (!shape) return;
    const path = pk.Path.MakeFromCmds(segmentsCmds(shape.origin, shape.segments, shape.open))!;
    let remove = false;
    // const fmods = object.mods.map((m) => resolvePMod(ctx.anim, m));
    crops.forEach((mod) => {
        remove = remove || pathMod(ctx.cropCache, mod, path);
    });
    if (remove) return;

    if (object.style.disabled) return;

    Object.values(object.style.fills).map((f) => {
        if (f.color == null) return;
        const fmods = f.mods.map((m) => resolvePMod(anim, m));
        const thisPath = path.copy();
        let remove = false;
        fmods.forEach((mod) => {
            remove = remove || pathMod(ctx.cropCache, mod, thisPath);
        });

        const color = a.color(anim, f.color);
        const rgb = colorToRgb(color);
        const zIndex = f.zIndex ? a.number(anim, f.zIndex) : null;
        const opacity = f.opacity ? a.number(anim, f.opacity) : undefined;

        ctx.items.push({
            type: 'path',
            pk: thisPath,
            key: '',
            color: rgb,
            opacity,
            shadow: resolveShadow(anim, f.shadow),
            shapes: cmdsToSegments([...thisPath.toCmds()]),
            zIndex,
        });
    });

    Object.values(object.style.lines).map((f) => {
        if (f.color == null) return;
        const fmods = f.mods.map((m) => resolvePMod(anim, m));
        const thisPath = path.copy();
        let remove = false;
        fmods.forEach((mod) => {
            remove = remove || pathMod(ctx.cropCache, mod, thisPath);
        });

        const color = a.color(anim, f.color);
        const rgb = colorToRgb(color);
        const zIndex = f.zIndex ? a.number(anim, f.zIndex) : null;
        const opacity = f.opacity ? a.number(anim, f.opacity) : undefined;

        ctx.items.push({
            type: 'path',
            pk: thisPath,
            key: '',
            color: rgb,
            strokeWidth: a.number(anim, f.width ?? 0) / 100,
            opacity,
            shadow: resolveShadow(anim, f.shadow),
            shapes: cmdsToSegments([...thisPath.toCmds()]),
            zIndex,
        });
    });

    path.delete();
    // object.style.mods
};

export const pathMod = (cropCache: Ctx['cropCache'], mod: CropsAndMatrices[0], path: PKPath) => {
    if (Array.isArray(mod)) {
        mod.forEach(([a, b, c, d, e, f]) => {
            path.transform(a, b, c, d, e, f, 0, 0, 1);
        });
    } else if (mod.type === 'crop') {
        const crop = cropCache.get(mod.id)!.path;
        if (mod.mode === 'rough') {
            const center = centroid(cmdsToCoords(path.toCmds()).flatMap((c) => c.points));
            if (!crop.contains(center.x, center.y)) {
                return true;
            }
        } else if (mod.mode === 'half') {
            const other = path.copy();
            other.op(crop, mod.hole ? pk.PathOp.Difference : pk.PathOp.Intersect);
            other.simplify();
            const size = cmdsToCoords(other.toCmds())
                .map((s) => calcPolygonArea(s.points))
                .reduce((a, b) => a + b, 0);
            other.delete();
            path.delete();
            const originalSize = cmdsToCoords(path.toCmds())
                .map((s) => calcPolygonArea(s.points))
                .reduce((a, b) => a + b, 0);
            if (size < originalSize / 2 + epsilon) {
                return true;
            }
        } else {
            path.op(crop, mod.hole ? pk.PathOp.Difference : pk.PathOp.Intersect);
            path.simplify();
        }
    } else {
        insetPkPath(path, mod.v / 100);
    }
    return false;
};
// const renderFill = (ctx: Ctx, anim: Ctx['anim'], f: Fill, path: PKPath, key: string) => {
//     if (!f.color) return;
//     const color = a.color(anim, f.color);
//     const rgb = colorToRgb(color);
//     const zIndex = f.zIndex ? a.number(anim, f.zIndex) : null;
//     const opacity = f.opacity ? a.number(anim, f.opacity) : undefined;
//     if (f.mods.length) {
//         const fmods = f.mods.map((m) => resolvePMod(ctx.anim, m));
//         const midShapes = modsToShapes(ctx, fmods, [{shape, i: 0}]);
//         return {
//             // pk???
//             type: 'path',
//             key,
//             fill: rgb,
//             opacity,
//             shapes: midShapes.map((s) => s.shape),
//             zIndex,
//         };
//     }
//     return {
//         type: 'path',
//         key,
//         fill: rgb,
//         opacity,
//         shapes: [shape],
//         zIndex,
//     };
// };
const renderGroup = (ctx: Ctx, crops: CropsAndMatrices, group: Group) => {
    if (group.type !== 'Group') throw new Error('not a group');
    for (let [id] of Object.entries(group.entities).sort((a, b) => a[1] - b[1])) {
        const entity = ctx.layer.entities[id];
        switch (entity.type) {
            case 'Group':
                renderGroup(ctx, crops, entity);
                break;
            case 'Pattern':
                renderPattern(ctx, crops, entity);
                break;
            case 'Object':
                renderObject(ctx, crops, entity);
                break;
        }
    }
};

export const svgItems = (
    state: State,
    animCache: AnimCtx['cache'],
    cropCache: Ctx['cropCache'],
    patterns: Patterns,
    t: number,
) => {
    const warnings: string[] = [];
    const warn = (v: string) => warnings.push(v);
    const items: RenderItem[] = [];
    const keyPoints: Coord[] = [];
    const byKey: Record<string, string[]> = {};
    const fromtl = evalTimeline(state.styleConfig.timeline, t);
    const values: Record<string, any> = {...globals, t, ...fromtl};
    const seed = a.number(
        {cache: animCache, values, palette: state.styleConfig.palette, warn},
        state.styleConfig.seed,
    );
    values.rand = mulberry32(seed);

    for (let layer of Object.values(state.layers)) {
        const group = layer.entities[layer.rootGroup];
        if (group.type !== 'Group') {
            throw new Error(`root not a group`);
        }
        const anim = {
            cache: animCache,
            values,
            palette: state.styleConfig.palette,
            warn,
        };
        Object.entries(layer.shared).forEach(([name, value]) => {
            values[name] = a.value(anim, value);
        });

        renderGroup({state, anim, layer, patterns, items, keyPoints, cropCache, byKey}, [], group);
    }
    const len = items.length;
    for (let i = 0; i < len; i++) {
        if (items[i].shadow) {
            items.push({...items[i], shadow: undefined});
        }
    }
    const hasZ = items.some((s) => s.zIndex != null || s.shadow != null);
    if (hasZ) {
        items.sort((a, b) =>
            a.zIndex === b.zIndex
                ? (a.shadow ? 0 : 1) - (b.shadow ? 0 : 1)
                : (a.zIndex ?? 0) - (b.zIndex ?? 0),
        );
    }
    const bg = state.view.background
        ? a.color(
              {
                  cache: animCache,
                  values,
                  palette: state.styleConfig.palette,
                  warn() {},
              },
              state.view.background,
          )
        : ([0, 0, 0] as Color);

    return {items, warnings, byKey, keyPoints, bg};
};

export type Hover = {type: 'shape'; id: string};

export const barePathFromCoords = (coords: Coord[]): BarePath => ({
    segments: coords.map((c) => ({type: 'Line', to: c})),
    origin: coords[coords.length - 1],
});
