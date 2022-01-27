import { coordKey } from './calcAllIntersections';
import { Coord, Segment } from './types';

/*

Ok, let's get serious here.

NOT ALLOWED:
- BACKTRACKING. What does that mean?
    Going backwards over the same path.
    How do we tell, with arcs?
- going TO a point that we've already covered, if it's not the origin.


    btw I can probably ditch pendingsegment...

*/

export const segmentKey = (prev: Coord, segment: Segment) =>
    coordKey(prev) +
    ` ${segment.type} ` +
    (segment.type === 'Line'
        ? ''
        : `via ${coordKey(segment.center)}${segment.clockwise ? 'C' : 'A'}`) +
    ' to ' +
    coordKey(segment.to);

export const segmentKeyReverse = (prev: Coord, segment: Segment) =>
    segment.type === 'Line'
        ? segmentKey(segment.to, { type: 'Line', to: prev })
        : segmentKey(segment.to, {
              type: 'Arc',
              center: segment.center,
              clockwise: !segment.clockwise,
              to: prev,
          });
