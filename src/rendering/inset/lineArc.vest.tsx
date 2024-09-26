// import equal from 'fast-deep-equal';
// import * as React from 'react';
// import { arrow, pointsList } from '../../editor/ShowHitIntersection2';
// import { ArcSegment, Coord, LineSegment, Segment } from '../../types';
// import { register } from '../../vest';
// import { zeroToTwoPi } from '../clipPath';
// import { angleBetween } from '../findNextSegments';
// import { angleTo, dist, push } from '../getMirrorTransforms';
// import { SegmentEditor, useInitialState } from '../SegmentEditor';
// import { ShapeEditor } from '../ShapeEditor';
// import { RenderDebugInsetSegment } from '../ShowDebugInsetSegment';
// import { insetArcArc } from './arcArc';
// import { CoordPicker } from './CoordPicker';
// import { insetLineArc } from './lineArc';
// import { SvgGrid } from './SvgGrid';

// type Input = {
//     coords: [Coord, Coord, Coord];
//     clockwise: boolean;
//     inset: number;
// };
// type Output = Array<Segment>;

// function makeSegments(input: Input): [LineSegment, ArcSegment] {
//     return [
//         { type: 'Line', to: input.coords[1] },
//         {
//             type: 'Arc',
//             center: input.coords[2],
//             clockwise: input.clockwise,
//             to: push(
//                 input.coords[2],
//                 angleTo(input.coords[1], input.coords[2]) +
//                     (input.clockwise ? -1 : 1) * Math.PI * 0.75,
//                 dist(input.coords[2], input.coords[1]),
//             ),
//         },
//     ];
// }

// const vector = (coord: Coord, theta: number, size: number, color = 'red') => {
//     const p = push(coord, theta, size);
//     return (
//         <>
//             <line
//                 stroke={color}
//                 x1={coord.x}
//                 y1={coord.y}
//                 x2={p.x}
//                 y2={p.y}
//                 strokeWidth={size / 8}
//             />
//             <polygon
//                 points={pointsList(arrow(p, theta, size / 4))}
//                 fill={color}
//             />
//         </>
//     );
// };

// const ShowDebug = ({ input }: { input: Input }) => {
//     const [line, arc] = makeSegments(input);
//     // const t0 = angleTo(seg.center, seg.to);
//     // const tan0 = t0 + (Math.PI / 2) * (seg.clockwise ? 1 : -1);
//     // const t1 = angleTo(next.center, seg.to);
//     // const tan1 = t1 - (Math.PI / 2) * (next.clockwise ? 1 : -1);
//     // const between = zeroToTwoPi(angleBetween(tan0, tan1, false));

//     return (
//         <>
//             <RenderDebugInsetSegment
//                 one={{ prev: input.coords[0], segment: line, shape: -1 }}
//                 two={{ prev: line.to, segment: arc, shape: -1 }}
//                 inset={input.inset}
//                 segments={insetLineArc(input.coords[0], line, arc, input.inset)}
//             />
//             {/* {vector(seg.to, tan0, 30, 'yellow')}
//             {vector(seg.to, tan1, 30, 'purple')} */}
//         </>
//     );
// };

// type State = {
//     inset: number;
//     coords: Array<Coord>;
//     clockwise: boolean;
// };

// // const stateToInput = (state: State): Input | null => {
// //     const next = makeNext(state);
// //     if (!state.arc || !next) {
// //         return null;
// //     }
// //     return [[state.arc.prev, state.arc.segment, next], state.inset];
// // };

// const Editor2 = ({
//     initial,
//     onChange,
// }: {
//     initial: Input | null;
//     onChange: (i: Input) => void;
// }) => {
//     const [state, setState] = useInitialState(
//         initial ? initial : null,
//         (input: Input | null): State => {
//             if (!input) {
//                 return {
//                     coords: [],
//                     clockwise: true,
//                     inset: 10,
//                 };
//             }
//             return {
//                 coords: input.coords,
//                 clockwise: input.clockwise,
//                 inset: input.inset,
//             };
//         },
//     );
//     React.useEffect(() => {
//         const t = setTimeout(() => {
//             if (state.coords.length === 3) {
//                 onChange(state as Input);
//             }
//         }, 200);
//         return () => clearTimeout(t);
//     }, [state]);
//     return (
//         <div>
//             <CoordPicker
//                 coords={state.coords}
//                 onSet={(coords) => {
//                     setState((s) => ({ ...s, coords }));
//                 }}
//             >
//                 {(rendered, coords) => {
//                     const next = {
//                         ...state,
//                         coords: coords,
//                     };
//                     return (
//                         <>
//                             {next.coords.length === 3 ? (
//                                 <ShowDebug input={next as Input} />
//                             ) : null}
//                             {rendered}
//                         </>
//                     );
//                 }}
//             </CoordPicker>
//             <div>
//                 <button
//                     onClick={() =>
//                         setState((s) => ({
//                             ...s,
//                             clockwise: !s.clockwise,
//                         }))
//                     }
//                 >
//                     {state.clockwise ? 'clockwise' : 'counterclockwise'}
//                 </button>
//             </div>
//             <div>
//                 <button
//                     onClick={() => {
//                         setState((s) => ({
//                             ...s,
//                             coords: s.coords.slice(0, -1),
//                         }));
//                     }}
//                 >
//                     Back
//                 </button>
//                 <input
//                     type="range"
//                     min={-100}
//                     max={100}
//                     value={state.inset}
//                     onChange={(evt) => {
//                         setState((s) => ({ ...s, inset: +evt.target.value }));
//                     }}
//                 />
//                 {state.inset}
//             </div>
//         </div>
//     );
// };

// register({
//     id: 'lineArc',
//     dir: __dirname,
//     transform: (input) => {
//         const [line, arc] = makeSegments(input);
//         return insetLineArc(input.coords[0], line, arc, input.inset);
//     },
//     render: {
//         editor: Editor2,
//         fixture: ({ input, output }: { input: Input; output: Output }) => {
//             return (
//                 <div>
//                     <svg width={300} height={300}>
//                         <SvgGrid size={15} />
//                         <ShowDebug input={input} />
//                     </svg>
//                 </div>
//             );
//         },
//     },
// });
