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
import {resolveT, withShared, resolvePMod, modsToShapes} from './resolveMods';

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
) => {
    let modified = false;
    const debug = [];
    for (let {shapes, mods, t, shared} of adjustments) {
        const local: Record<string, any> = {};
        if (t) {
            const res = resolveT(t, anim.values.t);
            if (res == null) continue;
            local.t = res;
        }
        const aanim = withShared(anim, shared);

        for (let shape of shapes) {
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
            // const two = unique(
            //     moved.flatMap((m) => m.shape),
            //     coordKey,
            // );
            const cmoved = centroid(moved.flatMap((m) => m.shape));
            const reconstructed = shapesFromSegments(byEndPoint, one).filter(
                (c) => !matchesBounds(boundsForCoords(...c), cmoved),
            );
            // uniqueShapes = reconstructed;
            modified = true;
            uniqueShapes = [...left, ...reconstructed];

            debug.push({left, segs, byEndPoint});
            // console.log('eft', left);
            // uniqueShapes = [...left, ...right];
            // uniqueShapes = left;
        }
    }

    return {shapes: modified ? sortShapesByPolar(uniqueShapes) : uniqueShapes, debug};
};
export const coordPairKey = ([left, right]: [Coord, Coord], prec = 3) => {
    if (closeEnough(left.x, right.x) ? right.y < left.y : right.x < left.x) {
        [left, right] = [right, left];
    }
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
