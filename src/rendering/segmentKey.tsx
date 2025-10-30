import {coordKey} from './coordKey';
import {Coord, Segment} from '../types';
import {epsilon} from './epsilonToZero';
import {reverseSegment} from './pathsAreIdentical';

/*

Ok, let's get serious here.

NOT ALLOWED:
- BACKTRACKING. What does that mean?
    Going backwards over the same path.
    How do we tell, with arcs?
- going TO a point that we've already covered, if it's not the origin.


    btw I can probably ditch pendingsegment...

*/

export const maybeReverseSegment = (prev: Coord, segment: Segment) => {
    if (shouldReverseSegment(prev, segment)) {
        return {prev: segment.to, segment: reverseSegment(prev, segment)};
    }
    return {prev, segment};
};

const shouldReverseSegment = (prev: Coord, segment: Segment) => {
    const dx = prev.x - segment.to.x;
    const dy = prev.y - segment.to.y;
    return Math.abs(dx) < epsilon ? dy > 0 : dx > 0;
};

const orderedSegmentKey = (prev: Coord, segment: Segment) => {
    return shouldReverseSegment(prev, segment)
        ? segmentKey(prev, segment)
        : segmentKeyReverse(prev, segment);
};

const segmentKeyInner = (segment: Segment) =>
    ` ${segment.type} ` +
    (segment.type === 'Line'
        ? ''
        : segment.type === 'Quad'
          ? '`ctrl ' + coordKey(segment.control)
          : `via ${coordKey(segment.center)}${segment.clockwise ? 'C' : 'A'}`) +
    ' to ' +
    coordKey(segment.to);

export const segmentKey = (prev: Coord, segment: Segment) =>
    coordKey(prev) + segmentKeyInner(segment);

export const segmentKeyReverse = (prev: Coord, segment: Segment) =>
    segment.type === 'Line'
        ? segmentKey(segment.to, {type: 'Line', to: prev})
        : segment.type === 'Quad'
          ? segmentKey(segment.to, {...segment, to: prev})
          : segmentKey(segment.to, {
                type: 'Arc',
                center: segment.center,
                clockwise: !segment.clockwise,
                to: prev,
            });
