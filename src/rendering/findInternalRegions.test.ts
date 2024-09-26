// import { findRegions } from './findInternalRegions';
// import { segmentsToNonIntersectingSegments } from './segmentsToNonIntersectingSegments';
// import { isClockwise } from './pathToPoints';

// // TODO: Change this to a vest test!

// // @ts-ignore
// describe.skip('ok', () => {
//     // @ts-ignore
//     it('should work', () => {
//         const result = segmentsToNonIntersectingSegments([
//             { type: 'Line', to: { x: 1, y: 0 } },
//             { type: 'Line', to: { x: 0, y: 1 } },
//             { type: 'Line', to: { x: 1, y: 1 } },
//             { type: 'Line', to: { x: 0, y: 0 } },
//         ]);
//         debugger;
//         // whyyyy are the x zeroes negative? ???
//         // @ts-ignore
//         expect(result).toEqual({
//             result: [
//                 {
//                     prev: { x: 0, y: 0 },
//                     segment: { type: 'Line', to: { x: 1, y: 0 } },
//                     initialAngle: 0,
//                     finalAngle: 0,
//                 },
//                 {
//                     prev: { x: 1, y: 0 },
//                     segment: { type: 'Line', to: { x: 0.5, y: 0.5 } },
//                     initialAngle: 2.356194490192345,
//                     finalAngle: 2.356194490192345,
//                 },
//                 {
//                     prev: { x: 0.5, y: 0.5 },
//                     segment: { type: 'Line', to: { x: 0, y: 1 } },
//                     initialAngle: 2.356194490192345,
//                     finalAngle: 2.356194490192345,
//                 },
//                 {
//                     prev: { x: 0, y: 1 },
//                     segment: { type: 'Line', to: { x: 1, y: 1 } },
//                     initialAngle: 0,
//                     finalAngle: 0,
//                 },
//                 {
//                     prev: { x: 1, y: 1 },
//                     segment: { type: 'Line', to: { x: 0.5, y: 0.5 } },
//                     initialAngle: -2.356194490192345,
//                     finalAngle: -2.356194490192345,
//                 },
//                 {
//                     prev: { x: 0.5, y: 0.5 },
//                     segment: { type: 'Line', to: { x: 0, y: 0 } },
//                     initialAngle: -2.356194490192345,
//                     finalAngle: -2.356194490192345,
//                 },
//             ],
//             froms: {
//                 '0.000,0.000': { coord: { x: 0, y: 0 }, exits: [0] },
//                 '1.000,0.000': { coord: { x: 1, y: 0 }, exits: [1] },
//                 '0.500,0.500': { coord: { x: 0.5, y: 0.5 }, exits: [2, 5] },
//                 '0.000,1.000': { coord: { x: 0, y: 1 }, exits: [3] },
//                 '1.000,1.000': { coord: { x: 1, y: 1 }, exits: [4] },
//             },
//         });
//     });

//     // @ts-ignore
//     it('should preserve a square', () => {
//         const result = segmentsToNonIntersectingSegments([
//             { type: 'Line', to: { x: 1, y: 0 } },
//             { type: 'Line', to: { x: 1, y: 1 } },
//             { type: 'Line', to: { x: 0, y: 1 } },
//             { type: 'Line', to: { x: 0, y: 0 } },
//         ]);
//         const regions = findRegions(result.result, result.froms).filter(
//             isClockwise,
//         );
//         // @ts-ignore
//         expect(regions).toEqual([
//             [
//                 { type: 'Line', to: { x: 1, y: 0 } },
//                 { type: 'Line', to: { x: 1, y: 1 } },
//                 { type: 'Line', to: { x: 0, y: 1 } },
//                 { type: 'Line', to: { x: 0, y: 0 } },
//             ],
//         ]);
//     });

//     // @ts-ignore
//     it('should find the correct triangle', () => {
//         const result = segmentsToNonIntersectingSegments([
//             { type: 'Line', to: { x: 1, y: 0 } },
//             { type: 'Line', to: { x: 0, y: 1 } },
//             { type: 'Line', to: { x: 1, y: 1 } },
//             { type: 'Line', to: { x: 0, y: 0 } },
//         ]);
//         const regions = findRegions(result.result, result.froms).filter(
//             isClockwise,
//         );
//         // @ts-ignore
//         expect(regions).toEqual([
//             [
//                 { to: { x: 1, y: 0 }, type: 'Line' },
//                 { to: { x: 0.5, y: 0.5 }, type: 'Line' },
//                 { to: { x: 0, y: 0 }, type: 'Line' },
//             ],
//         ]);
//     });
// });

// // hrmmmm now I need to remove the little vestigal triangles.
// // and, for extra credit, if I could do the holes that might be
// // created that would be awesome.
