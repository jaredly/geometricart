import { Coord, Path, Segment } from './types';
import { isClockwise, reversePath, totalAngle } from './CanvasRender';
import { angleTo, dist, push } from './getMirrorTransforms';
import {
    circleCircle,
    epsilon,
    intersections,
    lineCircle,
    lineLine,
    lineToSlope,
    Primitive,
} from './intersect';
import { angleBetween } from './findNextSegments';
import { coordsEqual } from './pathsAreIdentical';
import { pathToPrimitives } from './findSelection';
import {
    anglesEqual,
    Clippable,
    clipTwo,
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

export type Hit = { first: number; second: number; coord: Coord };

export const pruneInsetPath = (
    segments: Array<Segment>,
): Array<Array<Segment>> => {
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

type Pos = HitLocation;

export const segmentStart = (segments: Array<Segment>, idx: number) =>
    idx === 0 ? segments[segments.length - 1].to : segments[idx - 1].to;

export const notMe = (idx: number, hit: Hit) => {
    return hit.first === idx ? hit.second : hit.first;
};
export const nextForPos = (
    idx: number,
    hit: Hit,
    sorted: Array<Array<Hit>>,
): Pos => {
    const hitAt = sorted[idx].indexOf(hit);
    if (hitAt < sorted[idx].length - 1) {
        return { segment: idx, intersection: hitAt + 1 };
    } else {
        return { intersection: -1, segment: (idx + 1) % sorted.length };
    }
};

export const coordForPos = (
    pos: Pos,
    sorted: Array<Array<Hit>>,
    segments: Array<Segment>,
) => {
    if (pos.intersection !== -1) {
        return sorted[pos.segment][pos.intersection].coord;
    }
    let prev = pos.segment === 0 ? segments.length - 1 : pos.segment - 1;
    return segments[prev].to;
};

// export const travelPath = (
//     sorted: Array<Array<Hit>>,
//     segments: Array<Segment>,
//     pos: Pos,
//     seen: { [key: string]: true },
// ) => {
//     // ok here we go.
//     // keep track of accumulated angle
//     // and all the "sub-segments" you've traveersed, so we can mark them as "done".
//     // because we'll need to check all of the subsegments one by one.
//     let first = segmentStart(segments, pos.idx);
//     let prev = first;
//     let pprev = first;
//     let result: Array<Segment> = [];
//     const seenHits: Array<Hit> = [];
//     while (
//         !result.length ||
//         !coordsEqual(result[result.length - 1].to, first)
//     ) {
//         // so, the seg is (the current one)
//         // and ...
//         // where are we?
//         // We're at a cross-road, looking to the future.

//         // ok, so we want a list of options.
//         // I guess, there will only be one other option.
//         // so the "main" option vs the cross-cutting one.
//         // and if the cross-cutting one is ...
//         // /tighter/ than the main one, then we switch to it.

// 		// if (pos.hit === -1)

//         let alternative =
//             pos.hit === -1
//                 ? null
//                 : nextForPos(
//                       notMe(pos.idx, sorted[pos.idx][pos.hit]),
//                       sorted[pos.idx][pos.hit],
//                       sorted,
//                   );

//         let seg = segments[pos.idx];
//         let nextHit = sorted[pos.idx][pos.hit + 1];
//         let next: Coord;
//         let nextPos: Pos;
//         if (!nextHit) {
//             next = seg.to;
//             nextPos = { idx: (pos.idx + 1) % segments.length, hit: -1 };
//         } else {
//             next = nextHit.coord;
//             nextHit.coord;
//             nextPos = { idx: pos.idx, hit: pos.hit + 1 };
//         }

//         if (alternative) {
//             let forward = getAngle(sorted, pos);
//             let branch = getAngle(sorted, alternative);
//             // todo this might violate assumptions about not having a hit at the end of a segment
//             let back = getBackAngle(sorted, pos);

//             // switch it up!
//             if (isInside(back, forward, branch)) {
//                 nextPos = alternative;
//                 next = coordForPos(nextPos, sorted, segments);
//             }
//         }

//         // If we haven't moved, don't muck
//         if (!coordsEqual(next, prev)) {
//             result.push({ ...seg, to: next });
//             pprev = prev;
//             prev = next;
//         }
//         pos = nextPos;
//     }
//     return result;
// };

export const insetPath = (path: Path, inset: number) => {
    // All paths are clockwise, it just makes this easier
    if (!isClockwise(path.segments)) {
        path = { ...path, segments: reversePath(path.segments) };
    }
    // console.log('yes', path)
    const simplified = simplifyPath(path.segments);

    const segments = simplified.map((seg, i) => {
        const prev = i === 0 ? path.origin : simplified[i - 1].to;
        const next = simplified[i === simplified.length - 1 ? 0 : i + 1];
        return insetSegment(prev, seg, next, inset);
    });

    // Ok, so once we've done the inset, how do we check for self intersections?

    // we've gone inside out!
    // if (!isClockwise(segments)) {
    //     return null;
    // }

    return { ...path, segments, origin: segments[segments.length - 1].to };
};

export const insetSegment = (
    prev: Coord,
    seg: Segment,
    next: Segment,
    amount: number,
): Segment => {
    if (seg.type === 'Line') {
        const t = angleTo(prev, seg.to);
        const p0 = push(prev, t + Math.PI / 2, amount);
        const p1 = push(seg.to, t + Math.PI / 2, amount);
        const slope1 = lineToSlope(p0, p1);

        if (next.type === 'Line') {
            const t1 = angleTo(seg.to, next.to);
            const p2 = push(seg.to, t1 + Math.PI / 2, amount);
            const p3 = push(next.to, t1 + Math.PI / 2, amount);
            const slope2 = lineToSlope(p2, p3);
            const intersection = lineLine(slope1, slope2);
            if (!intersection) {
                // Assume they're the same line, so the pushed one is correct
                return { ...seg, to: p2 };
            }
            return { ...seg, to: intersection };
        } else {
            const radius =
                dist(next.center, next.to) + amount * (next.clockwise ? -1 : 1);
            const angle = angleTo(next.center, next.to);
            const intersection = lineCircle(
                { center: next.center, radius: radius, type: 'circle' },
                slope1,
            );
            const dists = intersection.map((pos) => dist(pos, p1));
            if (dists.length > 1) {
                return {
                    ...seg,
                    to: dists[0] > dists[1] ? intersection[1] : intersection[0],
                };
            }
            return intersection.length ? { ...seg, to: intersection[0] } : seg;
        }
    }
    if (seg.type === 'Arc') {
        const radius =
            dist(seg.center, seg.to) + amount * (seg.clockwise ? -1 : 1);
        const angle = angleTo(seg.center, seg.to);

        if (next.type === 'Line') {
            const t1 = angleTo(seg.to, next.to);
            const p2 = push(seg.to, t1 + Math.PI / 2, amount);
            const p3 = push(next.to, t1 + Math.PI / 2, amount);
            const slope2 = lineToSlope(p2, p3);
            const intersection = lineCircle(
                { center: seg.center, radius: radius, type: 'circle' },
                slope2,
            );
            const dists = intersection.map((pos) => dist(pos, p2));
            if (dists.length > 1) {
                return {
                    ...seg,
                    to: dists[0] > dists[1] ? intersection[1] : intersection[0],
                };
            }
            return intersection.length ? { ...seg, to: intersection[0] } : seg;
        } else {
            const radius2 =
                dist(next.center, next.to) + amount * (next.clockwise ? -1 : 1);
            // const angle2 = angleTo(next.center, next.to);
            const intersection = circleCircle(
                { center: next.center, radius: radius2, type: 'circle' },
                { center: seg.center, radius: radius, type: 'circle' },
            );
            // if (intersection.length === 1 && 1 == 0) {
            //     return { ...seg, to: intersection[0] };
            // }
            if (intersection.length < 2) {
                const newTo = push(seg.center, angle, radius);
                return { ...seg, to: newTo };
            }
            const angle0 = angleTo(seg.center, prev);
            const angles = intersection.map((pos) =>
                angleBetween(angle0, angleTo(seg.center, pos), seg.clockwise),
            );
            // We want the first one we run into, going around the original circle.
            if (angles[0] < angles[1]) {
                return { ...seg, to: intersection[0] };
            }
            return { ...seg, to: intersection[1] };
        }
    }
    throw new Error(`nope`);
};

export const areContiguous = (prev: Coord, one: Segment, two: Segment) => {
    if (one.type !== two.type) {
        return false;
    }
    if (one.type === 'Line' && two.type === 'Line') {
        return (
            Math.abs(angleTo(prev, one.to) - angleTo(one.to, two.to)) < epsilon
        );
    }
    if (one.type === 'Arc' && two.type === 'Arc') {
        return (
            one.clockwise === two.clockwise &&
            coordsEqual(one.center, two.center)
        );
    }
    return false;
};

export const simplifyPath = (segments: Array<Segment>): Array<Segment> => {
    let result: Array<Segment> = [];
    let prev = segments[segments.length - 1].to;
    segments.forEach((segment, i) => {
        if (!result.length) {
            result.push(segment);
            return;
        }
        if (areContiguous(prev, result[result.length - 1], segment)) {
            result[result.length - 1] = {
                ...result[result.length - 1],
                to: segment.to,
            };
        } else {
            prev = result[result.length - 1].to;
            result.push(segment);
        }
    });
    // Ok so the edge case is, what if the first & last are contiguous?
    // we can't muck with the origin, so we're stuck with it. Which is a little weird.
    // should I just drop the separate keeping of an `origin`? Like once we have segments,
    // do we need it at all?
    // I guess we just need to know whether the path is "closed"?
    // oh yeah, if it's not closed, then we do need an origin.
    // ok.
    return result;
};
