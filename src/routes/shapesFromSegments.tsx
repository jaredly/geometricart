import {boundsForCoords, PendingBounds} from '../editor/Bounds';
import {Bounds} from '../editor/Bounds';
import {tilingPoints} from '../editor/tilingPoints';
import {coordKey} from '../rendering/coordKey';
import {closeEnough, closeEnoughAngle, epsilon} from '../rendering/epsilonToZero';
import {
    angleTo,
    applyMatrices,
    dist,
    Matrix,
    rotationMatrix,
    scaleMatrix,
    translationMatrix,
} from '../rendering/getMirrorTransforms';
import {lineLine, lineToSlope} from '../rendering/intersect';
import {angleBetween} from '../rendering/isAngleBetween';
import {coordsEqual} from '../rendering/pathsAreIdentical';
import {transformSegment} from '../rendering/points';
import {Coord, Tiling} from '../types';
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

export const joinAdjacentShapeSegments = (segs: Coord[]) => {
    const thetas = segs.map((seg, i) => angleTo(segs[i === 0 ? segs.length - 1 : i - 1], segs[i]));
    return segs.filter((_, i) => {
        const t = thetas[i];
        const nt = thetas[i === segs.length - 1 ? 0 : i + 1];
        return !closeEnoughAngle(nt, t, 0.001);
    });
};

type EndPointMap = Record<string, {exits: {idx: number; theta: number; to: Coord}[]; pos: Coord}>;

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

/*
weaving paths:
each intersection needs to be annotated with (1) over (-1) under or (0) no change

start at one intersection, pick one to go one way.
add neighbors to the frontier, with (back-point) and (back-side=-1[under] or 1[over])
then consider the fronteir
*/

export const weaveIntersections = (segs: [Coord, Coord][], segLinks: SegLink[]) => {
    /*
    intersection can have multiple pairs
    pairs are identified by [segid]:[segid]
    need a map: [seg]:neighbors[]

    intersection key is segid[].sort().join(',')
    */
    type Inter = {
        elevation?: -1 | 1 | 0;
        pos: Coord;
        exits: number[];
        key: string;
        other?: string;
        pathId?: number;
    };
    const intersections: Record<string, Inter> = {};
    const byCoord: Record<string, Inter> = {};

    // OK first go through and produce all intersections
    const segInts = segLinks.map((links, i) => {
        const left: Inter = {
            exits: [i, ...links.left].sort(),
            pos: segs[i][0],
            key: '',
            pathId: links.pathId,
        };
        left.key = left.exits.join(',');
        if (!intersections[left.key]) {
            intersections[left.key] = left;
            const lpos = coordKey(left.pos);
            if (byCoord[lpos]) {
                if (byCoord[lpos].other) {
                    throw new Error(`other already has an other`);
                }
                byCoord[lpos].other = left.key;
                left.other = byCoord[lpos].key;
            } else {
                byCoord[lpos] = left;
            }
        }
        const right: Inter = {
            exits: [i, ...links.right].sort(),
            pos: segs[i][1],
            key: '',
            pathId: links.pathId,
        };
        right.key = right.exits.join(',');

        if (!intersections[right.key]) {
            intersections[right.key] = right;
            const rpos = coordKey(right.pos);
            if (byCoord[rpos]) {
                if (byCoord[rpos].other) {
                    throw new Error(`other already has an other`);
                }
                byCoord[rpos].other = right.key;
                right.other = byCoord[rpos].key;
            } else {
                byCoord[rpos] = right;
            }
        }

        // if (!intersections[right.key]) {
        //     addToMap(byCoord, coordKey(right.pos), right);
        //     intersections[right.key] = left;
        // }
        return [left.key, right.key];
    });

    const first = Object.keys(intersections).find((k) => intersections[k].other != null);
    if (!first) return;
    const int = intersections[first];
    int.elevation = 1;
    type Front = {seg: number; backKey: string; nextEl: 1 | -1};
    const frontier: Front[] = int.exits.map((seg) => ({seg, backKey: int.key, nextEl: -1}));
    const oppo = intersections[int.other!];
    oppo.elevation = -1;
    frontier.push(...oppo.exits.map((seg): Front => ({seg, backKey: oppo.key, nextEl: 1})));

    while (frontier.length) {
        const next = frontier.shift()!;
        const [left, right] = segInts[next.seg];
        const neighbor = left === next.backKey ? right : left;
        const int = intersections[neighbor];
        if (int.elevation != null) continue;
        if (int.other) {
            int.elevation = next.nextEl;
            const rev = (next.nextEl * -1) as 1 | -1;
            const oppo = intersections[int.other];
            oppo.elevation = rev;
            frontier.push(...int.exits.map((seg): Front => ({seg, backKey: int.key, nextEl: rev})));
            frontier.push(
                ...oppo.exits.map((seg): Front => ({seg, backKey: oppo.key, nextEl: next.nextEl})),
            );
        } else {
            int.elevation = 0;
            frontier.push(
                ...int.exits.map((seg): Front => ({seg, backKey: int.key, nextEl: next.nextEl})),
            );
        }
    }

    type Woven = {points: Coord[][]; order: number};
    return Object.values(intersections)
        .map((int) => {
            const neighbors = int.exits
                .map((seg) => (segInts[seg][0] === int.key ? segInts[seg][1] : segInts[seg][0]))
                .map((key) => midPoint(intersections[key].pos, int.pos));
            const pairs = allPairs(neighbors).map(([a, b]) => [a, int.pos, b]);
            return {points: pairs, order: int.elevation ?? 0, pathId: int.pathId};
        })
        .sort((a, b) => a.order - b.order);
};

const midPoint = (a: Coord, b: Coord) => ({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2});

const allPairs = <T,>(items: T[]): [T, T][] => {
    const res: [T, T][] = [];
    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            res.push([items[i], items[j]]);
        }
    }
    return res;
};

type SegLink = {left: number[]; right: number[]; pathId?: number};

/*
ok so for a normal two-color pattern, I could just do straight lines, presumably as a single list of Coords.
but for other things, we'll need to supoprt like a three-way intersection, with lines going in each direction.
Sooo the data type looks like a list of lists of Coords.
*/
export const pathsFromSegments = (segs: [Coord, Coord][], byEndPoint: EndPointMap) => {
    // Ensure ordering
    segs.forEach((seg) => seg.sort((a, b) => (closeEnough(a.x, b.x) ? a.y - b.y : a.x - b.x)));

    const bounds = boundsForCoords(...segs.flat());

    const segLinks: SegLink[] = segs.map((_) => ({
        left: [],
        right: [],
    }));

    const link = (one: number, two: number, key: string) => {
        if (coordKey(segs[one][0]) === key) {
            if (onEdge(segs[one][0], bounds)) return;
            segLinks[one]!.left.push(two);
        } else {
            if (onEdge(segs[one][1], bounds)) return;
            segLinks[one]!.right.push(two);
        }
        if (coordKey(segs[two][0]) === key) {
            segLinks[two]!.left.push(one);
        } else {
            segLinks[two]!.right.push(one);
        }
    };

    Object.entries(byEndPoint).forEach(([key, {exits}]) => {
        if (exits.length === 2) {
            link(exits[0].idx, exits[1].idx, key);
        } else if (exits.length % 2 === 0) {
            exits.sort((a, b) => a.theta - b.theta);
            // every opposite
            const half = exits.length / 2;
            for (let i = 0; i < half; i++) {
                link(exits[i].idx, exits[i + half].idx, key);
            }
        } else {
            // every to every
            for (let i = 0; i < exits.length - 1; i++) {
                for (let j = i + 1; j < exits.length; j++) {
                    link(exits[i].idx, exits[j].idx, key);
                }
            }
        }
    });

    let nextPathId = 0;
    const follow = (at: number, pathId: number) => {
        const link = segLinks[at];
        if (link.pathId != null) return;
        link.pathId = pathId;
        link.left.forEach((id) => follow(id, pathId));
        link.right.forEach((id) => follow(id, pathId));
    };

    segLinks.forEach((sl, i) => {
        if (sl.pathId != null) return;
        follow(i, nextPathId++);
    });

    return segLinks;
};

export const shapesFromSegments = (byEndPoint: EndPointMap, eigenPoints: Coord[]) => {
    const used: Record<string, true> = {};
    const shapes: Coord[][] = [];
    eigenPoints.forEach((point) => {
        const segs = byEndPoint[coordKey(point)].exits;
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
                const nexts = byEndPoint[coordKey(at.to)].exits
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
                // console.warn('bad news, shape is bad');
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

const shouldFlipTriangle = (
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

const getRectangleTransform = (tiling: Tiling, data: ReturnType<typeof getPatternData>) => {
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

export const flipPattern = (tiling: Tiling): Tiling => {
    let {shape, cache} = tiling;
    if (shape.type === 'right-triangle') {
        const pts = tilingPoints(tiling.shape);
        const bounds = pts;
        let [start, corner, end] = bounds;

        let internalAngle = angleBetween(angleTo(start, corner), angleTo(start, end), true);
        if (!shouldFlipTriangle(shape.rotateHypotenuse, internalAngle, tiling, start, end)) {
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
        const data = getPatternData(tiling);
        const tx = getRectangleTransform(tiling, data);
        if (!tx?.length) return tiling;

        console.log('transform para', tx);

        shape = {...shape};
        cache = {...cache};

        const points = shape.points.map((p) => applyMatrices(p, tx));

        console.log('transformed points', points, 'ordered', rectPointsInOrder(points));

        cache.segments = cache.segments.map((seg) => ({
            prev: applyMatrices(seg.prev, tx),
            segment: transformSegment(seg.segment, tx),
        }));
        return {
            ...tiling,
            cache,
            shape: {
                ...shape,
                points: rectPointsInOrder(points),
            },
        };
    }
    return tiling;
};

const rectPointsInOrder = (points: Coord[]): [Coord, Coord, Coord, Coord] => {
    const [a, b, d, c] = points.toSorted((a, b) => (closeEnough(a.y, b.y) ? a.x - b.x : b.y - a.y));
    return [a, b, c, d];
};
