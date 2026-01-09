import {scalePos} from '../../../../editor/scalePos';
import {dist} from '../../../../rendering/getMirrorTransforms';
import {Coord, ThinTiling, Tiling} from '../../../../types';
import {centroid} from '../../../findReflectionAxes';
import {getSimplePatternData, getShapeColors, shapeSegments} from '../../../getPatternData';
import {
    cmpCoords,
    edgesByEndpoint,
    EndPointMap,
    joinAdjacentShapeSegments,
    unique,
} from '../../../shapesFromSegments';
import {adjustShapes, adjustShapes2, coordPairs} from '../utils/adjustShapes';
import {parseColor} from '../utils/colors';
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
} from '../export-types';
import {
    CropsAndMatrices,
    resolveEnabledPMods,
    withShared,
    modsToShapes,
    resolveT,
    barePathFromCoords,
    numToCoord,
} from '../utils/resolveMods';
import {notNull} from '../utils/notNull';
import {closeEnough} from '../../../../rendering/epsilonToZero';
import {coordKey} from '../../../../rendering/coordKey';
import {outerBoundary} from '../../../outerBoundary';
import {pathsFromSegments} from '../../../pathsFromSegments';
import {collectAllPaths} from '../../../followPath';

export const thinTiling = (t: Tiling): ThinTiling => ({segments: t.cache.segments, shape: t.shape});

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
    ctx.keyPoints.push(...baseShapes.flatMap(coordPairs));
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
                .map(([a, b]): [Coord, Coord] =>
                    (closeEnough(a.x, b.x) ? a.y > b.y : a.x > b.x) ? [b, a] : [a, b],
                ),
            ([a, b]) => `${coordKey(a)}:${coordKey(b)}`,
        );

        const byEndPoint = edgesByEndpoint(allSegments);

        const uniquePoints = unique(allSegments.flat(), coordKey);
        const pointNames = Object.fromEntries(uniquePoints.map((p, i) => [coordKey(p), i]));

        const outer = outerBoundary(allSegments, byEndPoint, pointNames);
        const links = pathsFromSegments(allSegments, byEndPoint, outer);
        const allPaths = collectAllPaths(links, allSegments);

        const maxPathId = allPaths.reduce((a, b) => Math.max(a, b.pathId ?? 0), 0);
        // ok so for each line, we need to maybe evaluate the style dealio?

        const orderedStyles = Object.values(pattern.contents.styles).sort(
            (a, b) => a.order - b.order,
        );
        // orderedStyles.push({
        //     id: 'lol',
        //     fills: {},
        //     kind: {type: 'everything'},
        //     mods: [],
        //     order: 0,
        //     lines: {
        //         lol: {
        //             id: 'lol',
        //             mods: [],
        //             // color: '({r: ((pathId ?? 0) / maxPathId) * 360, g: 0, b: 0})',
        //             // zIndex: 'pathId ?? 0',
        //             color: '({r: ((pathId ?? 0) * 10) % 360, g: 0, b: 0})',
        //             zIndex: '((pathId ?? 0) * 10) % 360',
        //             width: 1,
        //         },
        //     },
        // });

        ctx.items.push(
            ...allPaths
                // .sort((a, b) => (a.pathId ?? 0) - (b.pathId ?? 0))
                // .sort((a, b) => (((a.pathId ?? 0) * 10) % 360) - (((b.pathId ?? 0) * 10) % 360))
                .flatMap(({points, open, pathId}, i) => {
                    // return {
                    //     type: 'path',
                    //     // color: {r: ((pathId ?? 0) / maxPathId) * 360, g: 0, b: 0},
                    //     // zIndex: pathId ?? 0,
                    //     color: {r: ((pathId ?? 0) * 10) % 360, g: 0, b: 0},
                    //     zIndex: ((pathId ?? 0) * 10) % 360,
                    //     key: `${i}`,
                    //     shapes: [barePathFromCoords(points, open)],
                    //     strokeWidth: 0.01,
                    // };

                    const matchingStyles = orderedStyles.map((style) => {
                        const match = true;
                        // const match = Array.isArray(style.kind)
                        //     ? first(style.kind, (k) =>
                        //           matchKind(k, i, colors[i], center, simple.eigenCorners),
                        //       )
                        //     : matchKind(style.kind, i, colors[i], center, simple.eigenCorners);
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
                            center: centroid(points),
                            points,
                            open,
                            i,
                            groupId: 0, // grouping paths by eigenshape-expansion
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
            const radius = Math.min(...shape.map((s) => dist(s, center)));
            const matchingStyles = orderedStyles.map((style) => {
                const match = Array.isArray(style.kind)
                    ? first(style.kind, (k) =>
                          matchKind(k, i, colors[i], center, simple.eigenCorners),
                      )
                    : matchKind(style.kind, i, colors[i], center, simple.eigenCorners);
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

export const renderFill = (
    f: ConcreteFill,
    anim: AnimCtx,
    ctx: Ctx,
    shape: Coord[],
    key: string,
): undefined | RenderItem => {
    if (f.color == null) return;
    const color = a.color(anim, f.color);
    if (!color) console.log('waht', color, f.color);
    const rgb = colorToRgb(color);
    const zIndex = f.zIndex;
    const opacity = f.opacity ? a.number(anim, f.opacity) : undefined;
    const shadow = resolveShadow(anim, f.shadow);
    // ctx.byKey[key] = stuff;

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
    const color = a.color(anim, f.color);
    if (!color) console.log('waht', color, f.color);
    const rgb = colorToRgb(color);
    const width = a.number(anim, f.width) / 100;
    const opacity = f.opacity ? a.number(anim, f.opacity) : undefined;
    const shadow = resolveShadow(anim, f.shadow);
    const zIndex = f.zIndex;
    // const key = `stroke-${i}-${fi}`;
    // ctx.byKey[key] = stuff;

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
        opacity,
        zIndex,
    };
};

export const resolveFill = (anim: Ctx['anim'], f: Fill): ConcreteFill => {
    return {
        id: f.id,
        mods: resolveEnabledPMods(anim, f.mods),
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

export const resolveLine = (anim: Ctx['anim'], f: Line): ConcreteLine => {
    return {
        id: f.id,
        mods: resolveEnabledPMods(anim, f.mods),
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
    return removeNullShadow({
        blur: shadow.blur
            ? scalePos(numToCoord(a.coordOrNumber(anim, shadow.blur)), 0.1)
            : {x: 0, y: 0},
        offset: shadow.offset
            ? scalePos(numToCoord(a.coordOrNumber(anim, shadow.offset)), 0.1)
            : {x: 0, y: 0},
        color: shadow.color ? colorToRgb(a.color(anim, shadow.color)) : {r: 0, g: 0, b: 0},
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
    i: number,
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
