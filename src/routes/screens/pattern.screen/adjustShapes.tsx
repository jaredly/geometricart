import {Bounds, boundsForCoords} from '../../../editor/Bounds';
import {coordKey} from '../../../rendering/coordKey';
import {closeEnough, withinLimit} from '../../../rendering/epsilonToZero';
import {lineLine, lineToSlope, SlopeIntercept, slopeKey} from '../../../rendering/intersect';
import {Coord, BarePath} from '../../../types';
import {centroid} from '../../findReflectionAxes';
import {coordsFromBarePath, coordToPolar, sortShapesByPolar} from '../../getPatternData';
import {
    unique,
    cutSegments,
    edgesByEndpoint,
    shapesFromSegments,
    EndPointMap,
} from '../../shapesFromSegments';
import {Ctx} from './evaluate';
import {PMods, TChunk, AnimatableValue} from './export-types';
import {
    resolveT,
    withShared,
    resolveEnabledPMods,
    modsToShapes,
    RenderLog,
    barePathFromCoords,
    notNull,
} from './resolveMods';

export const truncateValue = (v: number, amt: number) => Math.round(v * amt) / amt;
export const truncateSame = (a: number, b: number, amt: number) =>
    Math.round(a * amt) === Math.round(b * amt);

export const truncatePair = (v: [Coord, Coord], amt: number): [Coord, Coord] => [
    truncateCoord(v[0], amt),
    truncateCoord(v[1], amt),
];

export const truncateCoordKey = (v: Coord, amt: number): string =>
    `${Math.round(v.x * amt)},${Math.round(v.y * amt)}`;
export const truncateCoord = (v: Coord, amt: number): Coord => ({
    x: truncateValue(v.x, amt),
    y: truncateValue(v.y, amt),
});
export const coordsTruncateSame = (a: Coord, b: Coord, amt: number) =>
    truncateSame(a.x, b.x, amt) && truncateSame(a.y, b.y, amt);

export const truncateShape = (v: Coord[], amt: number): Coord[] =>
    v.map((c) => truncateCoord(c, amt));

export const adjustShapes2 = (
    anim: Ctx['anim'],
    cropCache: Ctx['cropCache'],
    uniqueShapes: Coord[][],
    adjustments: {
        shapes: {path: BarePath; id: string}[];
        mods: PMods[];
        t?: TChunk;
        shared?: Record<string, AnimatableValue>;
    }[],
    log = false,
) => {
    const amt = 1000;
    const prec = Math.log10(amt) - 1;
    const eps = Math.pow(10, -prec);
    const outerDebug: RenderLog[] | undefined = log ? [] : undefined;

    // let segments = unique(
    //     uniqueShapes.map((shape) => truncateShape(shape, amt)).flatMap(coordPairs),
    //     (p) => coordTruncatePairKey(p, amt),
    // );

    let segments = unique(uniqueShapes.flatMap(coordPairs), (p) => coordTruncatePairKey(p, amt));

    outerDebug?.push({
        type: 'items',
        title: 'Unique Truncated Segments',
        items: segments.map((seg) => ({
            item: {type: 'seg', prev: seg[0], seg: {type: 'Line', to: seg[1]}},
        })),
    });

    const shapesToAdjust = adjustments
        .flatMap(({shapes, mods, t, shared}) => {
            // biome-ignore lint: any is fine here
            const local: Record<string, any> = {};
            if (t) {
                const res = resolveT(t, anim.values.t);
                if (res == null) return;
                local.t = res;
            }
            const aanim = withShared(anim, shared);

            return shapes.map(({path: shape, id}) => {
                if (!shape) return;

                const shapeCoords = truncateShape(coordsFromBarePath(shape), amt);
                const resolved = resolveEnabledPMods(
                    {...aanim, values: {...aanim.values, ...local, center: centroid(shapeCoords)}},
                    mods,
                );
                const shapeLines = coordLines(shapeCoords);
                const moved = modsToShapes(cropCache, resolved, [{shape: shapeCoords, i: 0}]).map(
                    (a) => ({...a, shape: truncateShape(a.shape, amt)}),
                );
                const movedLines = moved.map((m) => coordLines(m.shape));

                if (allSameLines(shapeLines, movedLines.flat())) {
                    return;
                }

                return {shapeLines, shapeCoords, moved, id};
            });
        })
        .filter(notNull);
    if (!shapesToAdjust.length) return {shapes: uniqueShapes, debug: outerDebug ?? []};

    const allShapeLines = shapesToAdjust.flatMap((shape) => shape.shapeLines);

    outerDebug?.push({
        type: 'items',
        title: 'Shape Lines to Remove',
        items: shapesToAdjust
            .flatMap((shape) => coordPairs(shape.shapeCoords))
            .map((seg) => ({
                item: {type: 'seg', prev: seg[0], seg: {type: 'Line', to: seg[1]}},
            })),
    });

    segments = segments.filter((pair) => !coordPairOnShape(pair, allShapeLines, eps));

    outerDebug?.push({
        type: 'items',
        title: 'With Lines removed',
        items: segments.map((seg) => ({
            item: {type: 'seg', prev: seg[0], seg: {type: 'Line', to: seg[1]}},
        })),
    });

    const allMovedPairs = shapesToAdjust.flatMap((shape) =>
        shape.moved.flatMap((m) => coordPairs(m.shape)),
    );
    segments.push(...allMovedPairs);

    segments = unique(
        segments.map((seg) => truncatePair(seg, amt)),
        (seg) => coordTruncatePairKey(seg, amt),
    );

    segments = cutSegments(
        segments, //.map((seg) => truncatePair(seg, amt)),
        amt,
        prec,
        outerDebug,
    ).map((seg) => truncatePair(seg, amt));

    outerDebug?.push({
        type: 'items',
        title: 'Post Cut Segments',
        items: segments.map((seg) => ({
            item: {type: 'seg', prev: seg[0], seg: {type: 'Line', to: seg[1]}},
        })),
    });

    const byEndPoint = edgesByEndpoint(segments, prec);
    const one = unique(segments.flat(), (m) => coordKey(m, prec));

    if (outerDebug) logByEndPoint(outerDebug, byEndPoint);

    // outerDebug?.push({
    //     type: 'items',
    //     title: 'By Endpoint'
    // })

    const fromSegments = shapesFromSegments(byEndPoint, one, prec);

    outerDebug?.push({
        type: 'items',
        title: 'Shapes detected',
        items: fromSegments.shapes.map((shape) => ({
            item: {type: 'shape', shape: barePathFromCoords(shape)},
        })),
    });

    return {shapes: sortShapesByPolar(fromSegments.shapes), debug: outerDebug ?? []};
};

export const adjustShapes = (
    anim: Ctx['anim'],
    cropCache: Ctx['cropCache'],
    uniqueShapes: Coord[][],
    adjustments: {
        shapes: {path: BarePath; id: string}[];
        mods: PMods[];
        t?: TChunk;
        shared?: Record<string, AnimatableValue>;
    }[],
    log = false,
) => {
    const amt = 1000;
    uniqueShapes = uniqueShapes.map((shape) => truncateShape(shape, amt));

    // console.time();

    let modified = false;
    const outerDebug: RenderLog[] = [];
    for (let {shapes, mods, t, shared} of adjustments) {
        // biome-ignore lint: any is fine here
        const local: Record<string, any> = {};
        if (t) {
            const res = resolveT(t, anim.values.t);
            if (res == null) continue;
            local.t = res;
        }
        const aanim = withShared(anim, shared);
        const midDebug: RenderLog[] = [];

        for (let {path: shape, id} of shapes) {
            if (!shape) continue;
            const debug: RenderLog[] = [];
            const shapeCoords = truncateShape(coordsFromBarePath(shape), amt);
            const center = centroid(shapeCoords);
            const resolved = resolveEnabledPMods(
                {...aanim, values: {...aanim.values, ...local, center}},
                mods,
            );
            const shapeLines = coordLines(shapeCoords);
            const moved = modsToShapes(cropCache, resolved, [{shape: shapeCoords, i: 0}]).map(
                (a) => ({...a, shape: truncateShape(a.shape, amt)}),
            );
            const movedLines = moved.map((m) => coordLines(m.shape));
            if (allSameLines(shapeLines, movedLines.flat())) {
                continue;
            }

            if (log) {
                debug.push({
                    title: 'Adjust Shape: ' + id,
                    type: 'items',
                    items: [
                        {item: {type: 'shape', shape}, text: 'pre-move'},
                        ...moved.map((coords, i) => ({
                            item: {type: 'shape' as const, shape: barePathFromCoords(coords.shape)},
                            text: 'post-' + i,
                        })),
                    ],
                });
            }

            const prec = 3;
            const eps = Math.pow(10, -prec);

            // console.log('here we are', shapeLines, movedLines);
            const [left, right] = unzip(uniqueShapes, (coords) => {
                const got =
                    coordsIntersectCoords(coords, shapeLines, eps) ||
                    movedLines.some((moved) => coordsIntersectCoords(coords, moved, eps));
                // console.log('did intersect', got);
                return got;
            });

            if (log) {
                debug.push({
                    title: 'Separate',
                    type: 'group',
                    children: [
                        {
                            title: 'Touching',
                            type: 'items',
                            items: right.map((coords) => ({
                                item: {type: 'shape', shape: barePathFromCoords(coords)},
                            })),
                        },
                        {
                            title: 'Not Touching',
                            type: 'items',
                            items: left.map((coords) => ({
                                item: {type: 'shape', shape: barePathFromCoords(coords)},
                            })),
                        },
                    ],
                });
            }

            let [removedSegs, segs] = unzip(
                unique(right.flatMap(coordPairs), coordPairKey),
                (pair) => !coordPairOnShape(pair, shapeLines, eps),
            );

            if (log) {
                debug.push({
                    title: 'Removed Segments',
                    type: 'items',
                    items: removedSegs.map((pair) => ({
                        item: {type: 'seg', prev: pair[0], seg: {type: 'Line', to: pair[1]}},
                    })),
                });
                debug.push({
                    title: 'Added Segments',
                    type: 'items',
                    items: moved.flatMap((shape) =>
                        coordPairs(shape.shape).flatMap((pair) => ({
                            item: {type: 'seg', prev: pair[0], seg: {type: 'Line', to: pair[1]}},
                        })),
                    ),
                });
            }

            segs.push(...moved.flatMap((m) => coordPairs(m.shape)));

            if (log) {
                debug.push({
                    title: 'Pre Cut',
                    type: 'items',
                    items: segs.map((pair) => ({
                        item: {type: 'seg', prev: pair[0], seg: {type: 'Line', to: pair[1]}},
                    })),
                });
            }

            // const prec = 5;

            segs = cutSegments(segs, amt, prec);
            const norms = normPoints(segs.flat(), prec);
            segs = normSegs(segs, norms, prec);
            // segs = segs.map(([a, b]) => [truncateCoord(a, amt), truncateCoord(b, amt)] as const);

            segs = unique(segs, (p) => coordPairKey(p, prec));

            if (log) {
                debug.push({
                    title: 'Post Cut',
                    type: 'items',
                    items: segs.map((pair) => ({
                        item: {type: 'seg', prev: pair[0], seg: {type: 'Line', to: pair[1]}},
                    })),
                });
                debug.push({
                    title: 'Post Cut Coords',
                    type: 'items',
                    items: segs.flat().map((coord) => ({
                        item: {type: 'point', p: coord},
                    })),
                });
            }

            const byEndPoint = edgesByEndpoint(segs, prec);
            // TODO: so I want to find eigenpoints, only ones that are ... along the moved path maybe?
            // or like the original or moved path idk.
            const one = unique(segs.flat(), (m) => coordKey(m, prec));
            // const two = unique(
            //     moved.flatMap((m) => m.shape),
            //     coordKey,
            // );
            if (log) {
                debug.push({
                    title: 'All Points',
                    type: 'items',
                    items: one.map((p) => ({item: {type: 'point', p}})),
                });

                logByEndPoint(debug, byEndPoint);
            }
            const cmoved = centroid(moved.flatMap((m) => m.shape));
            const fromSegments = shapesFromSegments(byEndPoint, one, prec, debug);
            const [centerShapes, reconstructed] = unzip(
                fromSegments.shapes,
                (c) => !matchesBounds(boundsForCoords(...c), cmoved),
            );
            // uniqueShapes = reconstructed;
            modified = true;
            uniqueShapes = [...left, ...reconstructed];

            if (log) {
                debug.push({
                    title: 'Reconstructed',
                    type: 'items',
                    items: reconstructed.map((shape) => ({
                        item: {type: 'shape', shape: barePathFromCoords(shape)},
                    })),
                });

                debug.push({
                    title: 'Reconstructed removed',
                    type: 'items',
                    items: centerShapes.map((shape) => ({
                        item: {type: 'shape', shape: barePathFromCoords(shape)},
                    })),
                });
                midDebug.push({type: 'group', title: 'One Shape', children: debug});
            }
        }
        outerDebug.push({type: 'group', title: 'Adjust Shape Group', children: midDebug});
    }

    // console.timeEnd();

    return {shapes: modified ? sortShapesByPolar(uniqueShapes) : uniqueShapes, debug: outerDebug};
};

export const sortCoordPair = (pair: [Coord, Coord], eps?: number): [Coord, Coord] => {
    if (closeEnough(pair[0].x, pair[1].x, eps) ? pair[1].y < pair[0].y : pair[1].x < pair[0].x) {
        return [pair[1], pair[0]];
    }
    return pair;
};

export const coordTruncatePairKey = (pair: [Coord, Coord], amt: number) => {
    const [left, right] = sortCoordPair(pair, 1 / amt);
    return `${truncateCoordKey(left, amt)}:${truncateCoordKey(right, amt)}`;
};

export const coordPairKey = (pair: [Coord, Coord], prec = 3) => {
    const [left, right] = sortCoordPair(pair, Math.pow(10, -prec));
    return `${coordKey(left, prec)}:${coordKey(right, prec)}`;
};

export const coordLines = (coords: Coord[]) =>
    coordPairs(coords).map((pair) => lineToSlope(pair[0], pair[1], true));

export const coordPairOnShape = (pair: [Coord, Coord], shape: SlopeIntercept[], eps: number) => {
    const line = lineToSlope(pair[0], pair[1], true);
    return shape.some((sline) => overlapping(line, sline, eps));
};

export const allSameLines = (one: SlopeIntercept[], two: SlopeIntercept[]) => {
    if (one.length !== two.length) return false;
    const kone = one.map(slopeKey);
    return two.every((line) => kone.includes(slopeKey(line)));
};

export const matchesBounds = (bounds: Bounds, coord: Coord) =>
    coord.x <= bounds.x1 && coord.x >= bounds.x0 && coord.y <= bounds.y1 && coord.y >= bounds.y0;

/**
 * Separate a list into two groups. [left, right] for [false, true] result of `test`
 */
export const unzip = <T,>(v: T[], test: (t: T) => boolean) => {
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

export const coordPairs = (coords: Coord[]) => {
    const res: [Coord, Coord][] = [];
    coords.forEach((coord, i) => {
        res.push([coords[i === 0 ? coords.length - 1 : i - 1], coord]);
    });
    return res;
};

export const overlapping = (one: SlopeIntercept, two: SlopeIntercept, eps: number) =>
    closeEnough(one.m, two.m, eps) &&
    closeEnough(one.b, two.b, eps) &&
    (withinLimit(one.limit!, two.limit![0], eps) ||
        withinLimit(one.limit!, two.limit![1], eps) ||
        withinLimit(two.limit!, one.limit![0], eps) ||
        withinLimit(two.limit!, one.limit![1], eps));

export const coordsIntersectCoords = (one: Coord[], twos: SlopeIntercept[], eps: number) => {
    return coordLines(one).some((one) => twos.some((two) => lineHit(one, two, eps)));
};

export const lineHit = (one: SlopeIntercept, two: SlopeIntercept, eps: number) => {
    return overlapping(one, two, eps) || !!lineLine(one, two);
};

const normPoints = (points: Coord[], prec: number) => {
    const map: Record<string, Coord> = {};
    points.forEach((p) => {
        const k = coordKey(p, prec);
        if (!map[k]) map[k] = p;
    });
    return map;
};

const normSegs = (segs: [Coord, Coord][], norm: Record<string, Coord>, prec: number) =>
    segs.map(
        ([a, b]): [Coord, Coord] => [norm[coordKey(a, prec)], norm[coordKey(b, prec)]] as const,
    );

const sortBy = <T, B>(v: T[], a: (t: T) => B, c: (a: B, b: B) => number): T[] =>
    v
        .map((v) => ({v, a: a(v)}))
        .sort((a, b) => c(a.a, b.a))
        .map((a) => a.v);

function logByEndPoint(debug: RenderLog[], byEndPoint: EndPointMap) {
    debug.push({
        type: 'group',
        title: `By Endpoint`,
        children: [
            {
                type: 'items',
                title: 'All Points',
                items: Object.values(byEndPoint).map((v) => ({
                    item: {type: 'point', p: v.pos},
                })),
            },
            {
                type: 'items' as const,
                title: `Points and such`,
                items: [
                    ...sortBy(
                        Object.entries(byEndPoint),
                        (a) => coordToPolar(a[1].pos),
                        (a, b) => (closeEnough(a.m, b.m) ? a.t - b.t : a.m - b.m),
                    ).map(([key, value], i) => ({
                        item: [
                            ...value.exits.map((exit) => ({
                                type: 'point' as const,
                                p: exit.to,
                            })),
                            {type: 'point' as const, p: value.pos, color: {r: 0, g: 0, b: 255}},
                        ],
                    })),
                ],
            },
        ],
    });
}
