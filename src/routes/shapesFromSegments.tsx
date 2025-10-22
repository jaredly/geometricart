import {getTransform, tilingPoints} from '../editor/tilingPoints';
import {coordKey} from '../rendering/coordKey';
import {closeEnough, closeEnoughAngle, epsilon} from '../rendering/epsilonToZero';
import {
    angleTo,
    applyMatrices,
    dist,
    rotationMatrix,
    scaleMatrix,
    translationMatrix,
} from '../rendering/getMirrorTransforms';
import {lineLine, lineToSlope} from '../rendering/intersect';
import {angleBetween} from '../rendering/isAngleBetween';
import {coordsEqual} from '../rendering/pathsAreIdentical';
import {transformSegment} from '../rendering/points';
import {Coord, Tiling} from '../types';

const gte = (a: number, b: number) => a >= b - epsilon;
const lte = (a: number, b: number) => a <= b + epsilon;

const boundsIntersect = (l1: [Coord, Coord], l2: [Coord, Coord], log = false) => {
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

    if (log) {
        console.log(
            `${l1MaxX} >= ${l2MinX} (${gte(l1MaxX, l2MinX)}) &&
             ${l1MinX} <= ${l2MaxX} (${lte(l1MinX, l2MaxX)}) &&
             ${l1MaxY} >= ${l2MinY} (${gte(l1MaxY, l2MinY)}) &&
             ${l1MinY} <= ${l2MaxY} (${lte(l1MinY, l2MaxY)})`,
        );
    }
    // Check if bounding boxes intersect
    return gte(l1MaxX, l2MinX) && lte(l1MinX, l2MaxX) && gte(l1MaxY, l2MinY) && lte(l1MinY, l2MaxY);
};

const isLargerThan = (l1: [Coord, Coord], l2: [Coord, Coord]) => {
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

    return lte(l1MinX, l2MinX) && lte(l1MinY, l2MinY) && gte(l1MaxX, l2MaxX) && gte(l1MaxY, l2MaxY);
};

export const removeOverlappingSegs = (segs: [Coord, Coord][]) => {
    const slopes = segs.map(([a, b]) => lineToSlope(a, b, true));
    const toRemove: number[] = [];
    for (let i = 0; i < slopes.length; i++) {
        if (toRemove.includes(i)) continue;
        // const ki1 = coordKey(segs[i][0]);
        // const ki2 = coordKey(segs[i][1]);
        for (let j = i + 1; j < slopes.length; j++) {
            if (!boundsIntersect(segs[i], segs[j])) continue;
            if (closeEnough(slopes[i].m, slopes[j].m)) {
                // if one is contained by the other
                if (isLargerThan(segs[i], segs[j])) {
                    toRemove.push(j);
                } else if (isLargerThan(segs[j], segs[i])) {
                    toRemove.push(i);
                    break;
                }
            }
        }
    }

    return toRemove.length ? segs.filter((_, i) => !toRemove.includes(i)) : segs;
};

export const splitOverlappingSegs = (segs: [Coord, Coord][], marks?: number[]) => {
    const slopes = segs.map(([a, b]) => lineToSlope(a, b, true));
    const toRemove: number[] = [];
    const toAdd: [Coord, Coord][] = [];
    for (let i = 0; i < slopes.length; i++) {
        if (toRemove.includes(i)) continue;
        for (let j = i + 1; j < slopes.length; j++) {
            if (!boundsIntersect(segs[i], segs[j])) {
                continue;
            }
            if (closeEnough(slopes[i].m, slopes[j].m) && closeEnough(slopes[i].b, slopes[j].b)) {
                if (!shareMidPoint(segs[i], segs[j])) {
                    const got = splitByPoints(unique([...segs[i], ...segs[j]], coordKey));
                    toAdd.push(...got);
                    toRemove.push(i, j);
                    marks?.push(i, j);
                }
            }
        }
    }

    return segs.filter((_, i) => !toRemove.includes(i)).concat(toAdd);
};

const shareMidPoint = ([a1, a2]: [Coord, Coord], [b1, b2]: [Coord, Coord]) => {
    if (closeEnough(a1.x, a2.x)) {
        const sorted = [a1, a2, b1, b2].sort((a, b) => (closeEnough(a.y, b.y) ? 0 : a.y - b.y));
        return coordsEqual(sorted[1], sorted[2]);
    }
    const sorted = [a1, a2, b1, b2].sort((a, b) => (closeEnough(a.x, b.x) ? 0 : a.x - b.x));
    return coordsEqual(sorted[1], sorted[2]);
};

const findSplitPoints = (segs: [Coord, Coord][]) => {
    const splitPoints: Record<number, Coord[]> = {};

    const slopes = segs.map(([a, b]) => lineToSlope(a, b, true));
    for (let i = 0; i < slopes.length; i++) {
        for (let j = i + 1; j < slopes.length; j++) {
            if (!boundsIntersect(segs[i], segs[j])) continue;

            // TODO: maybe check bounding box collision first?
            const int = lineLine(slopes[i], slopes[j]);
            if (!int) continue;
            if (!coordsEqual(segs[i][0], int) && !coordsEqual(segs[i][1], int)) {
                addToMap(splitPoints, i, int);
            }
            if (!coordsEqual(segs[j][0], int) && !coordsEqual(segs[j][1], int)) {
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

// export const joinBrokenSegs = (segs: [Coord,Coord][]) => {
//     const byEndPoint: Record<string, {idx: number; theta: number; to: Coord}[]> = {};
//     segs.forEach((seg, i) => {
//         if (coordsEqual(seg[0], seg[1])) {
//             console.warn('zero-length seg, ignoring');
//             return;
//         }
//         const to = angleTo(seg[0], seg[1]);
//         const from = angleTo(seg[1], seg[0]);
//         addToMap(byEndPoint, coordKey(seg[0]), {idx: i, theta: to, to: seg[1]});
//         addToMap(byEndPoint, coordKey(seg[1]), {idx: i, theta: from, to: seg[0]});
//     });
//     const toJoin = []
//     Object.values(byEndPoint).forEach(exits => {
//         if (exits.length !== 2) return;
//         if (closeEnough(angleBetween(exits[0].theta, exits[1].theta, true), Math.PI)) {
//             console.log('would join', exits)
//         }
//     })
// }

export const joinAdjacentShapeSegments = (segs: Coord[]) => {
    const thetas = segs.map((seg, i) => angleTo(segs[i === 0 ? segs.length - 1 : i - 1], segs[i]));
    return segs.filter((_, i) => {
        const t = thetas[i];
        const nt = thetas[i === segs.length - 1 ? 0 : i + 1];
        return !closeEnoughAngle(nt, t, 0.001);
    });
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
            const pks: string[] = [];
            let ranout = false;
            while (points.length < 100) {
                const nexts = byEndPoint[coordKey(at.to)]
                    .filter((seg) => !pks.includes(coordKey(seg.to)))
                    .filter((seg) => !coordsEqual(seg.to, points[points.length - 2]))
                    .map((seg) => ({
                        seg,
                        cctheta: angleBetween(at.theta + Math.PI, seg.theta, true),
                    }))
                    .sort((a, b) => a.cctheta - b.cctheta);

                if (!nexts.length) {
                    // console.log('ran out');
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
            if (points.length === 100 || ranout) {
                console.warn('bad news, shape is bad');
                continue;
            }
            shapes.push(points);
        }
    });
    return shapes;
};

export const addToMap = <T,>(map: Record<string | number, T[]>, k: string | number, t: T) => {
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

export function calcPolygonArea(vertices: Coord[]) {
    let total = 0;

    for (let i = 0, l = vertices.length; i < l; i++) {
        const addX = vertices[i].x;
        const addY = vertices[i === vertices.length - 1 ? 0 : i + 1].y;
        const subX = vertices[i === vertices.length - 1 ? 0 : i + 1].x;
        const subY = vertices[i].y;

        total += addX * addY * 0.5;
        total -= subX * subY * 0.5;
    }

    return Math.abs(total);
}

export const flipPattern = (tiling: Tiling): Tiling => {
    let {shape, cache} = tiling;
    if (shape.type === 'right-triangle' && shape.rotateHypotenuse) {
        const pts = tilingPoints(tiling.shape);
        const txt = getTransform(pts);
        const bounds = pts.map((pt) => applyMatrices(pt, txt));
        let [start, corner, end] = bounds;

        let internalAngle = angleBetween(angleTo(start, corner), angleTo(start, end), true);
        if (internalAngle > Math.PI) internalAngle = Math.PI * 2 - internalAngle;
        if (internalAngle < Math.PI / 4 + epsilon) {
            return tiling;
        }

        const tx = [
            translationMatrix({x: -end.x, y: -end.y}),
            scaleMatrix(1, -1),
            rotationMatrix(Math.PI / 2),
            scaleMatrix(-1 / end.y, -1 / end.y),
        ];

        shape = {...shape};
        cache = {...cache};

        start = applyMatrices(start, tx);
        end = applyMatrices(end, tx);
        corner = applyMatrices(corner, tx);

        cache.segments = cache.segments.map((seg) => ({
            prev: applyMatrices(seg.prev, tx),
            segment: transformSegment(seg.segment, tx),
        }));
        return {...tiling, cache, shape: {...shape, start: end, corner, end: start}};
    }
    if (shape.type === 'parallellogram') {
        const [a, b, c, d] = shape.points;
        const x1 = dist(a, b);
        const x2 = dist(c, d);
        const y1 = dist(b, c);
        const y2 = dist(d, a);
        // aspectRatio
        let w = (x1 + x2) / 2;
        let h = (y1 + y2) / 2;

        if (closeEnough(w, h, 0.01)) {
            return tiling;
        }

        if (w > h - epsilon) {
            return tiling;
        }

        const tx = [rotationMatrix(Math.PI / 2), scaleMatrix(1, -1), scaleMatrix(x1 / y2, x1 / y2)];

        shape = {...shape};
        cache = {...cache};

        const points = shape.points.map((p) => applyMatrices(p, tx));

        cache.segments = cache.segments.map((seg) => ({
            prev: applyMatrices(seg.prev, tx),
            segment: transformSegment(seg.segment, tx),
        }));
        return {
            ...tiling,
            cache,
            shape: {
                ...shape,
                points: [points[0], points[3], points[2], points[1]],
            },
        };
    }
    return tiling;
};
