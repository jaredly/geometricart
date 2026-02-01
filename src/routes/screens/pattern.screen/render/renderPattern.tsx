import {scalePos} from '../../../../editor/scalePos';
import {hslToRgb, rgbToHsl} from '../../../../rendering/colorConvert';
import {coordKey} from '../../../../rendering/coordKey';
import {dist} from '../../../../rendering/getMirrorTransforms';
import {Coord, ThinTiling, Tiling} from '../../../../types';
import {centroid} from '../../../findReflectionAxes';
import {getShapeColors, getSimplePatternData, shapeSegments} from '../../../getPatternData';
import {outerBoundary} from '../../../outerBoundary';
import {pathsFromSegments} from '../../../pathsFromSegments';
import {
    edgesByEndpoint,
    EndPointMap,
    joinAdjacentShapeSegments,
    unique,
} from '../../../shapesFromSegments';
import {weaveIntersections, weaveIntersections2} from '../../../weaveIntersections';
import {a, AnimCtx, Ctx, isColor, isCoord, RenderItem, RenderShadow} from '../eval/evaluate';
import {
    Color,
    colorToRgb,
    ConcreteFill,
    ConcreteLine,
    Fill,
    Hsl,
    Line,
    Pattern,
    Shadow,
    ShapeKind,
} from '../export-types';
import {adjustShapes2, coordPairKey, coordPairs, sortCoordPair} from '../utils/adjustShapes';
import {parseColor, Rgb} from '../utils/colors';
import {notNull} from '../utils/notNull';
import {
    barePathFromCoords,
    CropsAndMatrices,
    LogItems,
    modsToShapes,
    numToCoord,
    RenderLog,
    resolveEnabledPMods,
    withLocals,
    withShared,
} from '../utils/resolveMods';
import {renderPatternLines} from './renderPatternLines';
import {renderPatternShape} from './renderPatternShape';

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
    ctx.keyPoints.push(...baseShapes.flatMap((p) => coordPairs(p)));
    ctx.keyPoints.push(...simple.eigenCorners.flat());

    const modsBeforeAdjusts = false;
    if (modsBeforeAdjusts) {
        baseShapes = modsToShapes(
            ctx.cropCache,
            enabledPatternMods,
            baseShapes.map((shape, i) => ({shape: {points: shape, open: false}, i})),
        ).map((s) => s.shape.points);
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
    }

    if (pattern.contents.type === 'lines') {
        return renderPatternLines(baseShapes, pattern, simple, ctx, panim);
    }

    if (pattern.contents.type === 'weave') {
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
        const paths = pathsFromSegments(allSegments, byEndPoint, outer);
        const newStyle = true;

        const backs = Object.values(pattern.contents.styles).flatMap((m) =>
            m.disabled || Array.isArray(m.kind) ? [] : m.kind.under ? Object.values(m.lines) : [],
        );
        const fronts = Object.values(pattern.contents.styles).flatMap((m) =>
            m.disabled || Array.isArray(m.kind) ? [] : !m.kind.under ? Object.values(m.lines) : [],
        );

        if (newStyle) {
            const woven = weaveIntersections2(allSegments, paths);
            if (!woven) return;
            const maxPathId = woven.reduce((m, p) => Math.max(m, p.pathId ?? 0), 0);
            const minPathId = woven.reduce((m, p) => Math.min(m, p.pathId ?? 0), 0);

            const pwanim = withShared(
                withLocals(panim, {maxPathId}),
                pattern.contents.shared,
                true,
            );

            const animNone = withLocals(pwanim, {pathId: undefined});
            const stylesForPathId: Record<string, ConcreteLine[]> = {};
            stylesForPathId.null = fronts.map((style, k) => {
                return resolveLine(animNone, style);
            });

            for (let i = minPathId; i <= maxPathId; i++) {
                const anim: Ctx['anim'] = withLocals(pwanim, {pathId: i});
                stylesForPathId[i] = fronts.map((style, k) => resolveLine(anim, style));
            }
            const maxLineWidthForPathId = Object.fromEntries(
                Object.entries(stylesForPathId).map(([key, lines]) => [
                    key,
                    lines.reduce(
                        (max, line) =>
                            line.color == null ||
                            !line.width ||
                            (line.enabled != null && !line.enabled)
                                ? max
                                : Math.max(max, line.width),
                        0,
                    ),
                ]),
            );

            woven.forEach(({line: points, pathId, masks}, i) => {
                if (!stylesForPathId[pathId ?? 'null']) {
                    throw new Error(`not prepared for ${pathId}`);
                }
                stylesForPathId[pathId ?? 'null'].forEach((line, k) => {
                    if (
                        line.color == null ||
                        !line.width ||
                        (line.enabled != null && !line.enabled)
                    )
                        return;

                    ctx.items.push(
                        {
                            key: `elm-${i}--${k}`,
                            type: 'path',
                            shapes: [barePathFromCoords(points, true)],
                            masks: masks.map(({line, pathId}) => ({
                                shape: barePathFromCoords(line, true),
                                strokeWidth: maxLineWidthForPathId[pathId ?? 'null'] * 0.01,
                            })),
                            opacity: line.opacity,
                            // opacity: i % 10 === 0 ? 1 : 0.1,
                            zIndex: line.zIndex,
                            color: colorToRgb(line.color!),
                            strokeWidth: line.width! * 0.01,
                        },
                        // {
                        //     type: 'point',
                        //     coord: points[1],
                        //     key: `pt-${i}-${k}`,
                        //     zIndex: 100,
                        //     color: {r: 0, g: 0, b: 1},
                        //     size: 1,
                        // },
                    );
                });
            });
        } else {
            const woven = weaveIntersections(allSegments, paths);
            if (!woven) return;
            const maxPathId = woven.reduce((m, p) => Math.max(m, p.pathId ?? 0), 0);

            const pwanim = withShared(
                withLocals(panim, {maxPathId}),
                pattern.contents.shared,
                true,
            );

            woven.forEach(({points, pathId, isBack, order}, i) => {
                const anim: Ctx['anim'] = withLocals(pwanim, {pathId});

                const styles = isBack ? backs : fronts;
                styles.forEach((style, k) => {
                    const line = resolveLine(anim, style);
                    if (
                        line.color == null ||
                        !line.width ||
                        (line.enabled != null && !line.enabled)
                    )
                        return;

                    points.forEach((path, j) => {
                        ctx.items.push({
                            key: `elm-${i}-${j}-${k}`,
                            type: 'path',
                            shapes: [
                                {
                                    origin: path[0],
                                    segments: path.slice(1).map((p) => ({
                                        type: 'Line',
                                        to: p,
                                    })),
                                    open: true,
                                },
                            ],
                            opacity: line.opacity,
                            zIndex: line.zIndex,
                            color: colorToRgb(line.color!),
                            strokeWidth: line.width! * 0.01,
                        });
                    });
                });
            });
        }

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
              baseShapes.map((shape, i) => ({shape: {points: shape, open: false}, i})),
          )
        : baseShapes.map((shape, i) => ({shape: {points: shape, open: false}, i}));

    ctx.items.push(
        ...midShapes.flatMap(({shape, i}) => {
            const center = centroid(shape.points);
            const key = coordKey(center);
            const radius = Math.min(...shape.points.map((s) => dist(s, center)));
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
            return renderPatternShape(
                shape.points,
                ctx,
                i,
                panim,
                {center, radius, shape, i},
                matchingStyles.filter(notNull),
            );
        }),
    );
};

export const first = <T, N>(v: T[], f: (v: T) => N) => {
    for (let item of v) {
        const res = f(item);
        if (res != null && res !== false) {
            return res;
        }
    }
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
            ? modsToShapes(ctx.cropCache, f.mods, [
                  {shape: {points: shape, open: false}, i: 0},
              ]).map((s) => barePathFromCoords(s.shape.points, s.shape.open))
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
            ? modsToShapes(ctx.cropCache, f.mods, [{shape: {points: shape, open}, i: 0}]).map((s) =>
                  barePathFromCoords(s.shape.points, s.shape.open),
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
