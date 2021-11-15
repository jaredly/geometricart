import { jsx } from '@emotion/react';
import React from 'react';
import { RenderPath } from './RenderPath';
import { coordKey, primitiveKey } from './calcAllIntersections';
import { RenderSegment } from './RenderSegment';
import { findNextSegments } from './findNextSegments';
import { Primitive } from './intersect';
import { Coord, Id, Intersect, PendingSegment, Segment } from './types';
import { applyMatrices, Matrix } from './getMirrorTransforms';
import { transformSegment } from './points';
import { useCurrent } from './App';
import { segmentsEqual } from './pathsAreIdentical';

/*

Ok, let's get serious here.

NOT ALLOWED:
- BACKTRACKING. What does that mean?
    Going backwards over the same path.
    How do we tell, with arcs?
- going TO a point that we've already covered, if it's not the origin.


    btw I can probably ditch pendingsegment...

*/

export const segmentKeyReverse = (prev: Coord, segment: Segment) =>
    segment.type === 'Line'
        ? segmentKey(segment.to, { type: 'Line', to: prev })
        : segmentKey(segment.to, {
              type: 'Arc',
              center: segment.center,
              clockwise: !segment.clockwise,
              to: prev,
          });

export const segmentKey = (prev: Coord, segment: Segment) =>
    coordKey(prev) +
    ` ${segment.type} ` +
    (segment.type === 'Line'
        ? ''
        : `via ${coordKey(segment.center)}${segment.clockwise ? 'C' : 'A'}`) +
    ' to ' +
    coordKey(segment.to);

export type State = {
    parts: Array<PendingSegment>;
    next: Array<PendingSegment>;
    selection: number;
};

export const initialState = (
    origin: Intersect,
    primitives: Array<Primitive>,
    intersections: Array<Intersect>,
): State => {
    return {
        parts: [],
        selection: 0,
        next: findNextSegments(
            { type: 'Path', origin, parts: [] },
            primitives,
            intersections,
        ),
    };
};

export const DrawPath = React.memo(
    ({
        primitives,
        intersections,
        mirror,
        origin,
        zoom,
        onComplete,
        palette,
    }: {
        mirror: null | Array<Array<Matrix>>;
        primitives: Array<{ prim: Primitive; guides: Array<Id> }>;
        origin: Intersect;
        zoom: number;
        intersections: Array<Intersect>;
        palette: Array<string>;
        onComplete: (segments: Array<PendingSegment>) => unknown;
    }) => {
        const [state, setState] = React.useState(() =>
            initialState(
                origin,
                primitives.map((p) => p.prim),
                intersections,
            ),
        );

        // let parts = parts.concat([])

        // const covered = state.parts.map((part) => coordKey(part.to.coord));
        // const butLast = covered.slice(0, -1);
        // .concat([coordKey(origin.coord)]);

        // const used = state.parts
        //     .map((part, i) => {
        //         const prev =
        //             i === 0 ? origin.coord : state.parts[i - 1].to.coord;
        //         return [
        //             segmentKey(prev, part.segment),
        //             segmentKeyReverse(prev, part.segment),
        //         ];
        //     })
        //     .flat();

        // const next = findNextSegments(
        //     { type: 'Path', origin, parts: state.parts },
        //     primitives.map((prim) => prim.prim),
        //     intersections,
        // ).filter(
        //     (seg, i) =>
        //         !covered.includes(coordKey(seg.to.coord)) &&
        //         !used.includes(segmentKey(current.coord, seg.segment)),
        // );
        // const prevBase = parts.length < 2 ? origin : parts[parts.length - 2].to;
        // const prev =
        //     parts.length > 0
        //         ? findNextSegments(
        //               { type: 'Path', origin, parts: parts.slice(0, -1) },
        //               primitives.map((prim) => prim.prim),
        //               intersections,
        //           ).filter(
        //               (seg) =>
        //                   !butLast.includes(coordKey(seg.to.coord)) &&
        //                   !used.includes(
        //                       segmentKey(prevBase.coord, seg.segment),
        //                   ),
        //               //   (seg) => coordKey(seg.to.coord) !== coordKey(current.coord),
        //           )
        //         : null;

        // const nextSegments = React.useMemo(() => {
        //     return findNextSegments(
        //         { type: 'Path', origin, parts },
        //         primitives,
        //         intersections,
        //     );
        // }, [parts, intersections, primitives]);

        // console.log(next, prev, parts, used);

        const completed =
            state.parts.length &&
            coordKey(state.parts[state.parts.length - 1].to.coord) ===
                coordKey(origin.coord);

        const transformedParts = mirror
            ? mirror.map((transform) => ({
                  origin: applyMatrices(origin.coord, transform),
                  segments: state.parts.map((seg) =>
                      transformSegment(seg.segment, transform),
                  ),
              }))
            : null;

        const latest = useCurrent(state);

        React.useEffect(() => {
            const fn = (evt: KeyboardEvent) => {
                if (evt.key === 'Enter') {
                    const state = latest.current;

                    const completed =
                        state.parts.length &&
                        coordKey(
                            state.parts[state.parts.length - 1].to.coord,
                        ) === coordKey(origin.coord);

                    if (completed) {
                        onComplete(state.parts);
                        evt.stopPropagation();
                        evt.preventDefault();
                        return;
                    }
                }
                if (evt.key === 'ArrowDown' || evt.key === 'j') {
                    evt.preventDefault();
                    evt.stopPropagation();
                    setState((state) => {
                        if (!state.parts.length) {
                            return state;
                        }
                        const last = state.parts[state.parts.length - 1];
                        const parts = state.parts.slice(0, -1);
                        const next = nextForState(
                            parts,
                            origin,
                            primitives,
                            intersections,
                        );
                        let idx = next.findIndex((seg) =>
                            segmentsEqual(
                                origin.coord,
                                last.segment,
                                seg.segment,
                            ),
                        );
                        if (idx == -1) {
                            idx = 0;
                            console.warn(
                                `Unable to find last one!!`,
                                next,
                                last.segment,
                            );
                        }
                        return { ...state, parts, next, selection: idx };
                    });
                }
                if (evt.key === 'ArrowUp' || evt.key === 'k') {
                    evt.preventDefault();
                    evt.stopPropagation();
                    // Go to the next one
                    setState((state) => {
                        if (state.selection >= state.next.length) {
                            return state;
                        }
                        const parts = state.parts.concat([
                            state.next[state.selection],
                        ]);
                        state = { ...state, parts };

                        const next = nextForState(
                            state.parts,
                            origin,
                            primitives,
                            intersections,
                        );
                        // console.log('GOT', next);

                        return {
                            ...state,
                            next,
                            selection: 0,
                        };
                    });
                }
                if (evt.key === 'ArrowLeft' || evt.key === 'h') {
                    evt.preventDefault();
                    evt.stopPropagation();
                    // go to the left
                    setState((state) => ({
                        ...state,
                        selection: (state.selection + 1) % state.next.length,
                    }));
                }
                if (evt.key === 'ArrowRight' || evt.key === 'l') {
                    evt.preventDefault();
                    evt.stopPropagation();
                    evt.stopImmediatePropagation();
                    setState((state) => ({
                        ...state,
                        selection:
                            state.selection === 0
                                ? state.next.length - 1
                                : state.selection - 1,
                    }));
                    // go right, yes folks
                }
            };
            document.addEventListener('keydown', fn, true);
            return () => document.removeEventListener('keydown', fn, true);
        });

        const current =
            state.parts.length == 0
                ? origin
                : state.parts[state.parts.length - 1].to;

        return (
            <>
                {completed ? (
                    <>
                        {transformedParts
                            ? transformedParts.map(
                                  (path) => (
                                      <RenderPath
                                          zoom={zoom}
                                          path={{
                                              group: null,
                                              id: '',
                                              created: 0,
                                              ordering: 0,
                                              hidden: false,
                                              origin: path.origin,
                                              segments: path.segments,
                                              style: {
                                                  lines: [],
                                                  fills: [{ color: 0 }],
                                              },
                                          }}
                                          groups={{}}
                                          palette={palette}
                                      />
                                  ),
                                  //   path.segments.map((seg, i) => (
                                  //       <RenderSegment
                                  //           key={i}
                                  //           segment={seg}
                                  //           zoom={zoom}
                                  //           prev={
                                  //               i === 0
                                  //                   ? path.origin
                                  //                   : path.segments[i - 1].to
                                  //           }
                                  //           color="rgba(0, 0, 255, 0.1)"
                                  //       />
                                  //   )),
                              )
                            : null}

                        <RenderPath
                            zoom={zoom}
                            path={{
                                group: null,
                                id: '',
                                created: 0,
                                ordering: 0,
                                hidden: false,
                                origin: origin.coord,
                                segments: state.parts.map((p) => p.segment),
                                style: { lines: [], fills: [{ color: 0 }] },
                            }}
                            onClick={() => {
                                onComplete(state.parts);
                            }}
                            groups={{}}
                            palette={palette}
                        />
                    </>
                ) : null}
                {transformedParts
                    ? transformedParts.map((path) =>
                          path.segments.map((seg, i) => (
                              <RenderSegment
                                  key={i}
                                  segment={seg}
                                  zoom={zoom}
                                  width={2}
                                  strokeDasharray="10 10"
                                  prev={
                                      i === 0
                                          ? path.origin
                                          : path.segments[i - 1].to
                                  }
                                  color="rgba(0, 0, 255, 0.6)"
                              />
                          )),
                      )
                    : null}

                {state.parts.map((seg, i) => (
                    <RenderSegment
                        key={i}
                        segment={seg.segment}
                        zoom={zoom}
                        prev={
                            i === 0 ? origin.coord : state.parts[i - 1].to.coord
                        }
                        color={'rgba(0, 0, 255, 1.0)'}
                        // onMouseOver={() => {
                        //     if (parts.length > i + 1) {
                        //         setParts(parts.slice(0, i + 1));
                        //     }
                        // }}
                    />
                ))}
                {/* {prev
                    ? prev.map((seg, i) => (
                          <RenderSegment
                              color="rgba(255, 0, 0, 0.5)"
                              key={i}
                              segment={seg.segment}
                              zoom={zoom}
                              prev={prevBase.coord}
                              //   onMouseOver={() => {
                              //       setParts(parts.slice(0, -1).concat([seg]));
                              //   }}
                          />
                      ))
                    : null} */}
                {completed
                    ? null
                    : state.next.map((seg, i) => (
                          <RenderSegment
                              key={i}
                              color={
                                  i === state.selection
                                      ? 'green'
                                      : 'rgba(25,255,0,0.2)'
                              }
                              segment={seg.segment}
                              zoom={zoom}
                              prev={current.coord}
                              //   onMouseOver={() => {
                              //       setParts(parts.concat([seg]));
                              //   }}
                          />
                      ))}
            </>
        );
    },
);

function nextForState(
    parts: Array<PendingSegment>,
    origin: Intersect,
    primitives: { prim: Primitive; guides: Array<Id> }[],
    intersections: Intersect[],
) {
    const covered = parts.map((part) => coordKey(part.to.coord));
    // const butLast = covered.slice(0, -1);
    const used = parts
        .map((part, i) => {
            const prev = i === 0 ? origin.coord : parts[i - 1].to.coord;
            return [
                segmentKey(prev, part.segment),
                segmentKeyReverse(prev, part.segment),
            ];
        })
        .flat();
    const current = parts.length == 0 ? origin : parts[parts.length - 1].to;

    let next = findNextSegments(
        { type: 'Path', origin, parts: parts },
        primitives.map((prim) => prim.prim),
        intersections,
    );

    // console.log(`GOT`, origin.coord, state.parts);
    // console.log(`NEXT`, next, next.map(p => segmentKey()))
    // console.log( covered, used);
    return next
        .filter(
            (seg, i) =>
                !covered.includes(coordKey(seg.to.coord)) &&
                !used.includes(segmentKey(current.coord, seg.segment)),
        )
        .sort((a, b) => {
            return -1;
        });
}
