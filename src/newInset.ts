/*

Ok folks, here's my idea.

We start at a point.
Find the new inset point for the two adjacent edges.
Then we travel around the rest of the polygon, checking to see if this point is "too close" to
any of the other segments (too close = within (inset) distance).
If it is, we "push back" the point along the original segment until it is far enough away.
We keep doing that until we get back to the original point.
If at any point we need to "push forward" in order to maintain distance, we know this is
an impossible point, and we make that intersection for exclusion.

Then we move to the next point, and do it all again.

There's probably some fancy vector math that could make this more efficient 🤔 like cross-product or some such.



Anyway .... do we think this will work?

So the one thing about this, is that ... it won't .... hmmm, I guess when we get around to a point where we need to "push",
we can detach the intervening segments, to see if they form a connected component. ...



ok, so here's what we do.

We go through, do a naiive inset.

Then, we go through all of the new Points, and Mark any that are "out of bounds" (less than /inset/ away from all edges)
if a point is "too close" to multiple segments, pick the segment it's "closest" too (therefore it will be shoved back the farthest)

Then, all Unmarked points /must/ end up being used.

So, we can start with one of them, and walk it around the shape.
When we get to a marked point, we know which one it was closest to, so we re-compute this point based on the segment you're
coming from, and that closest segment (skipping over intervening segments).
Repeat, while there are unvisited unmarked points.



ugh wait, no. the signedDistance thing won't work, I don't know which line to be calculating it from.
it's possible that an invalid point would be counted as valid because it crossed over into another part of the polygon.

so yeah, that algorithm doesn't work either.

tricks up my sleeve:
- the "hasReversed" seems quite promising.
  is that a conclusive way to find things that are wrong?
  no.
  if we combine it with self-intersection (pruneInset) is that likely to work?
  maybe?

  ok so first, we find reversed paths, and remove them from the equasion.
  go back to the drawing board, just without those paths?

  so then we do an inset, which won't have reversed paths (we hope), but might still
  have self-intersections. At that point, we go through and do our "find clockwise subpaths"
  dealio, although for some reason that was failing me? idk.

So inkscape's implementation is more buggy than I will tolerate, but for reference here's the code:
MakeOffset in https://gitlab.com/inkscape/inkscape/-/blob/3825abc637ac2d3bc6ff997503b0631ac14e16b5/src/livarot/ShapeMisc.cpp is doing much of the work
and it's called from e.g. sp_selected_path_do_offset in https://gitlab.com/inkscape/inkscape/-/blob/3825abc637ac2d3bc6ff997503b0631ac14e16b5/src/path/path-offset.cpp

*/

import { isClockwise, reversePath } from './CanvasRender';
import {
    hasReversed,
    insetSegment,
    insetSegments,
    simplifyPath,
} from './insetPath';
import { Coord, Segment } from './types';

// // MUST BE CLOCKWISE. this is signed
// export const signedDistanceToSegment = (
//     prev: Coord,
//     segment: Segment,
//     point: Coord,
// ) => {};

export const insetPath = (path: Array<Segment>, inset: number) => {
    if (!isClockwise(path)) {
        path = reversePath(path);
    }

    const simplified = simplifyPath(path);

    const firstRound = insetSegments(simplified, inset);

    let bad: Array<number> = [];
    firstRound.forEach((seg, i) => {
        if (
            hasReversed(
                seg,
                firstRound[i === 0 ? firstRound.length - 1 : i - 1].to,
                simplified[i],
                simplified[i === 0 ? simplified.length - 1 : i - 1].to,
            )
        ) {
            bad.push(i);
        }
    });

    if (bad.length) {
        throw new Error(`IMPLEMENT PLEASE`);
        // ok, so here we go through and ... re-inset, but kinda fake?
        // so insetSegment takes "prev coord" (to complete the current segment),
        // and "next" to be the next segment.
        // BUT I need to abstract it, so it takes
        // prev, seg
        // and nextPrev, next
        // in case seg and next aren't adjacent.
        // I should really have a type that is "IdependentSegment" or something, that includes a prev coord.
        // And then we can have `insetAdjacentSegment` that does the default easy thing.
    }

    // let completed: Array<Array<Segment>> = [];
    // let current: Array<Segment> = [];
    // let i = 0;
    // // I want a function that finds the insetPoint between two segments
    // while (true) {
    //     let current = path[i];
    //     let next = path[(i + 1) % path.length];
    //     let point = insetPoint(current, next, inset); // soooo for the case with two tangent circles, we would need a line, not just a point ...
    //     for (let j = i + 1; j != i; j = (j + 1) % path.length) {
    //         if (tooClose(point, path[j], inset)) {
    //         }
    //     }
    // }
};
