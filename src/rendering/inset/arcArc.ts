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

export const insetArcArc = (
    prev: Coord,
    seg: ArcSegment,
    next: ArcSegment,
    amount: number,
): Array<Segment> => {
    const t0 = angleTo(seg.center, seg.to) + Math.PI;
    const t1 = angleTo(next.center, seg.to) - Math.PI;
    const between = zeroToTwoPi(angleBetween(t0, t1, true));

    const r0 = dist(seg.center, seg.to);
    const r1 = dist(next.center, seg.to);
    const r0a = r0 + amount * (seg.clockwise ? -1 : 1);
    const r1a = r1 + amount * (next.clockwise ? -1 : 1);

    const contract = amount < 0 ? between > Math.PI : between < Math.PI;
    if (contract) {
        return [
            { ...seg, to: push(seg.center, t0 - Math.PI, r0a) },
            { type: 'Line', to: seg.to },
            { type: 'Line', to: push(next.center, t1 + Math.PI, r1a) },
        ];
    }
    return [seg];
};
