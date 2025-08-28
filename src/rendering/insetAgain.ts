import { angleBetween } from "./findNextSegments";
import { angleTo, dist, push } from "./getMirrorTransforms";
import { closeEnoughAngle, lineLine, lineToSlope } from "./intersect";
import { coordsEqual } from "./pathsAreIdentical";
import { Coord, Segment } from "../types";

export type Line = { type: "Line"; p0: Coord; p1: Coord };
export type Full = Line | Arc;
export type Arc = {
	type: "Arc";
	center: Coord;
	t0: number;
	t1: number;
	r: number;
	clockwise: boolean;
};

// export const segmentToFull = (prev: Coord, segment: Segment): Full => {
//     if (segment.type === 'Line') {
//         return { type: 'Line', p0: prev, p1: segment.to };
//     }
//     return {
//         type: 'Arc',
//         center: segment.center,
//         t0: angleTo(segment.center, prev),
//         t1: angleTo(segment.center, segment.to),
//         r: dist(segment.center, segment.to),
//         clockwise: segment.clockwise,
//     };
// };

// export const insetFull = (full: Full, inset: number): Full | null => {
//     if (full.type === 'Line') {
//         const t = angleTo(full.p0, full.p1);
//         return {
//             type: 'Line',
//             p0: push(full.p0, t + Math.PI / 2, inset),
//             p1: push(full.p1, t + Math.PI / 2, inset),
//         };
//     }
//     return inset < full.r ? { ...full, r: full.r - inset } : null;
// };

// export const insetSegmentsNew = (segments: Array<Segment>, inset: number) => {
//     const fulls = segments.map((seg, i) => {
//         const prev = segments[i === 0 ? segments.length - 1 : i - 1].to;
//         return segmentToFull(prev, seg);
//     });

//     let insets = fulls
//         .map((full) => insetFull(full, inset))
//         .filter(Boolean) as Array<Full>;

//     // Now we go around the circle, adjusting start & end lines, and inserting
//     // connectors if absolutely needed
//     let moved: Array<Full> = insets;

//     // // This won't loop forever, because insets starts with a finite number of elements.
//     // // And we must remove elements on each loop.
//     // while (true) {
//     //     let busted: Array<number>;
//     //     ({ busted, moved } = moveInsetPoints(insets));

//     //     if (busted.length) {
//     //         insets = insets.filter((_, i) => !busted.includes(i));
//     //     } else {
//     //         break;
//     //     }
//     // }

//     // Bail early if everything was eliminated.
//     if (!moved.length) {
//         return [];
//     }

//     // Ok so apparetnly we can get to a point where all but one line
//     // is eliminated. So I think I also want to take into account
//     // the previous line as well as the next line.
//     // !!!!!!!!!!!!!!!!!!!!!!

//     /// ooooh but the tophat reveals that there might be a line that I think
//     // needs removal, but doesn't once an adjacent line is removed.

//     // lol ok let's use an actual algorithm here too.

//     // now we need to ... find the new intersection points.
//     // but where to start?
//     // well, anywhere, but we're finding intersection points ..
//     // hmmm

//     // So, can I /locally/ determine if a given new segment is going to be backwards?
//     // this segment, the segment behind, and the segment in front? I think so.

//     // Are there cases where removing a segment would cause a previously invalid segment to be valid?
//     // ugh I hope not.
//     // and I also think maybe not.
//     const result: Array<Segment> = [];
//     moved.forEach((full, i) => {
//         const prev = fullTo(moved[i === 0 ? moved.length - 1 : i - 1]);
//         if (full.type === 'Line') {
//             if (!coordsEqual(full.p0, prev)) {
//                 result.push({ type: 'Line', to: full.p0 });
//             }
//             result.push({ type: 'Line', to: full.p1 });
//         } else {
//             const p0 = push(full.center, full.t0, full.r);
//             if (!coordsEqual(p0, prev)) {
//                 result.push({ type: 'Line', to: p0 });
//             }
//             result.push({
//                 type: 'Arc',
//                 clockwise: full.clockwise,
//                 to: push(full.center, full.t1, full.r),
//                 center: full.center,
//             });
//         }
//     });
//     return result;
// };

// export const fullTo = (full: Full): Coord => {
//     return full.type === 'Line' ? full.p1 : push(full.center, full.t1, full.r);
// };
// function moveInsetPoints(insets: Full[]) {
//     const moved: Array<Full> = insets.slice();
//     moved.forEach((full, i) => {
//         const pi = i === 0 ? moved.length - 1 : i - 1;
//         const prev = moved[pi];
//         if (full.type === 'Line' && prev.type === 'Line') {
//             const intersection = lineLine(
//                 lineToSlope(prev.p0, prev.p1),
//                 lineToSlope(full.p0, full.p1),
//             );
//             if (!intersection) {
//                 return;
//             }
//             moved[pi] = { ...prev, p1: intersection };
//             moved[i] = { ...full, p0: intersection };
//         }
//     });

//     const busted: Array<number> = [];
//     moved.forEach((full, i) => {
//         if (full.type === 'Line') {
//             const old = insets[i] as Line;
//             const t = angleTo(full.p0, full.p1);
//             if (!closeEnoughAngle(t, angleTo(old.p0, old.p1))) {
//                 busted.push(i);
//             }
//         } else {
//             const old = insets[i] as Arc;
//             if (
//                 angleBetween(old.t0, old.t1, old.clockwise) <
//                 angleBetween(full.t0, full.t1, full.clockwise)
//             ) {
//                 busted.push(i);
//             }
//         }
//     });
//     return { busted, moved };
// }
