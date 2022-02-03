import { ArcSegment, Coord, LineSegment, Segment } from './types';
import { angleTo, dist, push } from './getMirrorTransforms';
import {
    angleIsBetween,
    circleCircle,
    closeEnoughAngle,
    lineCircle,
    lineLine,
    lineToSlope,
} from './intersect';
import { angleBetween } from './findNextSegments';
import { anglesEqual } from './clipPath';

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
    const t = angleTo(prev, seg.to); // line angle
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
        } else {
            const p2 = push(next.center, angleTo(next.center, seg.to), radius);
            return [
                { type: 'Line', to: p1 },
                { type: 'Line', to: p2 },
            ];
        }
    }

    const perp = t + Math.PI / 2;

    const between = angleBetween(perp, angleTo(next.center, seg.to), true);
    const isLeft = between > Math.PI;
    // // const [one, two] = intersection;
    const target =
        intersection.length === 1
            ? intersection[0]
            : angleBetween(perp, angleTo(next.center, intersection[0]), true) >
                  Math.PI ===
              isLeft
            ? intersection[0]
            : intersection[1];

    const dists = intersection.map((pos) => dist(pos, p1));
    const target_ =
        dists.length > 1
            ? dists[0] > dists[1]
                ? intersection[1]
                : intersection[0]
            : intersection.length
            ? intersection[0]
            : seg.to;
    if (
        !intersection.length ||
        (onlyExtend &&
            (dist(target, p0) < dist(prev, seg.to) ||
                !closeEnoughAngle(t, angleTo(p0, target))))
    ) {
        const p2 = push(next.center, angleTo(next.center, seg.to), radius);
        return [
            { type: 'Line', to: p1 },
            { type: 'Line', to: seg.to },
            { type: 'Line', to: p2 },
        ];
    }
    // if (dists.length > 1) {
    //     return {
    //         ...seg,
    //         to: dists[0] > dists[1] ? intersection[1] : intersection[0],
    //     };
    // }
    // return { ...seg, to: intersection[0] };
    return { ...seg, to: target };
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

    const perp = t1 + Math.PI / 2;

    const between = angleBetween(perp, angleTo(seg.center, seg.to), true);
    const isLeft = between > Math.PI;
    // // const [one, two] = intersection;
    const target =
        intersection.length === 1
            ? intersection[0]
            : intersection.length === 0
            ? seg.to
            : angleBetween(perp, angleTo(seg.center, intersection[0]), true) >
                  Math.PI ===
              isLeft
            ? intersection[0]
            : intersection[1];

    const dists = intersection.map((pos) => dist(pos, p2));
    const target_ =
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
        // true ||
        !intersection.length ||
        (onlyExtend &&
            (dist(next.to, target) < dist(next.to, seg.to) ||
                !closeEnoughAngle(
                    angleTo(next.to, seg.to),
                    angleTo(p3, target),
                )))
    ) {
        const p1 = push(seg.center, angleTo(seg.center, seg.to), radius);
        return [
            { ...seg, to: p1 },
            { type: 'Line', to: seg.to },
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
            { type: 'Line', to: mp },
            { type: 'Line', to: otherTo },
        ];
    }
    // They're tangent!
    if (intersection.length < 2) {
        const newTo = push(seg.center, angle, radius);
        return { ...seg, to: newTo };
    }

    // Ok, so the original intersection was either on the "top" or "bottom" of
    // the pair of circles, looking at the prev as being on the seg and the next
    // as being on the right
    // And so we want the new intersection to match that.
    const between = angleTo(seg.center, next.center);

    const isTop = angleBetween(between, angle, true) > Math.PI;

    const firstTop =
        angleBetween(between, angleTo(seg.center, intersection[0]), true) >
        Math.PI;

    const to = isTop === firstTop ? intersection[0] : intersection[1];

    const toPrev = angleTo(seg.center, prev);
    const prevAngle = angleBetween(
        toPrev,
        angleTo(seg.center, seg.to),
        seg.clockwise,
    );
    const newAngle = angleBetween(
        toPrev,
        angleTo(seg.center, to),
        seg.clockwise,
    );
    // This is an extension! Go with it
    if (
        !onlyExtend ||
        angleBetween(
            angleTo(seg.center, seg.to),
            angleTo(seg.center, to),
            seg.clockwise,
        ) < Math.PI
    ) {
        const nextPos = push(
            next.center,
            angleTo(next.center, seg.to),
            radius2,
        );
        return [
            // I, ugh, don't know why this fixes a bug.
            // but it does.
            // it's splitting this segment into two pieces.
            // and even after this, there's what looks like
            // an extra segment at the corner here, when I
            // look at the post-splitting debug info. But
            // it's not making problems right now, so 🤷‍♂️.
            { ...seg, to: push(seg.center, angle, radius) },
            { ...seg, to },
            // { type: 'Line', to: to },
            // { type: 'Line', to: nextPos },
            // { ...next, to: nextPos },
        ];

        return {
            ...seg,
            to,
        };
    }
    // This is a contraction! Back off
    const nextPos = push(next.center, angleTo(next.center, seg.to), radius2);
    return [
        { ...seg, to: push(seg.center, angle, radius) },
        { type: 'Line', to: seg.to },
        { type: 'Line', to: nextPos },
    ];
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
