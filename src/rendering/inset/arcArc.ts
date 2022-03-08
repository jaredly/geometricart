import { arcToCircle } from '../../editor/findSelection';
import {
    ArcSegment,
    Attachment,
    Coord,
    LineSegment,
    Segment,
} from '../../types';
import { zeroToTwoPi } from '../clipPath';
import { angleBetween } from '../findNextSegments';
import { angleTo, dist, push } from '../getMirrorTransforms';
import { circleCircle, closeEnoughAngle } from '../intersect';

const isLeftSide = (c1: Coord, c2: Coord, hit: Coord) => {
    const t = angleTo(c1, c2);
    const th = angleTo(c1, hit);
    return angleBetween(t, th, true) < Math.PI;
};

export const insetArcArc = (
    prev: Coord,
    seg: ArcSegment,
    next: ArcSegment,
    amount: number,
): Array<Segment> => {
    const t0 = angleTo(seg.center, seg.to);
    const tan0 = t0 + (Math.PI / 2) * (seg.clockwise ? 1 : -1);
    const t1 = angleTo(next.center, seg.to);
    const tan1 = t1 - (Math.PI / 2) * (next.clockwise ? 1 : -1);
    const between = zeroToTwoPi(angleBetween(tan0, tan1, false));

    const r0 = dist(seg.center, seg.to);
    const r1 = dist(next.center, seg.to);
    const r0a = r0 + amount * (seg.clockwise ? -1 : 1);
    const r1a = r1 + amount * (next.clockwise ? -1 : 1);

    if (r0a < 0) {
        return [
            { type: 'Line', to: push(seg.center, t0, r0a) },
            { type: 'Line', to: seg.center },
            { type: 'Line', to: seg.to },
            { type: 'Line', to: push(next.center, t1, r1a) },
        ];
    }

    const contract = amount < 0 ? between > Math.PI : between < Math.PI;
    if (contract) {
        return [
            { ...seg, to: push(seg.center, t0, r0a) },
            { type: 'Line', to: seg.to },
            { type: 'Line', to: push(next.center, t1, r1a) },
        ];
    }

    const centerT = angleTo(seg.center, next.center);
    if (
        closeEnoughAngle(centerT, t0) ||
        closeEnoughAngle(centerT + Math.PI, t0)
    ) {
        // initial hit must have been tangent!
        // gotta get fancy probably
    }

    const isLeft = angleBetween(centerT, t0, true) < Math.PI;

    const ptop = push(seg.center, centerT, r0a);
    const pbottom = push(seg.center, centerT, -r0a);
    // We constrain one of the circles
    // to only be on the "valid" half.
    // Very neat.
    const hits = circleCircle(
        isLeft
            ? arcToCircle(ptop, {
                  type: 'Arc',
                  to: pbottom,
                  clockwise: true,
                  center: seg.center,
              })
            : arcToCircle(pbottom, {
                  type: 'Arc',
                  to: ptop,
                  clockwise: true,
                  center: seg.center,
              }),
        // { type: 'circle', center: seg.center, radius: r0a },
        { type: 'circle', center: next.center, radius: r1a },
    );

    if (hits.length === 1) {
        return [{ ...seg, to: hits[0] }];
    }

    return [seg];
};
