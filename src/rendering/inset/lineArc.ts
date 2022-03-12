import { arcToCircle } from '../../editor/findSelection';
import { ArcSegment, Coord, LineSegment, Segment } from '../../types';
import { zeroToTwoPi } from '../clipPath';
import { angleBetween } from '../findNextSegments';
import { angleTo, dist, push } from '../getMirrorTransforms';
import { lineCircle, lineToSlope } from '../intersect';

export const insetLineArc = (
    prev: Coord,
    seg: LineSegment,
    next: ArcSegment,
    amount: number,
): Array<Segment> => {
    const t0 = angleTo(prev, seg.to);
    const tan0 = t0 + Math.PI / 2;
    const t1 = angleTo(next.center, seg.to);
    const tan1 = t1 - (Math.PI / 2) * (next.clockwise ? 1 : -1);
    const between = zeroToTwoPi(angleBetween(t0, tan1, false));

    // const r0 = dist(seg.center, seg.to);
    // const r0a = r0 + amount * (seg.clockwise ? -1 : 1);
    const r1 = dist(next.center, seg.to);
    const r1a = r1 + amount * (next.clockwise ? -1 : 1);

    const contract = amount < 0 ? between > Math.PI : between < Math.PI;
    if (contract) {
        return [
            { ...seg, to: push(seg.to, tan0, amount) },
            { type: 'Line', to: seg.to },
            { type: 'Line', to: push(next.center, t1, r1a) },
        ];
    }

    const isLeft = angleBetween(tan0, t1, true) < Math.PI;

    const ptop = push(next.center, tan0, r1a);
    const pbottom = push(next.center, tan0, -r1a);
    // We constrain one of the circles
    // to only be on the "valid" half.
    // Very neat.
    const hits = lineCircle(
        arcToCircle(ptop, {
            type: 'Arc',
            to: pbottom,
            clockwise: isLeft,
            center: next.center,
        }),
        lineToSlope(push(prev, tan0, amount), push(seg.to, tan0, amount)),
    );

    if (hits.length === 1) {
        return [{ ...seg, to: hits[0] }];
    }

    // bail
    return [
        { ...seg, to: push(seg.to, tan0, amount) },
        { type: 'Line', to: push(next.center, t1, r1a) },
    ];
};
