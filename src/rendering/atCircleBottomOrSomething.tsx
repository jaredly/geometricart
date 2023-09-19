import { angleBetween } from './findNextSegments';
import { push } from './getMirrorTransforms';
import { Circle } from './intersect';
import { coordsEqual } from './pathsAreIdentical';
import { Coord } from '../types';
import { closeEnough } from './epsilonToZero';

// Also returns true if we're at the top or bottom tangent and not on the top endpoint

/*

Ok I'm not sure why we don't want to be doing
wait, ohhhh so the top of the circle is ALSO ignorable
because it's a double-touch.
very interesting.

*/

export const atCircleBottomOrSomething = (coord: Coord, seg: Circle) => {
    const atX = closeEnough(coord.x, seg.center.x);

    if (!seg.limit) {
        return atX;
    }

    // If we're at the nadir, always ignore.
    if (atX && coord.y > seg.center.y) {
        return true;
    }

    if (atX) {
        // if we're at the summit, ignore only if we're not also at an endpoint
        return !(
            closeEnough(seg.limit[0], -Math.PI / 2) ||
            closeEnough(seg.limit[1], -Math.PI / 2)
        );
    }

    // Ok, given that we're not at the top or bottom
    // if limit[0] is /less/ than PI away from the summit, limit[0] is a "bottom" point
    // if limit[1] is /less/ than PI past the summit, it is a "bottom" point
    if (
        angleBetween(seg.limit[0], -Math.PI / 2, true) < Math.PI &&
        coordsEqual(push(seg.center, seg.limit[0], seg.radius), coord)
    ) {
        return true;
    }

    if (
        angleBetween(-Math.PI / 2, seg.limit[1], true) < Math.PI &&
        coordsEqual(push(seg.center, seg.limit[1], seg.radius), coord)
    ) {
        return true;
    }

    return false;

    // // // the first limit as at the summit of the circle
    // // if (closeEnough(seg.limit[0], -Math.PI / 2) && atX && coord.y < seg.center.y) {
    // //     return false
    // // }
    // // Ok new plan.
    // // if
    // // if (closeEnough(seg.limit[0], Math.PI / 2)) {
    // //     // first limit is at the nadir of the circle, ignore if coord is the nadir.
    // // }
    // // Ok at the very start, we can know just from the limits whether we're 'circle top' or 'circle bottom'
    // // and then if not, we know we're line-like
    // // The "bottom" of the circle is between our two limits, so neither end is at the bottom
    // // and we've already established that we're not at the nadir.
    // if (isAngleBetween(seg.limit[0], Math.PI / 2, seg.limit[1], true)) {
    //     return false
    // }
    // // TODO: Cache this, this is super inefficient
    // const p1 = push(seg.center, seg.radius, seg.limit[0])
    // const p2 = push(seg.center, seg.radius, seg.limit[1])
    // // the first limit as at the summit of the circle, so the other limit is a "bottom" point
    // if (closeEnough(seg.limit[0], -Math.PI / 2)) {
    //     return coordsEqual(coord, p2)
    // }
    // // The "top" of the circle is between our two limits, so we should ignore both endpoints
    // if (isAngleBetween(seg.limit[0], -Math.PI / 2, seg.limit[1], true)) {
    // }
    // // So our options are:
    // // - we're both on the /same side/ of the circle, so we approximate a line
    // // - we're on /opposite sides/ of the circle, in which case either both ends or neither are "on the bottom"
    // // - if on as the the top or bottom-most point, it counts as being on the "same side" as the other one.
    // // - we can test sideliness by just looking at the x coord of the points. yesss.
    // const p1centered = closeEnough(p1.x, seg.center.x)
    // const p2centered = closeEnough(p2.x, seg.center.x)
    // if (p1centered) {
    // } else if (p2centered) {
    // } else {
    //     const p1left = p1.x < seg.center.x
    //     const p2left = p2.x < seg.center.x
    //     if (p1left === p2left) {
    //         // the "bottom" is the one with the greater y value
    //     }
    // }
    // const p1Side =
    // if no limit, then just "are we tangent to the bottom?"
    // return closeEnough(coord.x, seg.center.x) && coord.y > seg.center.y
};
