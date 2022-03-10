import { Coord, LineSegment, Segment } from '../../types';
import { zeroToTwoPi } from '../clipPath';
import { angleBetween } from '../findNextSegments';
import { angleTo, push } from '../getMirrorTransforms';

/*

ok, so I'm actually thinking about:
- showing the code on the side
- mouseover `angleTo` and it draws the appropriate stuff on the screen
    - so having like an annotation on `angleTo` that knows how to draw
      something useful from the args + return value

so, I don't actually need to step?
I'm just tracing? I think?
yeah, it'll still require a transform.


so something like
const to = angleTo(prev, seg.to)
becomes something like
let _v1 = trace(prev, 1)
let _v2 = trace(seg, 2)
let _v3 = trace(_v2.to, 3)
let _v4 = trace(angleTo, 4)
// This is a fn call, so you get the return value, the fn, and the args
// if the fn has a `.visualize`, call that instead of the default debugger
let _v5 = trace(angleTo(_v1, _v3), _v4, [_v1, _v3])
const t0 = _v5

*/

// @trace
export const insetLineLine = (
    prev: Coord,
    seg: LineSegment,
    next: LineSegment,
    amount: number,
): Array<Segment> => {
    const t0 = angleTo(prev, seg.to);
    const t1 = angleTo(seg.to, next.to);
    const between = zeroToTwoPi(angleBetween(t0, t1, true));
    // visual.log(
    //     {type: 'angle', theta: t0, at: seg.to, name: 't0'},
    //     {type: 'angle', theta: t1, at: seg.to, name: 't0'},
    //     {type: 'angle-diff', theta: between, at: seg.to, name: 'between'},
    // )
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
        const t = (between - Math.PI) / 2;
        const dist = amount / Math.cos(Math.PI / 2 - t);
        return [{ type: 'Line', to: push(seg.to, t0 + t, dist) }];
    }
};
