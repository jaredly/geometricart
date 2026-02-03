import {coordKey} from '../rendering/coordKey';
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

export type Inter = {
    elevation?: -1 | 1 | 0 | number;
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

export const calculateIntersections = (segs: [Coord, Coord][], segLinks: SegLink[]) => {
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
                    // So here, we're drawing a line from self to other.

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

export const weaveIntersections2 = (segs: [Coord, Coord][], segLinks: SegLink[]) => {
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
    Object.keys(intersections).forEach((k) => {
        if (intersections[k].elevation == null) {
            console.log('missing el', k);
            intersections[k].elevation = -2;
        }
    });

    // console.log('Intersections', intersections);

    const intLines = (key: string) =>
        allPairs(
            intersections[key].exits.map((seg) =>
                segInts[seg][0] === key ? segInts[seg][1] : segInts[seg][0],
            ),
        ).map(([a, b]) => ({key, left: a, right: b}));

    const intMasks = (key: string) =>
        intLines(key).map(({key, left, right}) => ({
            line: [intersections[left].pos, intersections[key].pos, intersections[right].pos],
            pathId: intersections[key].pathId,
        }));

    type Woven = {line: Coord[]; pathId?: number; masks: {line: Coord[]; pathId?: number}[]};
    return Object.values(intersections).flatMap((int, i): Woven[] => {
        // if (i % 20 !== 0) return [];
        const el = int.elevation!;

        const other =
            int.other && intersections[int.other].elevation! > el ? intMasks(int.other) : [];

        // console.log('at', i, int.key, intLines(int.key));

        // lines going out of here
        return intLines(int.key).map(({left, right}) => {
            const lo = intersections[left].other;
            const ro = intersections[right].other;
            // console.log(`Line ${left} - ${int.key} - ${right}`, lo, ro);
            // console.log(
            //     coordKey(intersections[left].pos),
            //     coordKey(int.pos),
            //     coordKey(intersections[right].pos),
            // );
            const ell = lo && intersections[lo].elevation! > intersections[left].elevation!;
            const elr = ro && intersections[ro].elevation! > intersections[right].elevation!;
            return {
                line: [
                    midPoint(intersections[left].pos, int.pos),
                    int.pos,
                    midPoint(intersections[right].pos, int.pos),
                ],
                pathId: int.pathId,
                // Sooooo these masks might need to /follow/ the line until we get to
                // an int that is at or below the current el. right?
                masks: [...other, ...(ell ? intMasks(lo) : []), ...(elr ? intMasks(ro) : [])],
            };
        });

        // // const backOff = -0.35;
        // for (let seg of int.exits) {
        //     const key = segInts[seg][0] === int.key ? segInts[seg][1] : segInts[seg][0]
        //     const other = intersections[key].elevation ?? -2;
        //     const masks = other > el
        //         ? [
        //             intLines(key)
        //         ] : []

        // }

        // const mids = int.exits
        //     .map((seg) => (segInts[seg][0] === int.key ? segInts[seg][1] : segInts[seg][0]))
        //     .flatMap((key): Woven[] => {

        //         // So here, we're drawing a line from self to other.

        //         const other = intersections[key].elevation ?? -2;
        //         const mid = el + (other - el) * 0.3;
        //         return [
        //             {
        //                 points: [
        //                     [
        //                         midPoint(int.pos, intersections[key].pos, 0.26),
        //                         midPoint(int.pos, intersections[key].pos, 0.5),
        //                     ],
        //                 ],
        //                 order: mid + backOff,
        //                 pathId: int.pathId,
        //                 isBack: true,
        //             },
        //             {
        //                 points: [
        //                     [
        //                         midPoint(int.pos, intersections[key].pos, 0.25),
        //                         midPoint(int.pos, intersections[key].pos, 0.51),
        //                     ],
        //                 ],
        //                 order: mid,
        //                 pathId: int.pathId,
        //             },
        //         ];
        //     });

        // const neighbors = int.exits
        //     .map((seg) => (segInts[seg][0] === int.key ? segInts[seg][1] : segInts[seg][0]))
        //     .map((key) => midPoint(int.pos, intersections[key].pos, 0.3));

        // const second = int.exits
        //     .map((seg) => (segInts[seg][0] === int.key ? segInts[seg][1] : segInts[seg][0]))
        //     .map((key) => midPoint(int.pos, intersections[key].pos, 0.31));

        // return [
        //     ...mids,
        //     {
        //         points: allPairs(neighbors).map(([a, b]) => [a, int.pos, b]),
        //         order: el + backOff,
        //         pathId: int.pathId,
        //         isBack: true,
        //     },
        //     {
        //         points: allPairs(second).map(([a, b]) => [a, int.pos, b]),
        //         order: el,
        //         pathId: int.pathId,
        //     },
        // ];
    });
    // .sort((a, b) => a.order - b.order);
};
