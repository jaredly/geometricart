import {Bounds} from '../editor/Bounds';
import {coordKey} from '../rendering/coordKey';
import {closeEnough, closeEnoughAngle, epsilon} from '../rendering/epsilonToZero';
import {
    angleTo,
    dist,
    Matrix,
    scaleMatrix,
    translationMatrix,
} from '../rendering/getMirrorTransforms';
import {lineLine, lineToSlope} from '../rendering/intersect';
import {coordsEqual} from '../rendering/pathsAreIdentical';
import {isClockwisePoints} from '../rendering/pathToPoints';
import {Coord, Tiling} from '../types';
import {discoverShape} from './discoverShape';
import {centroid} from './findReflectionAxes';
import {getPatternData} from './getPatternData';

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

const removeOverlappingSegs = (segs: [Coord, Coord][]) => {
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

export const joinAdjacentShapeSegments = (segs: Coord[]) => {
    const thetas = segs.map((seg, i) => angleTo(segs[i === 0 ? segs.length - 1 : i - 1], segs[i]));
    return segs.filter((_, i) => {
        const t = thetas[i];
        const nt = thetas[i === segs.length - 1 ? 0 : i + 1];
        return !closeEnoughAngle(nt, t, 0.001);
    });
};

export type EndPointMap = Record<
    string,
    {exits: {idx: number; theta: number; to: Coord}[]; pos: Coord}
>;

export const edgesByEndpoint = (segs: [Coord, Coord][]) => {
    const byEndPoint: EndPointMap = {};

    // const coordsByKey: Record<string, Coord> = {}
    segs.forEach((seg, i) => {
        if (coordsEqual(seg[0], seg[1])) {
            return;
        }
        const to = angleTo(seg[0], seg[1]);
        const from = angleTo(seg[1], seg[0]);
        const k0 = coordKey(seg[0]);
        if (!byEndPoint[k0]) byEndPoint[k0] = {exits: [], pos: seg[0]};
        byEndPoint[k0].exits.push({idx: i, theta: to, to: seg[1]});

        const k1 = coordKey(seg[1]);
        if (!byEndPoint[k1]) byEndPoint[k1] = {exits: [], pos: seg[1]};
        byEndPoint[k1].exits.push({idx: i, theta: from, to: seg[0]});

        // addToMap(byEndPoint, coordKey(seg[1]), {idx: i, theta: from, to: seg[0]});
        // coordsByKey[coordKey(seg[0])] = seg[0] coordsByKey[coordKey(seg[1])] = seg[1]
    });
    return byEndPoint;
};

const onEdge = (pos: Coord, bounds: Bounds) =>
    closeEnough(pos.x, bounds.x0) ||
    closeEnough(pos.x, bounds.x1) ||
    closeEnough(pos.y, bounds.y0) ||
    closeEnough(pos.y, bounds.y1);

export const midPoint = (a: Coord, b: Coord, perc = 0.5) => ({
    x: a.x + (b.x - a.x) * perc,
    y: a.y + (b.y - a.y) * perc,
});

export const allPairs = <T,>(items: T[]): [T, T][] => {
    const res: [T, T][] = [];
    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            res.push([items[i], items[j]]);
        }
    }
    return res;
};

export type SegLink = {left: number[]; right: number[]; pathId?: number};

export const cmpCoords = (a: Coord, b: Coord) => (closeEnough(a.x, b.x) ? a.y - b.y : a.x - b.x);

export const shapesFromSegments = (byEndPoint: EndPointMap, eigenPoints: Coord[]) => {
    const used: Record<string, true> = {};
    const shapes: Coord[][] = [];
    const backwards: Coord[][] = [];
    eigenPoints.forEach((point) => {
        const segs = byEndPoint[coordKey(point)].exits;
        if (!segs) {
            console.warn(`no segs from point`, point);
            return;
        }
        for (const seg of segs) {
            const sk = `${coordKey(point)}:${coordKey(seg.to)}`;
            if (used[sk]) continue;
            const {points, ranout} = discoverShape(point, seg, used, byEndPoint);
            if (points.length === 100 || ranout) {
                // console.warn('bad news, shape is bad');
                continue;
            }
            if (!isClockwisePoints(points)) {
                shapes.push(points);
            } else {
                backwards.push(points);
            }
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

export const chooseCorner = (options: Coord[], shapes: Coord[][]) => {
    const shapesAtPoints: (null | Coord[] | false)[] = options.map((_) => null);
    shapes.forEach((shape) => {
        const ct = centroid(shape);
        for (let i = 0; i < options.length; i++) {
            if (coordsEqual(ct, options[i])) {
                if (shapesAtPoints[i] === null) {
                    shapesAtPoints[i] = shape;
                } else {
                    shapesAtPoints[i] = false;
                }
                return;
            }
        }
    });
    const bySize = shapesAtPoints
        .map((shape, i) => ({
            i,
            shape: shape && shape.length,
            area: shape ? calcPolygonArea(shape) : 0,
        }))
        .sort((a, b) => (closeEnough(b.area, a.area) ? a.i - b.i : b.area - a.area));

    // console.log('corners by size', bySize);
    return bySize;
};

export const shouldFlipTriangle = (
    rotHyp: boolean,
    internalAngle: number,
    tiling: Tiling,
    start: Coord,
    end: Coord,
) => {
    if (internalAngle > Math.PI) internalAngle = Math.PI * 2 - internalAngle;

    if (closeEnough(internalAngle, Math.PI / 4, 0.001)) {
        const lowerLeft = start.x < end.x ? start : end;
        const upperRight = start.x < end.x ? end : start;
        // console.log(`Is lowerLeft and upperRight flipped`, start.x > end.x);

        // console.log('isClose', internalAngle);
        const data = getPatternData(tiling);
        const centerShapes: Coord[][] = [];
        const outerShapes: Coord[][] = [];
        data.shapes.forEach((shape) => {
            const ct = centroid(shape);
            if (coordsEqual(ct, lowerLeft)) {
                centerShapes.push(shape);
            }
            if (coordsEqual(ct, upperRight)) {
                outerShapes.push(shape);
            }
        });
        if (centerShapes.length === 1 && outerShapes.length === 1) {
            const centerArea = calcPolygonArea(centerShapes[0]);
            const outerArea = calcPolygonArea(outerShapes[0]);
            // console.log('Should I flip');
            // console.log('areas', centerArea, outerArea);
            // console.log(
            //     `bounds`,
            //     boundsForCoords(...centerShapes[0]),
            //     boundsForCoords(...outerShapes[0]),
            // );
            // console.log(centerShapes, outerShapes);
            if (centerArea < outerArea - 0.001) {
                // console.log('Yes flipping!');
                return true;
            }
        }
    }

    if (!rotHyp) return false;

    if (internalAngle < Math.PI / 4 + epsilon) {
        return false;
    }

    return true;
};

const rectDims = (a: Coord, b: Coord, c: Coord, d: Coord) => {
    const x1 = dist(a, b);
    const x2 = dist(c, d);
    const y1 = dist(b, c);
    const y2 = dist(d, a);
    // aspectRatio
    let w = (x1 + x2) / 2;
    let h = (y1 + y2) / 2;

    return {w, h};
};

export const getRectangleTransform = (tiling: Tiling, data: ReturnType<typeof getPatternData>) => {
    let {shape, cache} = tiling;
    if (shape.type !== 'parallellogram') {
        return;
    }

    const shapePoints = shape.points;
    const tilingPoints_ = shapePoints;
    const {w, h} = rectDims(...shapePoints);

    const tx: Matrix[] = [];

    const bestCorner = chooseCorner(shapePoints, data.shapes)[0].i;
    if (bestCorner === 0) return;

    console.log('got best corner', bestCorner);

    if (bestCorner === 1) {
        const mx = (tilingPoints_[0].x + tilingPoints_[1].x) / 2;
        if (closeEnough(mx, 0)) {
            tx.push(scaleMatrix(-1, 1));
        } else {
            tx.push(
                translationMatrix({x: -mx, y: 0}),
                scaleMatrix(-1, 1),
                translationMatrix({x: mx, y: 0}),
            );
        }
    }
    if (bestCorner === 2) {
        tx.push(scaleMatrix(-1, -1), translationMatrix(tilingPoints_[2]));
    }
    if (bestCorner === 3) {
        const my = (tilingPoints_[0].y + tilingPoints_[3].y) / 2;
        // if (closeEnough(my, 0)) {
        //     tx.push(scaleMatrix(1, -1));
        // } else {
        tx.push(
            // translationMatrix({x: 0, y: -my}),
            scaleMatrix(1, -1),
            translationMatrix({x: 0, y: tilingPoints_[3].y}),
        );
        // }
    }

    // find the largest shape centered on a corner
    // put it in the middle
    // maybe flip if needed so its wider than tall

    if (closeEnough(w, h, 0.01)) {
        return tx;
    }

    if (w > h - epsilon) {
        return tx;
    }

    return tx;
    // return [...tx, rotationMatrix(Math.PI / 2), scaleMatrix(1, -1), scaleMatrix(w / h, w / h)];
};

export const rectPointsInOrder = (points: Coord[]): [Coord, Coord, Coord, Coord] => {
    const [a, b, d, c] = points.toSorted((a, b) => (closeEnough(a.y, b.y) ? a.x - b.x : b.y - a.y));
    return [a, b, c, d];
};
