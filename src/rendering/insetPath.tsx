import { Coord, Path, Segment } from '../types';
import { isClockwise, reversePath, totalAngle } from './pathToPoints';
import { angleTo } from './getMirrorTransforms';
import { closeEnoughAngle, epsilon } from './intersect';
import { coordsEqual } from './pathsAreIdentical';
import { clipTwo, closeEnough, HitLocation } from './clipPath';
import { isLargeArc } from '../editor/RenderPendingPath';
import { Hit } from './pruneInsetPath';
import { insetSegment } from './insetSegment';

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

export const hasReversed = (
    one: Segment,
    onep: Coord,
    two: Segment,
    twop: Coord,
) => {
    if (
        one.type === 'Arc' &&
        two.type === 'Arc' &&
        isLargeArc(two, twop) !== isLargeArc(one, onep)
    ) {
        return true;
    }

    if (
        one.type === 'Line' &&
        two.type === 'Line' &&
        !closeEnough(angleTo(onep, one.to), angleTo(twop, two.to))
    ) {
        return true;
    }

    return false;
};

export const getToFromMaybeArray = (segments: Array<Segment> | Segment) => {
    if (Array.isArray(segments)) {
        return segments[segments.length - 1].to;
    }
    return segments.to;
};

export const differentDirection = (
    oldPrev: Coord,
    old: Segment,
    newPrev: Coord,
    seg: Segment,
): boolean => {
    if (old.type === 'Line' && seg.type === 'Line') {
        return !closeEnoughAngle(
            angleTo(oldPrev, old.to),
            angleTo(newPrev, seg.to),
        );
    }
    // TODO handle arcs
    return false;
};

export const insetSegments = (
    segments: Array<Segment>,
    inset: number,
): [Array<Segment>, Array<Coord>] => {
    if (closeEnough(inset, 0)) {
        return [segments, []];
    }

    if (!isClockwise(segments)) {
        segments = reversePath(segments);
    }

    const simplified = simplifyPath(segments);

    const insets = simplified.map((seg, i) => {
        const prev = simplified[i === 0 ? simplified.length - 1 : i - 1].to;
        const next = simplified[i === simplified.length - 1 ? 0 : i + 1];
        // ok, so ... this needs to maybe return two segments.
        // if we need to bridge the new gap
        return insetSegment(prev, seg, next, inset, true);
    });

    return [insets.flat(), simplified.map((s) => s.to)];
};

export const insetSegmentsBeta = (segments: Array<Segment>, inset: number) => {
    return insetSegments(segments, inset)[0];
};

// hmmmmmmmmmmmm
// I think maybe
// I need to convert to directed primitives or something
// or, just [prev, segment] pairs.

// /**
//  * This insets the segments of a path, without doing any validation.
//  * That comes later, with `pruneInsetPath`
//  *
//  * Ok well, it does filter out now-illegal segments. So there's that.
//  */
// export const insetSegments = (segments: Array<Segment>, inset: number) => {
//     // All paths are clockwise, it just makes this easier
//     if (!isClockwise(segments)) {
//         segments = reversePath(segments);
//     }

//     const simplified = simplifyPath(segments);

//     const insets = simplified.map((seg, i) => {
//         const prev = simplified[i === 0 ? simplified.length - 1 : i - 1].to;
//         const next = simplified[i === simplified.length - 1 ? 0 : i + 1];
//         // ok, so ... this needs to maybe return two segments.
//         // if we need to bridge the new gap
//         return insetSegment(prev, seg, next, inset);
//     });

//     let allBad = true;

//     // ok lets go ahead and filter here
//     segments = insets
//         .filter((seg, i) => {
//             if (Array.isArray(seg)) {
//                 allBad = false;
//                 return true; // BAIL: TODO, figure this out
//             }
//             const pi = i === 0 ? simplified.length - 1 : i - 1;
//             // const prev = Array.isArray(insets[pi])
//             // ? insets[pi].slice(-1)[0].to : insets[pi].to
//             // const old = simplified[i]
//             // const oldPrev = simplified[pi].to
//             if (
//                 !differentDirection(
//                     getToFromMaybeArray(insets[pi]),
//                     seg,
//                     simplified[pi].to,
//                     simplified[i],
//                 )
//             ) {
//                 allBad = false;
//                 return true;
//             }
//             // return true;
//             return false;
//         })
//         .map((seg) => (Array.isArray(seg) ? seg : [seg]))
//         .flat();

//     if (allBad) {
//         return [];
//     }
//     // let bad: Array<number> = [];
//     // segments.forEach((seg, i) => {
//     //     if (
//     //         hasReversed(
//     //             seg,
//     //             segments[i === 0 ? segments.length - 1 : i - 1].to,
//     //             simplified[i],
//     //             simplified[i === 0 ? simplified.length - 1 : i - 1].to,
//     //         )
//     //     ) {
//     //         bad.push(i);
//     //     }
//     // });

//     return segments;
// };

// export const insetPath = (path: Path, inset: number): Path | null => {
//     const segments = insetSegments(path.segments, inset);
//     if (segments.length === 0) {
//         return null;
//     }
//     return { ...path, segments, origin: segments[segments.length - 1].to };
// };

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
