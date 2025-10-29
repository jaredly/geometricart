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

    type Woven = {points: Coord[][]; order: number};
    return Object.values(intersections)
        .map((int) => {
            const neighbors = int.exits
                .map((seg) => (segInts[seg]?.[0] === int.key ? segInts[seg][1] : segInts[seg]?.[0]))
                .map((key) => (key ? midPoint(intersections[key].pos, int.pos) : null))
                .filter(Boolean) as Coord[];

            const pairs = allPairs(neighbors).map(([a, b]) => [a, int.pos, b]);
            // console.log(`Got a ${int.key}`, pairs, int.elevation);
            return {points: pairs, order: int.elevation ?? 0, pathId: int.pathId};
        })
        .sort((a, b) => a.order - b.order);
};
