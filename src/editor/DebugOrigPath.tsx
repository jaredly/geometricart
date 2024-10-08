// import * as React from 'react';
// import { insidePath } from '../rendering/clipPath';
// import { windingNumber } from '../rendering/windingNumber';
// import { findInsidePoint, findRegions } from '../rendering/findInternalRegions';
// import { segmentsToNonIntersectingSegments } from '../rendering/segmentsToNonIntersectingSegments';
// import { push } from '../rendering/getMirrorTransforms';
// import { insetSegmentsBeta } from '../rendering/insetPath';
// import { simplifyPath } from '../rendering/simplifyPath';
// import { Primitive } from '../rendering/intersect';
// import { isClockwise } from '../rendering/pathToPoints';
// import { Coord, Path, Segment } from '../types';
// import { pathToPrimitives } from './findSelection';
// import { RenderSegmentBasic } from './RenderSegment';
// import { pathSegs, segmentArrow } from './RenderPath';
// import { calcPathD } from './calcPathD';
// import { addPrevsToSegments, getSomeHits } from '../rendering/clipPathNew';
// import { coordsEqual, segmentsEqual } from '../rendering/pathsAreIdentical';
// import { segmentAngle } from '../rendering/segmentAngle';
// import { ShowHitIntersection } from './ShowHitIntersection';

// export const DebugOrigPath = ({
//     origPath,
//     zoom,
//     clip,
//     path,
// }: {
//     origPath: Path;
//     path: Path;
//     zoom: number;
//     clip?: { prims: Array<Primitive>; segments: Array<Segment> } | null;
// }) => {
//     let inset: number | null = null;
//     if (
//         path.style.lines.length &&
//         origPath.style.lines[path.style.lines[0]?.originalIdx!]?.inset
//     ) {
//         inset =
//             origPath.style.lines[path.style.lines[0]!.originalIdx!]?.inset ??
//             null;
//     } else if (path.style.fills.length && path.style.fills[0]) {
//         inset =
//             origPath.style.fills[path.style.fills[0]!.originalIdx!]?.inset ??
//             null;
//     }
//     let insetEls = null;
//     if (inset != null) {
//         const insetSegments = insetSegmentsBeta(origPath.segments, inset / 100);
//         const primitives = pathToPrimitives(insetSegments);
//         const parts = segmentsToNonIntersectingSegments(insetSegments);
//         const regions = findRegions(parts.result, parts.froms); //.filter(isClockwise);
//         // console.log(parts);
//         const colors = ['#0f0', '#00f', '#ff0', '#f0f', '#0ff', '#aaa', '#555'];
//         let mode = 0;
//         if (mode === 0) {
//             insetEls = (
//                 <>
//                     <path
//                         d={calcPathD(origPath, zoom)}
//                         fill="none"
//                         stroke="white"
//                         strokeWidth={1}
//                     />
//                     <path
//                         d={calcPathD(pathSegs(insetSegments), zoom)}
//                         fill="none"
//                         stroke="red"
//                         strokeWidth={1}
//                     />
//                     {parts.result.map((part, i) => (
//                         <RenderSegmentBasic
//                             zoom={zoom}
//                             segment={part.segment}
//                             prev={part.prev}
//                             key={i}
//                             inner={{
//                                 stroke: 'red',
//                                 strokeDasharray: '5 5',
//                             }}
//                         />
//                     ))}
//                     {/* {regions.map((region, i) => (
//                         <path
//                             d={calcPathD(pathSegs(region), zoom)}
//                             fill={colors[i % colors.length]}
//                             key={i}
//                             stroke="white"
//                             strokeWidth={1}
//                         />
//                     ))} */}
//                     {parts.result.map((part, i) =>
//                         segmentArrow(
//                             part.prev,
//                             i,
//                             part.segment,
//                             zoom,
//                             Math.max(5, Math.min(10, (1 / 100) * zoom)),
//                         ),
//                     )}
//                     {regions.map((region, ri) => {
//                         return region.map((seg, i) => {
//                             const prev =
//                                 region[i === 0 ? region.length - 1 : i - 1].to;
//                             const next = region[(i + 1) % region.length];
//                             const res = findInsidePoint(
//                                 prev,
//                                 seg,
//                                 next,
//                                 25 / zoom,
//                             );
//                             if (!res) {
//                                 return;
//                             }
//                             let [t0, t1, pos, p0] = res;

//                             const wind = windingNumber(
//                                 pos,
//                                 primitives,
//                                 insetSegments,
//                                 false,
//                             );
//                             const wcount = wind.reduce(
//                                 (c, w) => (w.up ? 1 : -1) + c,
//                                 0,
//                             );
//                             const scalePos = (p: Coord) => ({
//                                 x: p.x * zoom,
//                                 y: p.y * zoom,
//                             });

//                             pos = scalePos(pos);
//                             p0 = scalePos(p0);
//                             const pa = push(p0, t0, 35);
//                             const pb = push(p0, t1, 30);

//                             return (
//                                 <g key={`${ri}-${i}`}>
//                                     <line
//                                         x1={p0.x}
//                                         y1={p0.y}
//                                         x2={pa.x}
//                                         y2={pa.y}
//                                         stroke="white"
//                                         strokeWidth={3}
//                                     />
//                                     <line
//                                         x1={p0.x}
//                                         y1={p0.y}
//                                         x2={pb.x}
//                                         y2={pb.y}
//                                         stroke="black"
//                                         strokeWidth={3}
//                                     />
//                                     <line
//                                         x1={p0.x}
//                                         y1={p0.y}
//                                         x2={pos.x}
//                                         y2={pos.y}
//                                         stroke={wcount === 0 ? 'red' : '#af0'}
//                                         strokeWidth={3}
//                                     />
//                                 </g>
//                             );
//                         });
//                     })}
//                 </>
//             );
//         } else {
//             insetEls = (
//                 <>
//                     <path
//                         d={calcPathD(origPath, zoom)}
//                         fill="none"
//                         stroke="white"
//                         strokeWidth={1}
//                     />
//                     <path
//                         d={calcPathD(pathSegs(insetSegments), zoom)}
//                         fill="none"
//                         stroke="yellow"
//                         strokeWidth={3}
//                         style={{ cursor: 'pointer' }}
//                         onClick={() => {
//                             console.log(
//                                 insetSegments,
//                                 origPath.segments,
//                                 inset,
//                             );
//                             console.log(regions.filter(isClockwise));
//                         }}
//                     />
//                     {insetSegments.map((seg, i) =>
//                         segmentArrow(
//                             insetSegments[
//                                 i === 0 ? insetSegments.length - 1 : i - 1
//                             ].to,
//                             i,
//                             seg,
//                             zoom,
//                             10,
//                         ),
//                     )}
//                     {regions.map((region, ri) => {
//                         return region.map((seg, i) => {
//                             const prev =
//                                 region[i === 0 ? region.length - 1 : i - 1].to;
//                             const next = region[(i + 1) % region.length];
//                             const res = findInsidePoint(
//                                 prev,
//                                 seg,
//                                 next,
//                                 25 / zoom,
//                             );
//                             if (!res) {
//                                 return;
//                             }
//                             let [t0, t1, pos, p0] = res;

//                             const wind = windingNumber(
//                                 pos,
//                                 primitives,
//                                 insetSegments,
//                                 false,
//                             );
//                             const wcount = wind.reduce(
//                                 (c, w) => (w.up ? 1 : -1) + c,
//                                 0,
//                             );
//                             const scalePos = (p: Coord) => ({
//                                 x: p.x * zoom,
//                                 y: p.y * zoom,
//                             });

//                             pos = scalePos(pos);
//                             p0 = scalePos(p0);
//                             const pa = push(p0, t0, 35);
//                             const pb = push(p0, t1, 30);

//                             return (
//                                 <g key={`${ri}-${i}`}>
//                                     <line
//                                         x1={p0.x}
//                                         y1={p0.y}
//                                         x2={pa.x}
//                                         y2={pa.y}
//                                         stroke="white"
//                                         strokeWidth={3}
//                                     />
//                                     <line
//                                         x1={p0.x}
//                                         y1={p0.y}
//                                         x2={pb.x}
//                                         y2={pb.y}
//                                         stroke="black"
//                                         strokeWidth={3}
//                                     />
//                                     <line
//                                         x1={p0.x}
//                                         y1={p0.y}
//                                         x2={pos.x}
//                                         y2={pos.y}
//                                         stroke={wcount === 0 ? 'red' : '#af0'}
//                                         strokeWidth={3}
//                                     />
//                                 </g>
//                             );
//                         });
//                     })}
//                     {regions.map((region, i) => (
//                         <path
//                             key={i}
//                             d={calcPathD(pathSegs(region), zoom)}
//                             strokeDasharray={'10 10'}
//                             fill="none"
//                             stroke="purple"
//                             strokeWidth={4}
//                         />
//                     ))}
//                 </>
//             );
//         }
//     }
//     let clipEls = null;
//     if (clip != null) {
//         const hitsResults = getSomeHits(
//             addPrevsToSegments(origPath.segments, 0).concat(
//                 addPrevsToSegments(simplifyPath(clip.segments), 1),
//             ),
//         );
//         if (hitsResults) {
//             const { hits, hitPairs } = hitsResults;
//             clipEls = (
//                 <>
//                     {Object.keys(hits).map((k) => {
//                         const coord = hits[k].coord;
//                         const type = hitPairs[k].type;
//                         const colors = {
//                             straight: 'red',
//                             cross: 'green',
//                             ambiguous: 'magenta',
//                         };
//                         return (
//                             <React.Fragment key={k}>
//                                 <circle
//                                     cx={coord.x * zoom}
//                                     cy={coord.y * zoom}
//                                     r={5}
//                                     fill={colors[type]}
//                                 />
//                                 <ShowHitIntersection
//                                     coord={coord}
//                                     pair={hitPairs[k]}
//                                     zoom={zoom}
//                                 />
//                             </React.Fragment>
//                         );
//                     })}
//                 </>
//             );
//         }
//     }
//     return (
//         <>
//             {origPath.segments.map((seg, i) => (
//                 <circle
//                     key={i}
//                     cx={seg.to.x * zoom}
//                     cy={seg.to.y * zoom}
//                     r={10}
//                     stroke={
//                         clip && !insidePath(seg.to, clip.prims, clip.segments)
//                             ? 'yellow'
//                             : i === 0
//                             ? 'red'
//                             : 'blue'
//                     }
//                     strokeWidth={(1 / 100) * zoom}
//                     fill={'none'}
//                 />
//             ))}
//             {false &&
//                 path.segments.map((seg, i) => (
//                     <circle
//                         key={i}
//                         cx={seg.to.x * zoom}
//                         cy={seg.to.y * zoom}
//                         r={Math.min(10, (1 / 100) * zoom)}
//                         fill={i === 0 ? 'red' : 'blue'}
//                     />
//                 ))}

//             {false && (
//                 <circle
//                     cx={origPath.origin.x * zoom}
//                     cy={origPath.origin.y * zoom}
//                     r={10}
//                     fill={'none'}
//                     stroke={'green'}
//                     strokeWidth={(1 / 100) * zoom}
//                 />
//             )}
//             {false && (
//                 <circle
//                     cx={path.origin.x * zoom}
//                     cy={path.origin.y * zoom}
//                     r={10}
//                     fill={'green'}
//                 />
//             )}
//             {false &&
//                 path.segments.map((seg, i) => (
//                     <circle
//                         key={`circle-${i}`}
//                         cx={seg.to.x * zoom}
//                         cy={seg.to.y * zoom}
//                         r={Math.min(20, (2 / 100) * zoom)}
//                         //   r={20}
//                         fill="orange"
//                     />
//                 ))}
//             {insetEls}
//             {clipEls}
//         </>
//     );
// };
