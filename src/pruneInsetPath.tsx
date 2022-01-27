import { Coord, Segment } from './types';
import { isClockwise } from './pathToPoints';
import { intersections, Primitive } from './intersect';
import { coordsEqual } from './pathsAreIdentical';
import { pathToPrimitives } from './findSelection';
import {
    anglesEqual,
    Clippable,
    getAngle,
    getBackAngle,
    HitLocation,
    isInside,
    sortHitsForPrimitive,
} from './clipPath';
import { coordKey } from './calcAllIntersections';

/*

pruneInsetPath.

So, if you have self-intersecting paths
Here's what you do.

start from an intersection. There will be two "out" directions.
start at any given "corner" (start of a line segment)

hmmm

how to traverse all of them .. and know that I have?

*/
/*

Ok I think the rule holds.

If you can follow a segment around, switching when you hit an intersection, and it's
clockwise throughout, you're good.

if you get to an intersection where switching /isn't/ better, then you bail, and drop everything.


*/

export const pruneInsetPath = (
    segments: Array<Segment>,
    debug?: boolean,
): Array<Array<Segment>> => {
    if (!segments.length) {
        return [];
    }
    const primitives = pathToPrimitives(segments);
    const hits: Array<Array<Hit>> = new Array(segments.length)
        .fill([])
        .map((m) => []);
    const allHits: Array<Hit> = [];
    for (let i = 0; i < segments.length; i++) {
        const previ =
            i === 0 ? segments[segments.length - 1].to : segments[i - 1].to;
        for (let j = i + 1; j < segments.length; j++) {
            const prevj =
                j === 0 ? segments[segments.length - 1].to : segments[j - 1].to;
            const these = intersections(primitives[i], primitives[j]);
            these.forEach((coord) => {
                const iend =
                    coordsEqual(coord, previ) ||
                    coordsEqual(coord, segments[i].to);
                const jend =
                    coordsEqual(coord, prevj) ||
                    coordsEqual(coord, segments[j].to);
                // This is just two segments meeting. no big deal.
                // Note that if we managed to get in a place where four lines met in the same place,
                // this logic would break. here's hoping.
                if (iend && jend) {
                    return;
                }
                const hit = { first: i, second: j, coord };
                hits[i].push(hit);
                hits[j].push(hit);
                allHits.push(hit);
            });
        }
    }

    if (!allHits.length) {
        if (!isClockwise(segments)) {
            return [];
        }
        return [segments];
    }

    const sorted = hits.map((hits, i) =>
        sortHitsForPrimitive(hits, primitives[i], segments[i]),
    );

    const seen: { [key: string]: true } = {};

    // const clippable: Clippable = {
    // 	segments,
    // 	primitives,
    // 	hits: sorted
    // }
    const pruned: Array<Array<Segment>> = [];

    while (allHits.length) {
        const hit = allHits.shift()!;
        const startHit = hit;
        const segment = getClockwiseExit(sorted, segments, primitives, hit);
        const startPos = {
            segment,
            intersection: sorted[segment].indexOf(hit),
        };
        const start = hit.coord;
        let path: Array<Segment> = [];

        const addSegment = (segment: Segment) => {
            const key = coordKey(segment.to);
            if (
                path.length &&
                coordsEqual(path[path.length - 1].to, segment.to)
            ) {
                // skip immediate duplicate, probably at start or end
                return;
            }
            // if (seen[key]) {
            // 	console.warn(new Error(`seen already! ${key}`));
            // 	// TODO: Change to `false` and see what renders weird.
            // 	return true;
            // }
            // seen[key] = true;
            path.push(segment);
        };

        let at = startPos;
        let bad = false;

        while (
            (!path.length || !coordsEqual(path[path.length - 1].to, start)) &&
            allHits.length
        ) {
            const next = at.intersection + 1;
            if (next >= sorted[at.segment].length) {
                addSegment(segments[at.segment]);
                // move on to the next
                at = {
                    segment: (at.segment + 1) % sorted.length,
                    intersection: -1,
                };
                continue;
            }

            const hit = sorted[at.segment][next];

            addSegment({ ...segments[at.segment], to: hit.coord });

            if (hit === startHit) {
                // success!
                break;
            }

            const segment = getClockwiseExit(sorted, segments, primitives, hit);

            if (segment === at.segment) {
                bad = true;
                break;
            }

            const hidx = allHits.indexOf(hit);
            if (hidx === -1) {
                // console.log(allHits, hit);
                throw new Error(
                    `how did I reach an intersection I've seen before? unless it's the start one again.... but I already accoutned for that`,
                );
            } else {
                // no need to traverse, we've gone the only good way.
                allHits.splice(hidx, 1);
            }

            at = { segment, intersection: sorted[segment].indexOf(hit) };
        }

        if (bad) {
            continue;
        }

        pruned.push(path);
    }

    return pruned;
};

export type Hit = { first: number; second: number; coord: Coord };

export const getClockwiseExit = (
    sorted: Array<Array<Hit>>,
    segments: Array<Segment>,
    primitives: Array<Primitive>,
    hit: Hit,
): number => {
    const firstLocation: HitLocation = {
        segment: hit.first,
        intersection: sorted[hit.first].indexOf(hit),
    };
    const secondLocation: HitLocation = {
        segment: hit.second,
        intersection: sorted[hit.second].indexOf(hit),
    };
    const clippable: Clippable<Hit> = {
        hits: sorted,
        segments,
        primitives,
    };
    const back = getBackAngle(clippable, firstLocation);
    const forward = getAngle(clippable, firstLocation);
    if (anglesEqual(back, forward)) {
        console.log(clippable, firstLocation);
        throw new Error(
            `Back and forward angles are equal. The thing you gave me is a degenerate polygon?`,
        );
    }
    const testAnble = getAngle(clippable, secondLocation);
    try {
        if (isInside(back, forward, testAnble)) {
            return hit.second;
        }
    } catch (err) {
        console.log(firstLocation, clippable, back, forward);
        throw err;
    }
    return hit.first;
};
