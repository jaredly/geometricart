import {coordKey} from '../rendering/coordKey';
import {negPiToPi} from '../rendering/epsilonToZero';
import {angleBetween} from '../rendering/isAngleBetween';
import {coordsEqual} from '../rendering/pathsAreIdentical';
import {Coord} from '../types';
import {EndPointMap} from './shapesFromSegments';

export const discoverShape = (
    point: Coord,
    seg: {idx: number; theta: number; to: Coord},
    used: Record<string, true>,
    byEndPoint: EndPointMap,
    clockwise = true,
    maxPoints = 100,
) => {
    let at = seg;
    const points = [point, seg.to];
    const pks: string[] = [coordKey(seg.to)];
    let ranout = false;
    while (points.length < maxPoints) {
        const nexts = byEndPoint[coordKey(at.to)].exits
            .filter((seg) => !pks.includes(coordKey(seg.to)))
            .filter((seg) => !coordsEqual(seg.to, points[points.length - 2]))
            .map((seg) => ({
                seg,
                cctheta: angleBetween(negPiToPi(at.theta + Math.PI), seg.theta, clockwise),
            }))
            .sort((a, b) => a.cctheta - b.cctheta);

        if (!nexts.length) {
            ranout = true;
            break;
        }
        const next = nexts[0];
        // if (nexts.length > 1 && closeEnough(nexts[1].cctheta, next.cctheta)) {
        //     // throw new Error(`overlalappap`);
        //     console.log('overlllap', nexts);
        // }
        const sk = `${coordKey(at.to)}:${coordKey(next.seg.to)}`;
        // if (used[sk]) {
        //     console.warn(`somehow double-using a segment`, sk);
        // }
        used[sk] = true;

        if (coordsEqual(points[0], next.seg.to)) {
            break;
        }

        at = next.seg;
        points.push(at.to);
        pks.push(coordKey(at.to));
    }

    return {points, ranout};
};
