import {Coord, Segment} from '../types';
import {angleTo} from './getMirrorTransforms';
import {closeEnoughAngle} from './epsilonToZero';
import {coordsEqual} from './pathsAreIdentical';

export const simplifyPath = (segments: Array<Segment>): Array<Segment> => {
    let result: Array<Segment> = [];
    let prev = segments[segments.length - 1].to;
    segments.forEach((segment, i) => {
        if (!result.length) {
            result.push(segment);
            return;
        }
        if (areContiguous(prev, result[result.length - 1], segment)) {
            result[result.length - 1] = {
                ...result[result.length - 1],
                to: segment.to,
            };
        } else {
            prev = result[result.length - 1].to;
            result.push(segment);
        }
    });
    // Ok so the edge case is, what if the first & last are contiguous?
    // we can't muck with the origin, so we're stuck with it. Which is a little weird.
    // should I just drop the separate keeping of an `origin`? Like once we have segments,
    // do we need it at all?
    // I guess we just need to know whether the path is "closed"?
    // oh yeah, if it's not closed, then we do need an origin.
    // ok.
    return result;
};

const areContiguous = (prev: Coord, one: Segment, two: Segment) => {
    if (one.type !== two.type) {
        return false;
    }
    if (one.type === 'Line' && two.type === 'Line') {
        return closeEnoughAngle(angleTo(prev, one.to), angleTo(one.to, two.to));
    }
    if (one.type === 'Arc' && two.type === 'Arc') {
        return one.clockwise === two.clockwise && coordsEqual(one.center, two.center);
    }
    return false;
};
