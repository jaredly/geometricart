import * as React from "react";
import { RenderSegmentBasic } from "../editor/RenderSegment";
import { Coord, Segment } from "../types";
import { angleForSegment } from "./clipPath";
import { addPrevsToSegments, SegmentWithPrev } from "./clipPathNew";
import { angleTo, dist, push } from "./getMirrorTransforms";
import { insetSegment } from "./insetSegment";
// import { asArray } from './insetSegment.vest';

// export const insetPrev = (prev: Coord, segment: Segment, amount: number) => {
//     const angle = angleForSegment(prev, segment, prev);
//     return push(prev, angle.theta + Math.PI / 2, amount);
// };

// export const naiveInset = (
//     seg: SegmentWithPrev,
//     inset: number,
// ): SegmentWithPrev => {
//     if (seg.segment.type === 'Line') {
//         const t = angleTo(seg.prev, seg.segment.to) + Math.PI / 2;
//         return {
//             shape: seg.shape,
//             prev: push(seg.prev, t, inset),
//             segment: {
//                 type: 'Line',
//                 to: push(seg.segment.to, t, inset),
//             },
//         };
//     } else {
//         const r =
//             dist(seg.segment.center, seg.prev) +
//             inset * (seg.segment.clockwise ? -1 : 1);
//         return {
//             shape: seg.shape,
//             prev: push(
//                 seg.segment.center,
//                 angleTo(seg.segment.center, seg.prev),
//                 r,
//             ),
//             segment: {
//                 ...seg.segment,
//                 to: push(
//                     seg.segment.center,
//                     angleTo(seg.segment.center, seg.segment.to),
//                     r,
//                 ),
//             },
//         };
//     }
// };

// export function RenderDebugInsetSegment({
//     one,
//     two,
//     inset,
//     segments,
// }: {
//     one: SegmentWithPrev;
//     two: SegmentWithPrev;
//     segments: Array<Segment>;
//     inset: number;
// }) {
//     const withPrevs = addPrevsToSegments(
//         segments,
//         -1,
//         insetPrev(one.prev, one.segment, inset),
//     );
//     const ione = naiveInset(one, inset);
//     const itwo = naiveInset(two, inset);
//     return (
//         <>
//             <RenderSegmentBasic
//                 prev={one.prev}
//                 segment={one.segment}
//                 inner={{
//                     stroke: 'green',
//                     strokeWidth: 2,
//                 }}
//                 zoom={1}
//             />
//             {one.segment.type === 'Arc' ? (
//                 <circle
//                     cx={one.segment.center.x}
//                     cy={one.segment.center.y}
//                     fill={'green'}
//                     r={4}
//                 />
//             ) : null}
//             <RenderSegmentBasic
//                 prev={two.prev}
//                 segment={two.segment}
//                 inner={{
//                     stroke: 'blue',
//                     strokeWidth: 2,
//                 }}
//                 zoom={1}
//             />
//             {two.segment.type === 'Arc' ? (
//                 <circle
//                     cx={two.segment.center.x}
//                     cy={two.segment.center.y}
//                     fill={'blue'}
//                     r={4}
//                 />
//             ) : null}
//             {withPrevs.map((s, i) => (
//                 <RenderSegmentBasic
//                     key={i}
//                     prev={s.prev}
//                     segment={s.segment}
//                     inner={{
//                         stroke: 'red',
//                         strokeWidth: 2,
//                     }}
//                     zoom={1}
//                 />
//             ))}
//             <RenderSegmentBasic
//                 prev={ione.prev}
//                 segment={ione.segment}
//                 inner={{
//                     stroke: 'white',
//                     strokeDasharray: '1 5',
//                     strokeWidth: 1,
//                 }}
//                 zoom={1}
//             />
//             <RenderSegmentBasic
//                 prev={itwo.prev}
//                 segment={itwo.segment}
//                 inner={{
//                     stroke: 'white',
//                     strokeDasharray: '1 5',
//                     strokeWidth: 1,
//                 }}
//                 zoom={1}
//             />
//         </>
//     );
// }
