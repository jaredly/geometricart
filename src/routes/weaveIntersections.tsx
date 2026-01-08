import {coordKey} from '../rendering/coordKey';
import {coordsEqual} from '../rendering/pathsAreIdentical';
import {Coord} from '../types';
import {SegLink, midPoint, allPairs} from './shapesFromSegments';

/*
weaving paths:
each intersection needs to be annotated with (1) over (-1) under or (0) no change

start at one intersection, pick one to go one way.
add neighbors to the frontier, with (back-point) and (back-side=-1[under] or 1[over])
then consider the fronteir
*/

const numSort = (a: number, b: number) => a - b;

type Inter = {
    elevation?: -1 | 1 | 0;
    // the coordinate of the intersection
    pos: Coord;
    // list of segment indices
    exits: number[];
    // a unique key for this intersection
    key: string;
    // a crossing intersection at the same coordinate, if applicable
    other?: string;
    pathId?: number;
};

const calculateIntersections = (segs: [Coord, Coord][], segLinks: SegLink[]) => {
    /*
    intersection can have multiple pairs
    pairs are identified by [segid]:[segid]
    need a map: [seg]:neighbors[]

    intersection key is segid[].sort().join(',')
    */
    const intersections: Record<string, Inter> = {};
    const byCoord: Record<string, Inter> = {};

    let weird = false;

    // OK first go through and produce all intersections
    const segInts = segLinks.map((links, i) => {
        const left: Inter = {
            exits: [i, ...links.left].sort(numSort),
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
                    weird = true;
                    // return;
                } else {
                    byCoord[lpos].other = left.key;
                    left.other = byCoord[lpos].key;
                }
            } else {
                byCoord[lpos] = left;
            }
        }
        const right: Inter = {
            exits: [i, ...links.right].sort(numSort),
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
                    weird = true;
                    // return;
                } else {
                    byCoord[rpos].other = right.key;
                    right.other = byCoord[rpos].key;
                }
            } else {
                byCoord[rpos] = right;
            }
        }

        return [left.key, right.key];
    });

    return {intersections, segInts, weird};
};

export const weaveIntersections = (segs: [Coord, Coord][], segLinks: SegLink[]) => {
    const {intersections, segInts, weird} = calculateIntersections(segs, segLinks);
    // console.log('Weaving', segLinks, segInts);
    // if (weird) return;

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
        if (!segInts[next.seg]) continue;
        const [left, right] = segInts[next.seg]!;
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

    // console.log('Intersections', intersections);

    type Woven = {points: Coord[][]; order: number; isBack?: boolean; pathId?: number};
    return Object.values(intersections)
        .flatMap((int): Woven[] => {
            const el = int.elevation ?? -2;
            const backOff = -0.35;

            const mids = int.exits
                .map((seg) => (segInts[seg][0] === int.key ? segInts[seg][1] : segInts[seg][0]))
                .flatMap((key): Woven[] => {
                    const other = intersections[key].elevation ?? -2;
                    const mid = el + (other - el) * 0.3;
                    return [
                        {
                            points: [
                                [
                                    midPoint(int.pos, intersections[key].pos, 0.26),
                                    midPoint(int.pos, intersections[key].pos, 0.5),
                                ],
                            ],
                            order: mid + backOff,
                            pathId: int.pathId,
                            isBack: true,
                        },
                        {
                            points: [
                                [
                                    midPoint(int.pos, intersections[key].pos, 0.25),
                                    midPoint(int.pos, intersections[key].pos, 0.51),
                                ],
                            ],
                            order: mid,
                            pathId: int.pathId,
                        },
                    ];
                });

            const neighbors = int.exits
                .map((seg) => (segInts[seg][0] === int.key ? segInts[seg][1] : segInts[seg][0]))
                .map((key) => midPoint(int.pos, intersections[key].pos, 0.3));

            const second = int.exits
                .map((seg) => (segInts[seg][0] === int.key ? segInts[seg][1] : segInts[seg][0]))
                .map((key) => midPoint(int.pos, intersections[key].pos, 0.31));

            return [
                ...mids,
                {
                    points: allPairs(neighbors).map(([a, b]) => [a, int.pos, b]),
                    order: el + backOff,
                    pathId: int.pathId,
                    isBack: true,
                },
                {
                    points: allPairs(second).map(([a, b]) => [a, int.pos, b]),
                    order: el,
                    pathId: int.pathId,
                },
            ];
        })
        .sort((a, b) => a.order - b.order);
};

export const followPath = (links: SegLink[], segs: [Coord, Coord][], start: Coord) => {
    const {intersections, segInts, weird} = calculateIntersections(segs, links);

    const startAt = (
        int0: Inter,
        seg0: number,
        first: boolean,
    ): undefined | {points: Coord[]; open?: boolean} => {
        const points = [{int: int0, seg: seg0}];
        const used = {[int0.key]: true};
        while (points.length < 2000) {
            const prev = points[points.length - 1];
            const next = prev.int.exits.find((seg) => seg !== prev.seg);
            if (next == null || !segInts[next]) {
                if (first) {
                    const second = startAt(int0, int0.exits[1], false);
                    if (second) {
                        if (second.open) {
                            second.points.unshift(...points.map((p) => p.int.pos));
                        }
                        return second;
                    }
                }
                // console.log('no seg', next);
                // return;
                return {points: points.map((p) => p.int.pos), open: true};
            }
            const [left, right] = segInts[next]!;
            const neighbor = left === prev.int.key ? right : left;
            const int = intersections[neighbor];
            if (int.pathId !== int0.pathId) {
                console.log('reached a different path');
                if (first) {
                    const second = startAt(int0, int0.exits[1], false);
                    if (second) {
                        if (second.open) {
                            second.points.unshift(...points.map((p) => p.int.pos).reverse());
                        }
                        return second;
                    }
                }

                return {points: points.map((p) => p.int.pos), open: true};
            }
            if (int.key === points[0].int.key) {
                console.log('got to the top', points);
                return {points: points.map((p) => p.int.pos)};
            }
            if (used[int.key]) {
                console.log('nope');
                return {points: points.map((p) => p.int.pos)};
            }
            used[int.key] = true;
            // if (coordsEqual(int.pos, points[0].pos)) {
            //     console.log('got to the top', points);
            //     return points.map((p) => p.pos);
            // }
            points.push({int, seg: next});
        }
        console.log('ran out of points', points.length);
    };

    const int = Object.values(intersections).find((int) => coordsEqual(int.pos, start));
    if (!int) {
        console.log('couldnt find an intersection for the pos', start);
        console.log(intersections, links);
        return;
    }
    if (int.exits.length !== 2) {
        console.log('two-intersection please');
        return;
    }

    return startAt(int, int.exits[0], true);

    // console.log(points);
    // console.log('ran out of number');
};
