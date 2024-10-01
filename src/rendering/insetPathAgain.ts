/**
 * So, insetting a path is pretty complicated!
 *
 * The main steps are:
 *
 * 0. ensure that the path is clockwise. we assume it's also non-intersecting at this point
 * 1. inset each segment by the given amount.
 * 	 1a. at concave corners, extend segments to their new meeting point
 *   1b. at convex corners, join segments with a two lines via the original corner
 * 2. You now likely have lots of self-intersections! Each convex corner now has a self-intersection,
 *    and depending on how exciting the shape was to start with you might have many more. Split all
 * 	  segments along any intersections, so you're left with only non-intersecting segments.
 * 3. Find your clockwise regions (counter-clockwise regions can be ignored)! Go through your little
 *    segments, and when you come to a cross-road, take the exiting segment that is most-clockwise. I think.
 * 	  TODO verify that.
 * 4. Some of your clockwise regions might be contained within one another! Others might actually be holes.
 *    Use a winding rule to discard regions with a negative winding number, and then discard regions that are
 *    contains within another region.
 *
 * Then you're done!
 */

// NB this file isn't actually used anywhere yet. It was partly just to get my thoughts in order.

// import {
//     findRegions,
//     removeContainedRegions,
//     removeNonWindingRegions,
// } from './findInternalRegions';
// import {
//     Froms,
//     PartialSegment,
//     segmentsToNonIntersectingSegments,
// } from './segmentsToNonIntersectingSegments';
// import { simplifyPath } from './simplifyPath';
// import { insetSegment } from './insetSegment';
// import { isClockwise, reversePath } from './pathToPoints';
// import { Segment } from '../types';

// export const step0ensureInsetPreconditions = (segments: Array<Segment>) => {
//     segments = isClockwise(segments) ? segments : reversePath(segments);
//     // just in case we can make this easier on ourselves.
//     return simplifyPath(segments);
// };

// export const step1insetSegments = (segments: Array<Segment>, inset: number) => {
//     const insets = segments.map((seg, i) => {
//         const prev = segments[i === 0 ? segments.length - 1 : i - 1].to;
//         const next = segments[i === segments.length - 1 ? 0 : i + 1];
//         // TODO 🤔: should this pre-split segments that are obviously going to self-intersect? Would
//         // that make my job easier?
//         return insetSegment(prev, seg, next, inset, true);
//     });
//     return insets.flat();
// };

// export const step2splitAtIntersections = (segments: Array<Segment>) => {
//     return segmentsToNonIntersectingSegments(segments);
// };

// export const step3findClockwiseRegions = ({
//     result,
//     froms,
// }: {
//     result: Array<PartialSegment>;
//     froms: Froms;
// }) => {
//     return findRegions(result, froms).filter(isClockwise);
// };

// export const step4filterRegions = (
//     regions: Array<Array<Segment>>,
//     segments: Array<Segment>,
// ) => {
//     return removeContainedRegions(removeNonWindingRegions(segments, regions));
// };

// export const insetPathNew = (segments: Array<Segment>, inset: number) => {
//     segments = step0ensureInsetPreconditions(segments);
//     return step4filterRegions(
//         step3findClockwiseRegions(
//             step2splitAtIntersections(step1insetSegments(segments, inset)),
//         ),
//         segments,
//     );
// };
