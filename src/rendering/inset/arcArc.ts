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
import { coordsEqual } from '../pathsAreIdentical';

// @trace
/**
 * # `insetArcArc`
 *
 * Used to calculate the inset for an arc, when the next segment is also an arc.
 *
 * If there is no intersection between the circles after adjusting radii for the inset,
 * the two arcs will be connected with a semicircle.
 */
export const insetArcArc = (
    seg: ArcSegment,
    next: ArcSegment,
    amount: number,
): Array<Segment> => {
    /**
     * First off, if these are the same circle, simply offset the point,
     * nothing fancier is required.
     */
    if (coordsEqual(seg.center, next.center)) {
        return [
            { ...seg, to: push(seg.to, angleTo(seg.center, seg.to), amount) },
        ];
    }
    /**
     * Then, calculate some angles, radii, and tangent angles.
     */
    const t0 = angleTo(seg.center, seg.to);
    const tan0 = t0 + (Math.PI / 2) * (seg.clockwise ? 1 : -1);
    const t1 = angleTo(next.center, seg.to);
    const tan1 = t1 - (Math.PI / 2) * (next.clockwise ? 1 : -1);
    const between = zeroToTwoPi(angleBetween(tan0, tan1, false));
    const r0 = dist(seg.center, seg.to);
    const r1 = dist(next.center, seg.to);
    const r0a = r0 + amount * (seg.clockwise ? -1 : 1);
    const r1a = r1 + amount * (next.clockwise ? -1 : 1);
    /**
     * Next: Are we "contracting" this corner? If so, it's easy to do.
     */
    const contract = amount < 0 ? between > Math.PI : between < Math.PI;
    if (contract) {
        return [
            { ...seg, to: push(seg.center, t0, r0a) },
            { type: 'Line', to: seg.to },
            { type: 'Line', to: push(next.center, t1, r1a) },
        ];
    }
    /**
     * Now we need to find the new point of intersection between the newly
     * expanded/contracted circles. In order to save us work later, we
     * constrain one of the circles to be a semicircle -- just on the half
     * that had the initial collision. This way, we remove the possibility
     * of there being two points of intersection that we'd have to distinguish
     * between.
     */
    const centerT = angleTo(seg.center, next.center);
    const isLeft = angleBetween(centerT, t0, true) < Math.PI;
    const ptop = push(seg.center, centerT, r0a);
    const pbottom = push(seg.center, centerT, -r0a);
    const hits = circleCircle(
        arcToCircle(ptop, {
            type: 'Arc',
            to: pbottom,
            clockwise: isLeft,
            center: seg.center,
        }),
        { type: 'circle', center: next.center, radius: r1a },
    );
    /**
     * If there's a hit, that's the end of it! We've successfully expanded the corner.
     */
    if (hits.length === 1) {
        return [{ ...seg, to: hits[0] }];
    }
    /**
     * Otherwise, the circles are no longer intersecting, so we need to connect up the
     * two circles somehow.
     */
    const centerD = dist(seg.center, next.center);
    let clockwise, sto, nto;
    // One is contained within the other!
    if (centerD < r0a || centerD < r1a) {
        const direction = r0a < r1a ? centerT + Math.PI : centerT;
        clockwise = r0a < r1a ? !seg.clockwise : seg.clockwise;
        sto = push(seg.center, direction, r0a);
        nto = push(next.center, direction, r1a);
    } else {
        // They're separate
        sto = push(seg.center, centerT, r0a);
        nto = push(next.center, centerT + Math.PI, r1a);
        clockwise = !seg.clockwise;
    }
    return [
        { ...seg, to: sto },
        {
            type: 'Arc',
            clockwise,
            center: midPoint(sto, nto),
            to: nto,
        },
    ];
};

export const midPoint = (c1: Coord, c2: Coord) => {
    return { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };
};
