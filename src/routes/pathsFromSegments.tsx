import {coordKey} from '../rendering/coordKey';
import {closeEnough} from '../rendering/epsilonToZero';
import {Coord} from '../types';
import {EndPointMap, SegLink} from './shapesFromSegments';

/*
ok so for a normal two-color pattern, I could just do straight lines, presumably as a single list of Coords.
but for other things, we'll need to supoprt like a three-way intersection, with lines going in each direction.
Sooo the data type looks like a list of lists of Coords.
*/

export const pathsFromSegments = (
    segs: [Coord, Coord][],
    byEndPoint: EndPointMap,
    outer?: Coord[] | null,
) => {
    // Ensure ordering
    segs.forEach((seg) => seg.sort((a, b) => (closeEnough(a.x, b.x) ? a.y - b.y : a.x - b.x)));
    const outerKeys = outer?.map((x) => coordKey(x)) ?? [];

    if (segs.length > 20000) {
        return [];
    }

    // ok folks I need a better calculation of ... the boundary.
    // probably what I should do is find a coord on the edge
    // and do a "clockwise shape walk".
    // const bounds = boundsForCoords(...segs.flat());
    const segLinks: SegLink[] = segs.map((_) => ({
        left: [],
        right: [],
    }));

    const link = (one: number, two: number, key: string) => {
        if (coordKey(segs[one][0]) === key) {
            // if (outerKeys.includes(coordKey(segs[one][0]))) return;
            segLinks[one]!.left.push(two);
        } else {
            // if (outerKeys.includes(coordKey(segs[one][1]))) return;
            segLinks[one]!.right.push(two);
        }
        if (coordKey(segs[two][0]) === key) {
            segLinks[two]!.left.push(one);
        } else {
            segLinks[two]!.right.push(one);
        }
    };

    Object.entries(byEndPoint).forEach(([key, {exits}]) => {
        // if (outerKeys.includes(key)) return;
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
    const follow = (at: number, pathId?: number, hist: number[] = []) => {
        const link = segLinks[at];
        const seg = segs[at];
        if (outerKeys.includes(coordKey(seg[0])) && outerKeys.includes(coordKey(seg[1]))) return;
        if (link.pathId != null) return;
        if (hist.includes(at)) {
            console.log(JSON.stringify(segLinks));
            console.log(at, pathId, hist, segLinks[at], segs[at]);
            throw new Error('Loop somehow??');
        }
        // if (hist.length > 10000) {
        //     console.log('SO LONG');
        //     throw new Error('hwy long' + segs.length);
        // }
        if (pathId == null) pathId = nextPathId++;
        link.pathId = pathId;
        const nhist = hist.concat([at]);
        link.left.forEach((id) => follow(id, pathId, nhist));
        link.right.forEach((id) => follow(id, pathId, nhist));
    };

    segLinks.forEach((sl, i) => {
        if (sl.pathId != null) return;
        follow(i);
    });

    // console.log('got some paths');
    // console.log(segLinks, byEndPoint);

    return segLinks;
};
