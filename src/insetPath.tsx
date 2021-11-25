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
} from './intersect';
import { angleBetween } from './findNextSegments';
import { coordsEqual } from './pathsAreIdentical';
import { pathToPrimitives } from './findSelection';
import { sortHitsForPrimitive } from './clipPath';

/*

pruneInsetPath.

So, if you have self-intersecting paths
Here's what you do.

start from an intersection. There will be two "out" directions.
start at any given "corner" (start of a line segment)

hmmm

how to traverse all of them .. and know that I have?

*/

export type Hit = { first: number; second: number; coord: Coord };

export const pruneInsetPath = (segments: Array<Segment>) => {
    const primitives = pathToPrimitives(segments);
    const hits: Array<Array<Hit>> = [];
    let anyHits = false;
    for (let i = 0; i < segments.length; i++) {
        const previ =
            i === 0 ? segments[segments.length - 1].to : segments[i - 1].to;
        hits.push([]);
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
                anyHits = true;
                const hit = { first: i, second: j, coord };
                hits[i].push(hit);
                hits[j].push(hit);
            });
        }
    }

    if (!anyHits) {
        return [segments];
    }

    const sorted = hits.map((hits, i) =>
        sortHitsForPrimitive(hits, primitives[i], segments[i]),
    );

    const seen: { [key: string]: true } = {};

    travelPath(sorted, segments, { idx: 0, hit: -1 }, seen);
};

type Pos = { idx: number; hit: number };

export const segmentStart = (segments: Array<Segment>, idx: number) =>
    idx === 0 ? segments[segments.length - 1].to : segments[idx - 1].to;

export const travelPath = (
    sorted: Array<Array<Hit>>,
    segments: Array<Segment>,
    pos: Pos,
    seen: { [key: string]: true },
) => {
    // ok here we go.
    // keep track of accumulated angle
    // and all the "sub-segments" you've traveersed, so we can mark them as "done".
    // because we'll need to check all of the subsegments one by one.
    let first = segmentStart(segments, pos.idx);
    let prev = first;
    let pprev = first;
    let result: Array<Segment> = [];
    while (
        !result.length ||
        !coordsEqual(result[result.length - 1].to, first)
    ) {
        // so, the seg is (the current one)
        // and ...
        // where are we?
        // We're at a cross-road, looking to the future.

        let seg = segments[pos.idx];
        let hit = sorted[pos.idx][pos.hit + 1];
        let next: Coord;
        let nextPos: Pos;
        if (!hit) {
            next = seg.to;
            nextPos = { idx: (pos.idx + 1) % segments.length, hit: -1 };
        } else {
            next = hit.coord;
            hit.coord;
            nextPos = { idx: pos.idx, hit: pos.hit + 1 };
        }
        // If we haven't moved, don't muck
        if (!coordsEqual(next, prev)) {
            result.push({ ...seg, to: next });
            pprev = prev;
            prev = next;
        }
        pos = nextPos;
    }
    return result;
};

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

    const angle = totalAngle(segments);

    // We have a twist!
    // but that's no the only possible self-intersection.
    // If we have a concave shape, it's easy to self-intersect.
    // So what we need to do is ... find self-intersections, and then
    // do self-clipping?
    // Basically do the same kind of clip walk, but it's just on one path.
    // And we'd have to do the same deal where we look at all points, to see
    // which ones are in a still-clockwise section of things.
    if (Math.abs(angle) < epsilon * 2) {
        return null;
    }

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
