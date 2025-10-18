import {coordKey} from '../rendering/coordKey';
import {closeEnough} from '../rendering/epsilonToZero';
import {angleTo} from '../rendering/getMirrorTransforms';
import {lineLine, lineToSlope} from '../rendering/intersect';
import {angleBetween} from '../rendering/isAngleBetween';
import {coordsEqual} from '../rendering/pathsAreIdentical';
import {Coord} from '../types';

const boundsIntersect = (l1: [Coord, Coord], l2: [Coord, Coord]) => {
    // Get bounding box for line 1
    const l1MinX = Math.min(l1[0].x, l1[1].x);
    const l1MaxX = Math.max(l1[0].x, l1[1].x);
    const l1MinY = Math.min(l1[0].y, l1[1].y);
    const l1MaxY = Math.max(l1[0].y, l1[1].y);

    // Get bounding box for line 2
    const l2MinX = Math.min(l2[0].x, l2[1].x);
    const l2MaxX = Math.max(l2[0].x, l2[1].x);
    const l2MinY = Math.min(l2[0].y, l2[1].y);
    const l2MaxY = Math.max(l2[0].y, l2[1].y);

    // Check if bounding boxes intersect
    return l1MaxX >= l2MinX && l1MinX <= l2MaxX && l1MaxY >= l2MinY && l1MinY <= l2MaxY;
};

const findSplitPoints = (segs: [Coord, Coord][]) => {
    const splitPoints: Record<number, Coord[]> = {};

    const slopes = segs.map(([a, b]) => lineToSlope(a, b, true));
    for (let i = 0; i < slopes.length; i++) {
        // const ki1 = coordKey(segs[i][0]);
        // const ki2 = coordKey(segs[i][1]);
        for (let j = i + 1; j < slopes.length; j++) {
            // const kj1 = coordKey(segs[j][0]);
            // const kj2 = coordKey(segs[j][1]);
            // if (ki1 === kj1 || ki1 === kj2 || ki2 === kj1 || ki2 === kj2) {
            //     continue; // unnecessary, they share an endpoint
            // }
            if (!boundsIntersect(segs[i], segs[j])) continue;
            // TODO: maybe check bounding box collision first?
            const int = lineLine(slopes[i], slopes[j]);
            if (!int) continue;
            // const ki = coordKey(int);
            if (!coordsEqual(segs[i][0], int) && !coordsEqual(segs[i][1], int)) {
                // if (ki !== ki1 && ki !== ki2) {
                addToMap(splitPoints, i, int);
            }
            if (!coordsEqual(segs[j][0], int) && !coordsEqual(segs[j][1], int)) {
                // if (ki !== kj1 && ki !== kj2) {
                addToMap(splitPoints, j, int);
            }
        }
    }
    return splitPoints;
};

const splitByPoints = (splits: Coord[]): [Coord, Coord][] => {
    // sort by x or y
    if (closeEnough(splits[0].x, splits[1].x)) {
        // sort by y
        splits.sort((a, b) => a.y - b.y);
    } else {
        splits.sort((a, b) => a.x - b.x);
    }

    const res: [Coord, Coord][] = [];
    for (let i = 1; i < splits.length; i++) {
        const prev = splits[i - 1];
        const next = splits[i];
        if (coordsEqual(prev, next)) {
            throw new Error(`shouldn't get duplicate points here`);
        }
        res.push([prev, next]);
    }
    return res;
};

export const cutSegments = (segs: [Coord, Coord][]) => {
    /*
    1. convert everything to SlopeIntercept form
    2. do line/line collisions with everything. each collision knows the seg indices
        2a. maybe first do boundingbox checks? dunno if necessary
        2b. could also first check for shared endpoints
    3. go through each seg, splitting on any collisions
    */
    const splitPoints = findSplitPoints(segs);
    const result: [Coord, Coord][] = [];
    segs.forEach(([a, b], i) => {
        if (splitPoints[i]) {
            result.push(...splitByPoints(unique([a, b, ...splitPoints[i]], coordKey)));
        } else {
            result.push([a, b]);
        }
    });
    return result;
};

export const shapesFromSegments = (segs: [Coord, Coord][], eigenPoints: Coord[]) => {
    const byEndPoint: Record<string, {idx: number; theta: number; to: Coord}[]> = {};
    segs.forEach((seg, i) => {
        if (coordsEqual(seg[0], seg[1])) {
            console.warn('zero-length seg, ignoring');
            return;
        }
        const to = angleTo(seg[0], seg[1]);
        const from = angleTo(seg[1], seg[0]);
        addToMap(byEndPoint, coordKey(seg[0]), {idx: i, theta: to, to: seg[1]});
        addToMap(byEndPoint, coordKey(seg[1]), {idx: i, theta: from, to: seg[0]});
    });

    const used: Record<string, true> = {};
    const shapes: Coord[][] = [];
    eigenPoints.forEach((point) => {
        const segs = byEndPoint[coordKey(point)];
        if (!segs) {
            console.warn(`no segs from point`, point);
            return;
        }
        for (const seg of segs) {
            const sk = `${coordKey(point)}:${coordKey(seg.to)}`;
            if (used[sk]) continue;
            let at = seg;
            const points = [point, seg.to];
            while (points.length < 100) {
                const nexts = byEndPoint[coordKey(at.to)]
                    .filter((seg) => !coordsEqual(seg.to, points[points.length - 2]))
                    .map((seg) => ({
                        seg,
                        cctheta: angleBetween(at.theta + Math.PI, seg.theta, true),
                    }))
                    .sort((a, b) => a.cctheta - b.cctheta);

                if (!nexts.length) {
                    break;
                }
                const next = nexts[0];

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
            }
            if (points.length === 100) {
                console.warn('bad news, shape is bad');
                continue;
            }
            shapes.push(points);
        }
    });
    return shapes;
};

const addToMap = <T,>(map: Record<string | number, T[]>, k: string | number, t: T) => {
    if (!map[k]) map[k] = [t];
    else map[k].push(t);
};
export const unique = <T,>(l: T[], k: (t: T) => string) => {
    const seen: Record<string, boolean> = {};
    return l.filter((t) => {
        const key = k(t);
        return seen[key] ? false : (seen[key] = true);
    });
};
