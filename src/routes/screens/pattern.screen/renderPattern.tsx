import {scalePos} from '../../../editor/scalePos';
import {dist} from '../../../rendering/getMirrorTransforms';
import {Coord} from '../../../types';
import {centroid} from '../../findReflectionAxes';
import {getSimplePatternData, getShapeColors} from '../../getPatternData';
import {EndPointMap} from '../../shapesFromSegments';
import {adjustShapes} from './adjustShapes';
import {parseColor} from './colors';
import {Ctx, RenderItem, a, isColor, isCoord} from './evaluate';
import {
    Pattern,
    colorToRgb,
    ConcreteFill,
    ConcreteLine,
    Fill,
    Line,
    Shadow,
    ShapeKind,
} from './export-types';
import {
    CropsAndMatrices,
    resolvePMod,
    withShared,
    modsToShapes,
    resolveT,
    barePathFromCoords,
    notNull,
    numToCoord,
} from './resolveMods';

export const renderPattern = (ctx: Ctx, outer: CropsAndMatrices, pattern: Pattern) => {
    // not doing yet
    if (pattern.contents.type !== 'shapes') return;
    const tiling = ctx.patterns[pattern.tiling];
    if (!tiling) {
        throw new Error(`Pattern not found ${pattern.tiling}`);
    }
    const patternmods = pattern.mods.map((m) => resolvePMod(ctx.anim, m));

    const panim = withShared(ctx.anim, pattern.shared);

    const simple = getSimplePatternData(tiling, pattern.psize);
    let baseShapes = simple.uniqueShapes;
    ctx.keyPoints.push(...baseShapes.flat());
    if (Object.keys(pattern.adjustments).length) {
        const adjusted = adjustShapes(
            panim,
            ctx.cropCache,
            baseShapes,
            Object.values(pattern.adjustments)
                .filter((a) => !a.disabled)
                .map(({shapes, shared, mods, t}) => ({
                    t,
                    shapes: shapes.map((key) => ctx.state.shapes[key]).filter(Boolean),
                    mods,
                    shared,
                })),
        );
        baseShapes = adjusted.shapes;
        ctx.log?.push({type: 'group', title: 'Adjust Shapes', children: adjusted.debug});
        // renderDebug(adjusted, ctx);
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
                ...panim,
                values: {
                    ...panim.values,
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
export const resolveFill = (anim: Ctx['anim'], f: Fill): ConcreteFill => {
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

export const resolveLine = (anim: Ctx['anim'], f: Line): ConcreteLine => {
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

export const dropNully = <T extends {}>(v: T): T => {
    (Object.keys(v) as (keyof T)[]).forEach((k) => {
        if (v[k] == null) {
            delete v[k];
        }
    });
    return v;
};
export const resolveShadow = (anim: Ctx['anim'], shadow?: Shadow): RenderItem['shadow'] => {
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
export const matchKind = (
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
