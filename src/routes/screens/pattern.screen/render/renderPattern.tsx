import {scalePos} from '../../../../editor/scalePos';
import {applyMatrices, dist, Matrix} from '../../../../rendering/getMirrorTransforms';
import {Coord, ThinTiling, Tiling} from '../../../../types';
import {centroid} from '../../../findReflectionAxes';
import {getSimplePatternData, getShapeColors, shapeSegments} from '../../../getPatternData';
import {
    aabbContains,
    allPairs,
    cmpCoords,
    edgesByEndpoint,
    EndPointMap,
    joinAdjacentShapeSegments,
    unique,
} from '../../../shapesFromSegments';
import {
    adjustShapes,
    adjustShapes2,
    coordPairKey,
    coordPairs,
    sortCoordPair,
} from '../utils/adjustShapes';
import {parseColor, Rgb} from '../utils/colors';
import {AnimCtx, Ctx, RenderItem, RenderShadow, a, isColor, isCoord} from '../eval/evaluate';
import {
    Pattern,
    colorToRgb,
    ConcreteFill,
    ConcreteLine,
    Fill,
    Line,
    Shadow,
    ShapeKind,
    PatternContents,
    ShapeStyle,
    Color,
    Hsl,
} from '../export-types';
import {
    CropsAndMatrices,
    resolveEnabledPMods,
    withShared,
    modsToShapes,
    resolveT,
    barePathFromCoords,
    numToCoord,
    RenderLog,
    LogItems,
} from '../utils/resolveMods';
import {notNull} from '../utils/notNull';
import {closeEnough} from '../../../../rendering/epsilonToZero';
import {coordKey} from '../../../../rendering/coordKey';
import {outerBoundary} from '../../../outerBoundary';
import {pathsFromSegments} from '../../../pathsFromSegments';
import {collectAllPaths} from '../../../followPath';
import {boundsForCoords} from '../../../../editor/Bounds';
import {applyTilingTransformsG} from '../../../../editor/tilingPoints';
import {hslToRgb, rgbToHsl} from '../../../../rendering/colorConvert';

export const thinTiling = (t: Tiling): ThinTiling => ({segments: t.cache.segments, shape: t.shape});

const makeLineKey = (points: Coord[], open: boolean) => {
    const segs = coordPairs(points, open);
    let first: null | string = null;
    segs.forEach((seg) => {
        const k = coordPairKey(seg);
        if (first == null || k < first) {
            first = k;
        }
    });
    return first!;
};

export const renderPattern = (ctx: Ctx, _outer: CropsAndMatrices, pattern: Pattern) => {
    if (pattern.disabled) return;
    const tiling = pattern.tiling.tiling;
    if (!tiling) {
        throw new Error(`Pattern not found ${pattern.tiling}`);
    }
    const enabledPatternMods = resolveEnabledPMods(ctx.anim, pattern.mods);

    const panim = withShared(ctx.anim, pattern.shared, true);

    const simple = getSimplePatternData(tiling, pattern.psize);
    let baseShapes = simple.uniqueShapes;
    ctx.keyPoints.push(...baseShapes.flatMap((p) => coordPairs(p)));
    ctx.keyPoints.push(...simple.eigenCorners.flat());

    const modsBeforeAdjusts = false;
    if (modsBeforeAdjusts) {
        baseShapes = modsToShapes(
            ctx.cropCache,
            enabledPatternMods,
            baseShapes.map((shape, i) => ({shape, i})),
        ).map((s) => s.shape);
    }

    if (Object.keys(pattern.adjustments).length) {
        const adjusted = adjustShapes2(
            panim,
            ctx.cropCache,
            baseShapes,
            Object.values(pattern.adjustments)
                .filter((a) => !a.disabled)
                .map(({shapes, shared, mods, t}) => ({
                    t,
                    shapes: shapes.map((key) => ({path: ctx.shapes[key], id: key})).filter(Boolean),
                    mods,
                    shared,
                })),
            ctx.log != null,
        );
        baseShapes = adjusted.shapes;
        ctx.log?.push({type: 'group', title: 'Adjust Shapes', children: adjusted.debug});
        // renderDebug(adjusted, ctx);
    }

    if (pattern.contents.type === 'lines') {
        const allSegments = unique(
            baseShapes
                .map(joinAdjacentShapeSegments)
                .flatMap(shapeSegments)
                .map((pair) => sortCoordPair(pair)),
            coordPairKey,
        );

        const byEndPoint = edgesByEndpoint(allSegments);

        const uniquePoints = unique(allSegments.flat(), coordKey);
        const pointNames = Object.fromEntries(uniquePoints.map((p, i) => [coordKey(p), i]));

        const outer = outerBoundary(allSegments, byEndPoint, pointNames);
        const links = pathsFromSegments(allSegments, byEndPoint, outer);
        let allPaths = collectAllPaths(links, allSegments);
        if (!pattern.contents.includeBorders) {
            allPaths = allPaths.filter((p) => p.pathId != null);
        }

        const maxPathId = allPaths.reduce((a, b) => Math.max(a, b.pathId ?? 0), 0);
        // ok so for each line, we need to maybe evaluate the style dealio?

        const orderedStyles = Object.values(pattern.contents.styles).sort(
            (a, b) => a.order - b.order,
        );

        const colors = colorLines(allPaths, simple.bounds, simple.ttt, ctx.log);
        const maxColor = Math.max(...colors.filter(notNull));
        let pathsWithGroups = allPaths.map((path, i) => ({...path, groupId: colors[i]}));

        if (pattern.contents.sort) {
            const fn = a.value(panim, pattern.contents.sort);
            if (typeof fn !== 'function') {
                panim.warn(`"sort" should be a function.`);
            } else if (fn.length === 2) {
                let warned = false;
                pathsWithGroups.sort((a, b) => {
                    const res = fn(a, b);
                    if (typeof res !== 'number') {
                        if (warned) {
                            panim.warn('"sort" with two arguments should return an number');
                            warned = true;
                        }
                        return 0;
                    }
                    return res;
                });
            } else if (fn.length === 1) {
                pathsWithGroups = fn(pathsWithGroups);
                if (!Array.isArray(pathsWithGroups)) {
                    panim.warn('sort() with one argument should return an array');
                }
            }
        }

        // for alternating:
        // ignore anything without a pathId
        // then find paths that interesect with the eigenshape
        // do the ttt on them
        // make a map of coordPairKey -> number
        // for all other paths, step through their coord pairs until you find a hit

        ctx.items.push(
            ...pathsWithGroups.flatMap(({points, open, pathId, groupId}, i) => {
                const key = i + ''; // makeLineKey(points, !!open);
                const center = centroid(points);

                // const thisColor = colors[i];

                const matchingStyles = orderedStyles.map((style) => {
                    // const match = true;
                    const match = Array.isArray(style.kind)
                        ? first(style.kind, (k) =>
                              matchKind(k, key, groupId ?? -1, center, simple.eigenCorners),
                          )
                        : matchKind(style.kind, key, groupId ?? -1, center, simple.eigenCorners);
                    if (!match) {
                        return;
                    }
                    return {style, match};
                });
                return renderShape(
                    points,
                    ctx,
                    i,
                    panim,
                    {
                        maxPathId,
                        pathId,
                        center,
                        key,
                        points,
                        open,
                        i,
                        maxI: allPaths.length - 1,
                        groupId: groupId,
                        maxGroupId: maxColor,
                    },
                    matchingStyles.filter(notNull),
                    open,
                );
            }),
        );

        return;
    }
    // not doing yet
    if (pattern.contents.type !== 'shapes') return;

    const orderedStyles = Object.values(pattern.contents.styles).sort((a, b) => a.order - b.order);

    const needColors = orderedStyles.some((s) =>
        Array.isArray(s.kind)
            ? s.kind.some((k) => k.type === 'alternating')
            : s.kind.type === 'alternating',
    );
    const {colors} = needColors
        ? getShapeColors(baseShapes, simple.minSegLength, ctx.log)
        : {colors: []};

    const midShapes = !modsBeforeAdjusts
        ? modsToShapes(
              ctx.cropCache,
              enabledPatternMods,
              baseShapes.map((shape, i) => ({shape, i})),
          )
        : baseShapes.map((shape, i) => ({shape, i}));

    ctx.items.push(
        ...midShapes.flatMap(({shape, i}) => {
            const center = centroid(shape);
            const key = coordKey(center);
            const radius = Math.min(...shape.map((s) => dist(s, center)));
            const matchingStyles = orderedStyles.map((style) => {
                const match = Array.isArray(style.kind)
                    ? first(style.kind, (k) =>
                          matchKind(k, key, colors[i], center, simple.eigenCorners),
                      )
                    : matchKind(style.kind, key, colors[i], center, simple.eigenCorners);
                if (!match) {
                    return;
                }
                return {style, match};
            });
            return renderShape(
                shape,
                ctx,
                i,
                panim,
                {center, radius, shape, i},
                matchingStyles.filter(notNull),
            );
        }),
    );
};

const first = <T, N>(v: T[], f: (v: T) => N) => {
    for (let item of v) {
        const res = f(item);
        if (res != null && res !== false) {
            return res;
        }
    }
};

const renderShape = <Kind,>(
    shape: Coord[],
    ctx: Ctx,
    i: number,
    panim: AnimCtx,
    locals: any,
    orderedStyles: {style: ShapeStyle<Kind>; match: boolean | Coord}[],
    open = false,
) => {
    const fills: Record<string, ConcreteFill> = {};
    const lines: Record<string, ConcreteLine> = {};

    const anim: Ctx['anim'] = {
        ...panim,
        values: {
            ...panim.values,
            ...locals,
        },
    };

    orderedStyles.forEach(({style: s, match}) => {
        if (s.disabled) {
            return;
        }
        // biome-ignore lint: any is fine here
        const local: Record<string, any> = {};
        if (s.t) {
            const got = resolveT(s.t, anim.values.t);
            if (got == null) return; // out of range
            local.t = got;
        }

        // stuff.push(`style id: ${s.id}`);
        if (typeof match === 'object') {
            local.styleCenter = match;
        }
        const localAnim = {...anim, values: {...anim.values, ...local}};

        const smod = resolveEnabledPMods(localAnim, s.mods);

        // hmmm need to align the ... style that it came from ... with animvalues
        // like `styleCenter`
        Object.values(s.fills).forEach((fill) => {
            const cfill = dropNully(resolveFill(localAnim, fill));
            if (cfill.enabled === false) {
                // stuff.push(`disabled fill: ${fill.id}`);
                return;
            }
            cfill.mods.push(...smod);
            // stuff.push(`fill: ${fill.id}`);
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
            try {
                const cline = dropNully(resolveLine(localAnim, line));
                if (cline.enabled === false) return;
                cline.mods.push(...smod);
                if (!lines[line.id]) {
                    lines[line.id] = cline;
                    return;
                }
                const now = lines[line.id];
                cline.mods.unshift(...now.mods);
                Object.assign(now, cline);
            } catch (err) {
                localAnim.warn((err as Error).message);
            }
        });
    });

    const res: (RenderItem | undefined)[] = [
        ...Object.values(fills).flatMap((f, fi): RenderItem[] | RenderItem | undefined => {
            return renderFill(f, anim, ctx, shape, `fill-${i}-${fi}`);
        }),

        ...Object.values(lines).flatMap((f, fi): RenderItem[] | RenderItem | undefined => {
            return renderLine(f, anim, ctx, shape, `stroke-${i}-${fi}`, open);
        }),
    ];

    return res.filter(notNull);
};

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(min, v), max);
const clampRgb = (rgb: Rgb) => ({
    r: clamp(rgb.r, 0, 255),
    g: clamp(rgb.g, 0, 255),
    b: clamp(rgb.b, 0, 255),
});
const clampHsl = ({h, s, l}: Hsl): Hsl => ({h: h % 1, s: clamp(s, 0, 1), l: clamp(l, 0, 1)});

export const tintColor = (base: Rgb, tint: Color) => {
    if (Array.isArray(tint)) {
        const [r, g, b] = tint;
        return clampRgb({r: base.r + r, g: base.g + g, b: base.b + b});
    }
    if ('h' in tint) {
        const [h, s, l] = rgbToHsl(base.r, base.g, base.b);
        const res = clampHsl({
            h: h + tint.h,
            s: s + tint.s,
            l: l + tint.l,
        });
        const [r, g, b] = hslToRgb(res.h, res.s, res.l);
        return {r, g, b};
    }
    const {r, g, b} = tint;
    return clampRgb({r: base.r + r, g: base.g + g, b: base.b + b});
};

export const renderFill = (
    f: ConcreteFill,
    anim: AnimCtx,
    ctx: Ctx,
    shape: Coord[],
    key: string,
): undefined | RenderItem => {
    if (f.color == null) return;
    let rgb = colorToRgb(f.color);
    if (f.tint) {
        rgb = tintColor(rgb, f.tint);
    }
    const zIndex = f.zIndex;
    const opacity = f.opacity;
    const shadow = resolveShadow(anim, f.shadow);

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
};

export const renderLine = (
    f: ConcreteLine,
    anim: AnimCtx,
    ctx: Ctx,
    shape: Coord[],
    key: string,
    open: boolean,
): undefined | RenderItem => {
    if (f.color == null) return;
    if (!f.width) return;
    let rgb = colorToRgb(f.color);
    if (f.tint) {
        rgb = tintColor(rgb, f.tint);
    }
    const width = f.width / 100;
    const shadow = resolveShadow(anim, f.shadow);

    return {
        type: 'path',
        key,
        color: rgb,
        strokeWidth: width,
        shapes: f.mods.length
            ? modsToShapes(ctx.cropCache, f.mods, [{shape, i: 0}]).map((s) =>
                  barePathFromCoords(s.shape, open),
              )
            : [barePathFromCoords(shape, open)],
        shadow,
        sharp: f.sharp,
        opacity: f.opacity,
        zIndex: f.zIndex,
    };
};

export const resolveFill = (anim: Ctx['anim'], f: Fill): ConcreteFill => {
    return {
        id: f.id,
        mods: resolveEnabledPMods(anim, f.mods),
        color: f.color != null ? (a.color(anim, f.color) ?? undefined) : undefined,
        opacity: f.opacity != null ? a.number(anim, f.opacity) : undefined,
        rounded: f.rounded != null ? a.number(anim, f.rounded) : undefined,
        shadow: resolveShadow(anim, f.shadow),
        thickness: f.thickness != null ? a.number(anim, f.thickness) : undefined,
        tint: f.tint != null ? (a.color(anim, f.tint) ?? undefined) : undefined,
        zIndex: f.zIndex != null ? a.number(anim, f.zIndex) : undefined,
        enabled: f.enabled != null ? a.boolean(anim, f.enabled) : undefined,
    };
};

export const resolveLine = (anim: Ctx['anim'], f: Line): ConcreteLine => {
    return {
        id: f.id,
        mods: resolveEnabledPMods(anim, f.mods),
        color: f.color != null ? (a.color(anim, f.color) ?? undefined) : undefined,
        opacity: f.opacity != null ? a.number(anim, f.opacity) : undefined,
        shadow: resolveShadow(anim, f.shadow),
        thickness: f.thickness != null ? a.number(anim, f.thickness) : undefined,
        tint: f.tint != null ? (a.color(anim, f.tint) ?? undefined) : undefined,
        zIndex: f.zIndex != null ? a.number(anim, f.zIndex) : undefined,
        width: f.width != null ? a.number(anim, f.width) : undefined,
        sharp: f.sharp != null ? a.boolean(anim, f.sharp) : undefined,
        enabled: f.enabled != null ? a.boolean(anim, f.enabled) : undefined,
    };
};

export const dropNully = <T extends {}>(v: T): T => {
    (Object.keys(v) as (keyof T)[]).forEach((k) => {
        if (v[k] == null) {
            delete v[k];
        }
    });
    return v;
};
export const resolveShadow = (anim: Ctx['anim'], shadow?: Shadow): RenderShadow | undefined => {
    if (typeof shadow === 'string') {
        const v = a.value(anim, shadow);
        if (
            typeof v === 'object' &&
            v &&
            isCoord(v.offset) &&
            isCoord(v.blur) &&
            isColor(v.color)
        ) {
            return removeNullShadow({
                offset: scalePos(v.offset, 0.1),
                blur: scalePos(v.blur, 0.1),
                color: colorToRgb(v.color),
                inner: !!v.inner,
            });
        }
        return;
    }
    if (!shadow) return undefined;
    const scolor = shadow.color ? a.color(anim, shadow.color) : null;
    return removeNullShadow({
        blur: shadow.blur
            ? scalePos(numToCoord(a.coordOrNumber(anim, shadow.blur)), 0.1)
            : {x: 0, y: 0},
        offset: shadow.offset
            ? scalePos(numToCoord(a.coordOrNumber(anim, shadow.offset)), 0.1)
            : {x: 0, y: 0},
        color: scolor != null ? colorToRgb(scolor) : {r: 0, g: 0, b: 0},
        inner: shadow.inner ? a.boolean(anim, shadow.inner) : undefined,
    });
};
const removeNullShadow = (sh: RenderShadow) => {
    if (sh.offset.x === 0 && sh.offset.y === 0 && sh.blur.x === 0 && sh.blur.y === 0) {
        return;
    }
    return sh;
};

export const matchKind = (
    k: ShapeKind,
    id: string,
    color: number,
    center: Coord,
    eigenCorners: Coord[][],
): boolean | Coord => {
    switch (k.type) {
        case 'everything':
            return {x: 0, y: 0};
        case 'alternating':
            return color === k.index ? {x: 0, y: 0} : false;
        case 'explicit':
            return k.ids[id];
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

export const matchesDistances = (dist: number, distances: number[]) => {
    for (let i = 0; i < distances.length; i++) {
        if (dist < distances[i]) {
            return i % 2 === 1;
        }
    }
    return false;
};
function renderDebug(
    adjusted: {
        shapes: Coord[][];
        debug: {
            left: Coord[][];
            segs: [Coord, Coord][];
            byEndPoint: EndPointMap;
            fromSegments: {
                shapes: Coord[][];
                used: Record<string, true>;
                backwards: Coord[][];
                extras: Coord[][];
            };
        }[];
    },
    ctx: Ctx,
) {
    return adjusted.debug.forEach((item) => {
        item.segs.forEach((seg, i) => {
            ctx.items.push({
                type: 'path',
                color: colorToRgb(parseColor('#fff')!),
                key: 'debug ' + i,
                strokeWidth: 0.01,
                onClick() {
                    console.log(seg);
                },
                shapes: [
                    {
                        origin: seg[0],
                        segments: [{type: 'Line', to: seg[1]}],
                        open: true,
                    },
                ],
                zIndex: 10,
            });
        });
        item.fromSegments.extras.forEach((coords, i) => {
            ctx.items.push(
                {
                    type: 'path',
                    color: colorToRgb(parseColor('#0a0')!),
                    key: 'debugx ' + i,
                    // strokeWidth: 0.01,
                    shapes: [
                        {
                            origin: coords[0],
                            segments: coords.map((c) => ({type: 'Line', to: c})),
                            open: true,
                        },
                    ],
                    zIndex: 20,
                },
                {
                    type: 'path',
                    color: colorToRgb(parseColor('#060')!),
                    key: 'debugx ' + i,
                    strokeWidth: 0.01,
                    shapes: [
                        {
                            origin: coords[0],
                            segments: coords.map((c) => ({type: 'Line', to: c})),
                            open: true,
                        },
                    ],
                    zIndex: 30,
                },
            );
        });
    });
}

export const maybeAddItems = (log: RenderLog[] | undefined, title: string) => {
    const items: undefined | LogItems[] = log ? [] : undefined;
    log?.push({
        type: 'items',
        title,
        items: items!,
    });
    return items;
};

const colorLines = (
    lines: {points: Coord[]; pathId?: number}[],
    bounds: Coord[],
    ttt: Matrix[][][],
    debugLog?: RenderLog[],
) => {
    const byPair: Record<string, number> = {};
    const prec = 4;

    if (debugLog) {
        debugLog?.push({
            type: 'items',
            title: 'Lines',
            items: lines.map((line) => ({
                item: {type: 'shape', shape: barePathFromCoords(line.points, true)},
            })),
        });
    }

    // Find the lines that fall within the bounds
    const boundingBox = boundsForCoords(...bounds);
    const baseLines = lines.filter((line) => line.points.some((p) => aabbContains(boundingBox, p)));

    if (debugLog) {
        debugLog?.push({
            type: 'items',
            title: 'Base Lines',
            items: baseLines.map((line) => ({
                item: {type: 'shape', shape: barePathFromCoords(line.points, true)},
            })),
        });
    }

    const baseLog = maybeAddItems(debugLog, 'Base Lines Transformed');
    const dups: Record<number, number> = {};
    baseLines.forEach((line, i) => {
        const transformedLines = applyTilingTransformsG([line.points], ttt, (pts, tx) =>
            pts.map((p) => applyMatrices(p, tx)),
        );

        const keys = transformedLines.map((points) =>
            coordPairs(points, true).map((p) => coordPairKey(p, prec)),
        );
        for (let sub of keys) {
            for (let key of sub) {
                if (byPair[key] != null) {
                    dups[i] = byPair[key];
                    return;
                }
            }
        }

        baseLog?.push({
            item: transformedLines.map((points) => ({
                type: 'shape',
                shape: barePathFromCoords(points, true),
                hidePoints: true,
                noFill: true,
            })),
            text: `base line ${i}`,
        });

        keys.forEach((keys) => keys.forEach((key) => (byPair[key] = i)));
    });
    const remap: Record<number, number> = {};
    let at = 0;
    baseLines.forEach((_, i) => {
        if (dups[i] != null) {
            // remap[i] = remap[dups[i]];
        } else {
            remap[i] = at++;
        }
    });

    const matches = maybeAddItems(debugLog, 'Base Items');

    return lines
        .map((line, i) => {
            if (baseLines.includes(line)) {
                const at = baseLines.indexOf(line);
                return dups[at] ?? at;
            }

            for (let pair of coordPairs(line.points, true)) {
                const k = coordPairKey(pair, prec);
                if (byPair[k] != null) {
                    return byPair[k];
                }
            }
            return null;
        })
        .map((n) => (n != null ? remap[n] : n));
};
