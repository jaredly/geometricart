import {Bounds, boundsForCoords} from '../../../editor/Bounds';
import {coordKey} from '../../../rendering/coordKey';
import {closeEnough, withinLimit} from '../../../rendering/epsilonToZero';
import {lineLine, lineToSlope, SlopeIntercept, slopeKey} from '../../../rendering/intersect';
import {Coord, BarePath} from '../../../types';
import {centroid} from '../../findReflectionAxes';
import {coordsFromBarePath, sortShapesByPolar} from '../../getPatternData';
import {unique, cutSegments, edgesByEndpoint, shapesFromSegments} from '../../shapesFromSegments';
import {Ctx} from './evaluate';
import {PMods, TChunk, AnimatableValue} from './export-types';
import {
    resolveT,
    withShared,
    resolvePMod,
    modsToShapes,
    RenderLog,
    barePathFromCoords,
} from './resolveMods';

export const adjustShapes = (
    anim: Ctx['anim'],
    cropCache: Ctx['cropCache'],
    uniqueShapes: Coord[][],
    adjustments: {
        shapes: BarePath[];
        mods: PMods[];
        t?: TChunk;
        shared?: Record<string, AnimatableValue>;
    }[],
    log = false,
) => {
    let modified = false;
    const outerDebug: RenderLog[] = [];
    for (let {shapes, mods, t, shared} of adjustments) {
        const local: Record<string, any> = {};
        if (t) {
            const res = resolveT(t, anim.values.t);
            if (res == null) continue;
            local.t = res;
        }
        const aanim = withShared(anim, shared);
        const midDebug: RenderLog[] = [];

        for (let shape of shapes) {
            const debug: RenderLog[] = [];
            const shapeCoords = coordsFromBarePath(shape);
            const center = centroid(shapeCoords);
            const resolved = mods.map((mod) =>
                resolvePMod({...aanim, values: {...aanim.values, ...local, center}}, mod),
            );
            const shapeLines = coordLines(shapeCoords);
            const moved = modsToShapes(cropCache, resolved, [{shape: shapeCoords, i: 0}]);
            const movedLines = moved.map((m) => coordLines(m.shape));
            if (allSameLines(shapeLines, movedLines.flat())) {
                continue;
            }

            if (log) {
                debug.push({
                    title: 'Adjust Shape',
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

            // console.log('here we are', shapeLines, movedLines);
            const [left, right] = unzip(uniqueShapes, (coords) => {
                const got =
                    coordsIntersectCoords(coords, shapeLines) ||
                    movedLines.some((moved) => coordsIntersectCoords(coords, moved));
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
                (pair) => !coordPairOnShape(pair, shapeLines),
            );

            if (log) {
                debug.push({
                    title: 'Removed Segments',
                    type: 'items',
                    items: removedSegs.map((pair) => ({
                        item: {type: 'seg', prev: pair[0], seg: {type: 'Line', to: pair[1]}},
                    })),
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

            segs = cutSegments(segs);

            segs = unique(segs, coordPairKey);

            if (log) {
                debug.push({
                    title: 'Post Cut',
                    type: 'items',
                    items: segs.map((pair) => ({
                        item: {type: 'seg', prev: pair[0], seg: {type: 'Line', to: pair[1]}},
                    })),
                });
            }

            const byEndPoint = edgesByEndpoint(segs);
            // TODO: so I want to find eigenpoints, only ones that are ... along the moved path maybe?
            // or like the original or moved path idk.
            const one = unique(segs.flat(), coordKey);
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
            }
            const cmoved = centroid(moved.flatMap((m) => m.shape));
            const fromSegments = shapesFromSegments(byEndPoint, one, debug);
            const [centerShapes, reconstructed] = unzip(
                fromSegments.shapes,
                (c) => true, // !matchesBounds(boundsForCoords(...c), cmoved),
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
        outerDebug.push({type: 'group', title: 'Adjust Shape', children: midDebug});
    }

    return {shapes: modified ? sortShapesByPolar(uniqueShapes) : uniqueShapes, debug: outerDebug};
};

export const sortCoordPair = (pair: [Coord, Coord], eps?: number): [Coord, Coord] => {
    if (closeEnough(pair[0].x, pair[1].x, eps) ? pair[1].y < pair[0].y : pair[1].x < pair[0].x) {
        return [pair[1], pair[0]];
    }
    return pair;
};

export const coordPairKey = (pair: [Coord, Coord], prec = 3) => {
    const [left, right] = sortCoordPair(pair, Math.pow(10, -prec));
    return `${coordKey(left, prec)}:${coordKey(right, prec)}`;
};

export const coordLines = (coords: Coord[]) =>
    coordPairs(coords).map((pair) => lineToSlope(pair[0], pair[1], true));

export const coordPairOnShape = (pair: [Coord, Coord], shape: SlopeIntercept[]) => {
    const line = lineToSlope(pair[0], pair[1], true);
    return shape.some((sline) => overlapping(line, sline));
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

export const overlapping = (one: SlopeIntercept, two: SlopeIntercept) =>
    closeEnough(one.m, two.m) &&
    closeEnough(one.b, two.b) &&
    (withinLimit(one.limit!, two.limit![0]) ||
        withinLimit(one.limit!, two.limit![1]) ||
        withinLimit(two.limit!, one.limit![0]) ||
        withinLimit(two.limit!, one.limit![1]));

export const coordsIntersectCoords = (one: Coord[], twos: SlopeIntercept[]) => {
    return coordLines(one).some((one) => twos.some((two) => lineHit(one, two)));
};

export const lineHit = (one: SlopeIntercept, two: SlopeIntercept) => {
    return overlapping(one, two) || !!lineLine(one, two);
};
