import {coordKey} from '../rendering/coordKey';
import {closeEnough} from '../rendering/epsilonToZero';
import {isClockwisePoints} from '../rendering/pathToPoints';
import {Coord} from '../types';
import {EndPointMap, calcPolygonArea} from './shapesFromSegments';
import {discoverShape} from './discoverShape';

export const outerBoundary = (
    segs: [Coord, Coord][],
    byEndPoint: EndPointMap,
    pointNames: Record<string, number>,
) => {
    let mostest: Coord | null = null;
    const check = (a: Coord) => {
        if (mostest) {
            if (closeEnough(mostest.x, a.x)) {
                if (mostest.y > a.y) {
                    mostest = a;
                }
            } else if (mostest.x > a.x) {
                mostest = a;
            }
        } else {
            mostest = a;
        }
        // if (!mostest || mostest.x > a.x + epsilon) mostest = a;
    };
    segs.forEach(([a, b]) => {
        check(a);
        check(b);
    });
    if (!mostest) {
        console.error('no point?');
        return null;
    }
    const exits = byEndPoint[coordKey(mostest)].exits;
    // console.log(`most`, pointNames[coordKey(mostest)]);
    // console.log(exits.map((e) => pointNames[coordKey(e.to)]));
    const used: Record<string, true> = {};
    const found = exits
        .map((seg) => {
            const sk = `${coordKey(mostest!)}:${coordKey(seg.to)}`;
            if (used[sk]) return;
            const {points, ranout} = discoverShape(mostest!, seg, used, byEndPoint, false, 1000);
            if (points.length === 100 || ranout) {
                // console.warn('bad news, shape is bad');
                return;
            }
            // return points;
            if (!isClockwisePoints(points)) {
                return points;
            } else {
                // console.log('found a clockwise one');
                return;
            }
        })
        .filter(Boolean) as Coord[][];
    // console.log(
    //     'boundary',
    //     found.map((f) => f?.length),
    // );
    // console.log(found.map((f) => f.map((c) => pointNames[coordKey(c)])));
    if (found.length > 1) {
        console.warn(`weird that we found multiple boundaries`);
        const bySize = found
            .map((points) => ({points, area: calcPolygonArea(points)}))
            .sort((a, b) => b.area - a.area);
        return bySize[0].points;
    }
    if (!found.length) {
        // console.error(`no bounadry at all`);
    }
    return found.length ? found[0] : null;
};
