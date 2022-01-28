import { ArcSegment, Coord, LineSegment, Segment } from './types';
import { angleTo, dist, push } from './getMirrorTransforms';
import {
    circleCircle,
    closeEnoughAngle,
    lineCircle,
    lineLine,
    lineToSlope,
} from './intersect';
import { angleBetween } from './findNextSegments';

export const insetLineLine = (
    prev: Coord,
    seg: LineSegment,
    next: LineSegment,
    amount: number,
    onlyExtend?: boolean,
): Segment | Array<Segment> => {
    const t = angleTo(prev, seg.to);
    const p0 = push(prev, t + Math.PI / 2, amount);
    const p1 = push(seg.to, t + Math.PI / 2, amount);
    const slope1 = lineToSlope(p0, p1);
    const t1 = angleTo(seg.to, next.to);
    const p2 = push(seg.to, t1 + Math.PI / 2, amount);
    const p3 = push(next.to, t1 + Math.PI / 2, amount);
    const slope2 = lineToSlope(p2, p3);
    const intersection = lineLine(slope1, slope2);
    if (!intersection) {
        // Assume they're the same line, so the pushed one is correct
        return { ...seg, to: p2 };
    }
    // if the line got shorter, we won't
    if (onlyExtend) {
        const t2 = angleTo(p0, intersection);
        if (dist(p0, intersection) < dist(p0, p1) || !closeEnoughAngle(t, t2)) {
            return [
                { type: 'Line', to: p1 },
                { type: 'Line', to: seg.to },
                { type: 'Line', to: p2 },
            ];
        }
    }
    return { ...seg, to: intersection };
};

export const insetLineArc = (
    prev: Coord,
    seg: LineSegment,
    next: ArcSegment,
    amount: number,
    onlyExtend?: boolean,
): Segment | Array<Segment> => {
    const t = angleTo(prev, seg.to);
    const p0 = push(prev, t + Math.PI / 2, amount);
    const p1 = push(seg.to, t + Math.PI / 2, amount);
    const slope1 = lineToSlope(p0, p1);
    const radius =
        dist(next.center, next.to) + amount * (next.clockwise ? -1 : 1);
    const intersection = lineCircle(
        { center: next.center, radius: radius, type: 'circle' },
        slope1,
    );
    if (!intersection.length) {
        // go to the point that's closest between the line and the circle.
        // So, intersect the line from the ircle center that's perpendicular to the line
        // const angle = angleTo(next.center, next.to);
        const perp = lineLine(
            slope1,
            lineToSlope(next.center, push(next.center, t + Math.PI / 2, 10)),
        );
        if (dist(prev, p0) > dist(p0, p1)) {
            // const radius = dist(next.center, next.to)
            return [
                { type: 'Line', to: perp! },
                {
                    type: 'Line',
                    to: push(
                        next.center,
                        t + (Math.PI / 2) * (next.clockwise ? 1 : -1),
                        radius,
                    ),
                },
            ];
        }
    }
    const dists = intersection.map((pos) => dist(pos, p1));
    const target =
        dists.length > 1
            ? dists[0] > dists[1]
                ? intersection[1]
                : intersection[0]
            : intersection.length
            ? intersection[0]
            : seg.to;
    if (
        !intersection.length ||
        (onlyExtend && dist(target, p0) < dist(prev, seg.to))
    ) {
        const p2 = push(next.center, angleTo(next.center, seg.to), radius);
        return [
            { type: 'Line', to: p1 },
            { type: 'Line', to: p2 },
        ];
    }
    if (dists.length > 1) {
        return {
            ...seg,
            to: dists[0] > dists[1] ? intersection[1] : intersection[0],
        };
    }
    return intersection.length ? { ...seg, to: intersection[0] } : seg;
};

export const insetArcLine = (
    prev: Coord,
    seg: ArcSegment,
    next: LineSegment,
    amount: number,
    onlyExtend?: boolean,
): Segment | Array<Segment> => {
    const radius = dist(seg.center, seg.to) + amount * (seg.clockwise ? -1 : 1);

    const t1 = angleTo(seg.to, next.to);
    const p2 = push(seg.to, t1 + Math.PI / 2, amount);
    const p3 = push(next.to, t1 + Math.PI / 2, amount);
    const slope2 = lineToSlope(p2, p3);
    const intersection = lineCircle(
        { center: seg.center, radius: radius, type: 'circle' },
        slope2,
    );
    const dists = intersection.map((pos) => dist(pos, p2));
    const target =
        intersection.length === 2
            ? dists[0] > dists[1]
                ? intersection[1]
                : intersection[0]
            : intersection.length
            ? intersection[0]
            : seg.to;
    if (!intersection.length) {
        const perp = lineLine(
            slope2,
            lineToSlope(seg.center, push(seg.center, t1 + Math.PI / 2, 10)),
        );
        // const radius = dist(next.center, next.to)
        if (dist(perp!, p3) > dist(p2, p3)) {
            return [
                {
                    ...seg,
                    to: push(
                        seg.center,
                        t1 + (Math.PI / 2) * (seg.clockwise ? 1 : -1),
                        radius,
                    ),
                },
                { type: 'Line', to: perp! },
            ];
        }
    }
    if (
        !intersection.length ||
        (onlyExtend && dist(next.to, target) < dist(next.to, seg.to))
    ) {
        const p1 = push(seg.center, angleTo(seg.center, seg.to), radius);
        return [
            { ...seg, to: p1 },
            { type: 'Line', to: p2 },
        ];
    }
    // if (dists.length > 1) {
    //     return {
    //         ...seg,
    //         to: dists[0] > dists[1] ? intersection[1] : intersection[0],
    //     };
    // }
    // return intersection.length ? { ...seg, to: intersection[0] } : seg;
    return { ...seg, to: target };
};

export const insetArcArc = (
    prev: Coord,
    seg: ArcSegment,
    next: ArcSegment,
    amount: number,
    onlyExtend?: boolean,
): Segment | Array<Segment> => {
    const radius = dist(seg.center, seg.to) + amount * (seg.clockwise ? -1 : 1);
    const angle = angleTo(seg.center, seg.to);

    const radius2 =
        dist(next.center, next.to) + amount * (next.clockwise ? -1 : 1);
    // const angle2 = angleTo(next.center, next.to);
    const intersection = circleCircle(
        { center: next.center, radius: radius2, type: 'circle' },
        { center: seg.center, radius: radius, type: 'circle' },
    );
    if (intersection.length === 0) {
        const newTo = push(seg.center, angle, radius);
        const otherTo = push(
            next.center,
            angleTo(next.center, seg.to),
            radius2,
        );
        const mid = angleTo(seg.center, next.center) + Math.PI / 2;
        const mp = push(seg.to, mid, amount);
        return [
            { ...seg, to: newTo },
            // {
            //     type: 'Arc',
            //     center: seg.to,
            //     clockwise: false,
            //     to: otherTo,
            // },
            { type: 'Line', to: mp },
            { type: 'Line', to: otherTo },
        ];
    }
    // They're tangent!
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
};

export const insetSegment = (
    prev: Coord,
    seg: Segment,
    next: Segment,
    amount: number,
    onlyExtend?: boolean,
): Segment | Array<Segment> => {
    if (seg.type === 'Line') {
        if (next.type === 'Line') {
            return insetLineLine(prev, seg, next, amount, onlyExtend);
        } else {
            return insetLineArc(prev, seg, next, amount, onlyExtend);
        }
    }
    if (seg.type === 'Arc') {
        if (next.type === 'Line') {
            return insetArcLine(prev, seg, next, amount, onlyExtend);
        } else {
            return insetArcArc(prev, seg, next, amount, onlyExtend);
        }
    }
    throw new Error(`nope`);
};
