import { Coord, Path, Segment } from './types';
import { isClockwise, reversePath, totalAngle } from './CanvasRender';
import { angleTo, dist, push } from './getMirrorTransforms';
import {
    circleCircle,
    epsilon,
    lineCircle,
    lineLine,
    lineToSlope,
} from './intersect';
import { angleBetween } from './findNextSegments';
import { coordsEqual } from './pathsAreIdentical';

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
