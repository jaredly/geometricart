import { Coord, LineSegment, Segment } from '../../types';
import { zeroToTwoPi } from '../clipPath';
import { angleBetween } from '../findNextSegments';
import { angleTo, push } from '../getMirrorTransforms';

export const insetLineLine = (
    prev: Coord,
    seg: LineSegment,
    next: LineSegment,
    amount: number,
): Array<Segment> => {
    const t0 = angleTo(prev, seg.to);
    const t1 = angleTo(seg.to, next.to);
    const between = zeroToTwoPi(angleBetween(t0, t1, true));
    if (!between) {
        return [{ type: 'Line', to: push(seg.to, t0 + Math.PI / 2, amount) }];
    }
    // Contract
    if (amount > 0 ? between < Math.PI : between > Math.PI) {
        return [
            { type: 'Line', to: push(seg.to, t0 + Math.PI / 2, amount) },
            { type: 'Line', to: seg.to },
            { type: 'Line', to: push(seg.to, t1 + Math.PI / 2, amount) },
        ];
    } else {
        if (amount < 0) {
            const t = (Math.PI - between) / 2;
            const dist = -amount / Math.cos(Math.PI / 2 - t);
            return [{ type: 'Line', to: push(seg.to, t0 - t, dist) }];
        } else {
            // Expand, find the intersection
            const t = (between - Math.PI) / 2;
            const tn = Math.PI / 2 - t;
            const dist = amount / Math.cos(tn);
            return [{ type: 'Line', to: push(seg.to, t0 + t, dist) }];
        }
    }
};
