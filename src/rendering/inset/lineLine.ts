import { Coord, LineSegment, Segment } from '../../types';
import { zeroToTwoPi } from '../clipPath';
import { angleBetween } from '../findNextSegments';
import { angleTo, push } from '../getMirrorTransforms';

// @trace
export const insetLineLine = (
    prev: Coord,
    seg: LineSegment,
    next: LineSegment,
    amount: number,
): Array<Segment> => {
    const t0 = angleTo(prev, seg.to);
    const t1 = angleTo(seg.to, next.to);
    const between = zeroToTwoPi(angleBetween(t0, t1, amount > 0));
    // It's a straight continuation!
    if (between === 0) {
        return [{ type: 'Line', to: push(seg.to, t0 + Math.PI / 2, amount) }];
    }
    // We're "contracting" a corner
    if (between < Math.PI) {
        return [
            { type: 'Line', to: push(seg.to, t0 + Math.PI / 2, amount) },
            { type: 'Line', to: seg.to },
            { type: 'Line', to: push(seg.to, t1 + Math.PI / 2, amount) },
        ];
        // We're "expanding" a corner
    } else {
        const t = (between - Math.PI) / 2;
        const dist = amount / Math.cos(Math.PI / 2 - t);
        return [{ type: 'Line', to: push(seg.to, t0 + t, dist) }];
    }
};
