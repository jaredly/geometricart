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
    const between = angleBetween(t0, t1, amount > 0);
    /**
     * If `t0` and `t1` are the same, then pushing the endpoint `t0` perpendicular
     * to the direction of the line will get us what we want!
     */
    if (between === 0) {
        return [{ type: 'Line', to: push(seg.to, t0 + Math.PI / 2, amount) }];
    }
    /**
     * If the angle `between` the first and second segments is less than 180º,
     * we're contracting a corner (either expanding with a concave corner or shrinking
     * with a convex corner). In order to deal with some edge cases that we'll see
     * later on, the correct thing to do is offset the two lines past each other,
     * and connect them through the previous shared endpoint.
     */
    if (between <= Math.PI) {
        return [
            { type: 'Line', to: push(seg.to, t0 + Math.PI / 2, amount) },
            { type: 'Line', to: seg.to },
            { type: 'Line', to: push(seg.to, t1 + Math.PI / 2, amount) },
        ];
        /**
         * Otherwise, we're "expanding" a corner, and we need to find the new shared
         * endpoint. We could do a naive offset on both segments and intersect the
         * new lines, but we can take advantage of some right-triangle math to calculate
         * the new point directly.
         */
    } else {
        const angle =
            angleBetween(t0 + Math.PI, t1, amount < 0) * (amount > 0 ? -1 : 1);
        const dist = Math.abs(amount / Math.cos(between / 2 - Math.PI));
        return [
            { type: 'Line', to: push(seg.to, t0 - Math.PI + angle / 2, dist) },
        ];
    }
};
