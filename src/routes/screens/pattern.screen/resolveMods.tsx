import {Path as PKPath} from 'canvaskit-wasm';
import {transformShape} from '../../../editor/tilingPoints';
import {cmdsToCoords} from '../../../gcode/cmdsToSegments';
import {epsilon} from '../../../rendering/epsilonToZero';
import {Matrix, dist} from '../../../rendering/getMirrorTransforms';
import {pkPathToSegments} from '../../../sidebar/pkClipPaths';
import {Coord} from '../../../types';
import {centroid} from '../../findReflectionAxes';
import {
    pkPathFromCoords,
    coordsFromBarePath,
    calcPolygonArea,
    getSimplePatternData,
    getShapeColors,
} from '../../getPatternData';
import {pk} from '../../pk';
import {segmentsCmds} from '../animator.screen/cropPath';
import {globals} from './eval-globals';
import {AnimCtx, a, Ctx, RenderItem, Patterns} from './evaluate';
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
} from './export-types';
import {evalTimeline} from './evalEase';

type CCrop = {type: 'crop'; id: string; mode?: CropMode; hole?: boolean};
type CInset = {type: 'inset'; v: number};
type CropsAndMatrices = (CCrop | Matrix[] | CInset)[];

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
            return modMatrix({...mod, v: a.coord(ctx, mod.v)});
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
    k: ShapeStyle['kind'],
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

const renderPattern = (ctx: Ctx, outer: CropsAndMatrices, pattern: Pattern) => {
    // not doing yet
    if (pattern.contents.type !== 'shapes') return;
    const tiling = ctx.patterns[pattern.id];
    const patternmods = pattern.mods.map((m) => resolvePMod(ctx.anim, m));

    // const ptx = mods.flatMap((mod) => modMatrix(mod));
    const simple = getSimplePatternData(tiling, pattern.psize);
    const orderedStyles = Object.values(pattern.contents.styles).sort((a, b) => a.order - b.order);

    const needColors = orderedStyles.some((s) => s.kind.type === 'alternating');
    const {colors} = needColors
        ? getShapeColors(simple.uniqueShapes, simple.minSegLength)
        : {colors: []};

    const midShapes = modsToShapes(
        ctx.cropCache,
        patternmods,
        simple.uniqueShapes.map((shape, i) => ({shape, i})),
    );

    ctx.items.push(
        ...midShapes.flatMap(({shape, i}) => {
            const center = centroid(shape);
            const radius = Math.min(...shape.map((s) => dist(s, center)));
            const fills: Record<
                string,
                Omit<Fill, 'mods' | 'zIndex'> & {mods: CropsAndMatrices; zIndex: number}
            > = {};
            const lines: Record<
                string,
                Omit<Line, 'mods' | 'zIndex'> & {mods: CropsAndMatrices; zIndex: number}
            > = {};

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
                if (s.disabled) return;
                const match = matchKind(s.kind, i, colors[i], center, simple.eigenCorners);
                if (!match) {
                    return;
                }
                if (typeof match === 'object') {
                    anim.values.styleCenter = match;
                }
                // hmmm need to align the ... style that it came from ... with animvalues
                // like `styleCenter`
                Object.values(s.fills).forEach((fill) => {
                    const mods = [
                        ...(fills[fill.id]?.mods ?? []),
                        ...(fill.mods ?? []).map((mod) => resolvePMod(anim, mod)),
                    ];
                    const zIndex =
                        (fills[fill.id]?.zIndex ?? 0) +
                        (fill.zIndex ? a.number(anim, fill.zIndex) : 0);
                    fills[fill.id] = {...fills[fill.id], ...fill, mods, zIndex};
                });
                Object.values(s.lines).forEach((line) => {
                    const mods = [
                        ...(lines[line.id]?.mods ?? []),
                        ...(line.mods ?? []).map((mod) => resolvePMod(anim, mod)),
                    ];
                    const zIndex =
                        (lines[line.id]?.zIndex ?? 0) +
                        (line.zIndex ? a.number(anim, line.zIndex) : 0);
                    lines[line.id] = {...lines[line.id], ...line, mods, zIndex};
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

                    if (f.mods.length) {
                        const midShapes = modsToShapes(ctx.cropCache, f.mods, [{shape, i: 0}]);

                        return {
                            // pk???
                            type: 'path',
                            key: `fill-${i}-${fi}`,
                            fill: rgb,
                            opacity,
                            shapes: midShapes.map((s) => s.shape),
                            zIndex,
                        };
                    }

                    return {
                        type: 'path',
                        key: `fill-${i}-${fi}`,
                        fill: rgb,
                        opacity,
                        shapes: [shape],
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
                    const zIndex = f.zIndex;

                    if (f.mods.length) {
                        const midShapes = modsToShapes(ctx.cropCache, f.mods, [{shape, i: 0}]);

                        return {
                            // pk???
                            type: 'path',
                            key: `fill-${i}-${fi}`,
                            stroke: rgb,
                            strokeWidth: width,
                            opacity,
                            shapes: midShapes.map((s) => s.shape),
                            zIndex,
                        };
                    }

                    return {
                        type: 'path',
                        key: `stroke-${i}-${fi}`,
                        stroke: rgb,
                        strokeWidth: width,
                        shapes: [shape],
                        opacity,
                        zIndex,
                    };
                }),
            ];

            return res.filter(notNull);
        }),
    );
};
const notNull = <T,>(v: T): v is NonNullable<T> => v != null;
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

    const path = pk.Path.MakeFromCmds(
        segmentsCmds(object.segments[object.segments.length - 1].to, object.segments, false),
    )!;
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
            fill: rgb,
            opacity,
            shapes: cmdsToCoords(thisPath.toCmds()).map((s) => s.points),
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
            stroke: rgb,
            strokeWidth: a.number(anim, f.width ?? 0) / 100,
            opacity,
            shapes: cmdsToCoords(thisPath.toCmds()).map((s) => s.points),
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

    for (let layer of Object.values(state.layers)) {
        const group = layer.entities[layer.rootGroup];
        if (group.type !== 'Group') {
            throw new Error(`root not a group`);
        }
        const fromtl = evalTimeline(state.styleConfig.timeline, t);
        const values: Record<string, any> = {...globals, t, ...fromtl};
        const anim = {
            cache: animCache,
            values,
            palette: state.styleConfig.palette,
            warn,
        };
        Object.entries(layer.shared).forEach(([name, value]) => {
            values[name] = a.value(anim, value);
        });

        renderGroup({state, anim, layer, patterns, items, cropCache}, [], group);
    }
    const hasZ = items.some((s) => s.zIndex != null);
    if (hasZ) {
        items.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    }
    return {items, warnings};
};
