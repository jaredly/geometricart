import { jsx } from '@emotion/react';
import React from 'react';
import { RenderPath } from './RenderPath';
import { coordKey, primitiveKey } from './calcAllIntersections';
import { RenderSegment } from './RenderSegment';
import { angleBetween, findNextSegments } from './findNextSegments';
import { epsilon, Primitive } from './intersect';
import {
    ArcSegment,
    Coord,
    Id,
    Intersect,
    PendingSegment,
    Segment,
} from './types';
import {
    angleTo,
    applyMatrices,
    dist,
    Matrix,
    push,
} from './getMirrorTransforms';
import { transformSegment } from './points';
import { useCurrent } from './App';
import { coordsEqual, segmentsEqual } from './pathsAreIdentical';

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
    primitives: Array<{ prim: Primitive; guides: Array<Id> }>,
    intersections: Array<Intersect>,
): State => {
    return {
        parts: [],
        selection: 0,
        next: nextForState([], origin, primitives, intersections),
        // findNextSegments(
        //     { type: 'Path', origin, parts: [] },
        //     primitives,
        //     intersections,
        // ),
    };
};

export const DrawPath = React.memo(
    ({
        primitives,
        intersections,
        mirror,
        origin,
        zoom,
        isClip,
        onComplete,
        palette,
    }: {
        isClip: boolean;
        mirror: null | Array<Array<Matrix>>;
        primitives: Array<{ prim: Primitive; guides: Array<Id> }>;
        origin: Intersect;
        zoom: number;
        intersections: Array<Intersect>;
        palette: Array<string>;
        onComplete: (segments: Array<PendingSegment>) => unknown;
    }) => {
        const [state, setState] = React.useState(() =>
            initialState(origin, primitives, intersections),
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
                        const index = state.parts.length - 1;
                        return backUpToIndex(
                            state,
                            index,
                            origin,
                            primitives,
                            intersections,
                        );
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

                        const completed =
                            state.parts.length &&
                            coordKey(
                                state.parts[state.parts.length - 1].to.coord,
                            ) === coordKey(origin.coord);
                        if (completed) {
                            return state;
                        }

                        const parts = state.parts.concat([
                            state.next[state.selection],
                        ]);

                        const next = nextForState(
                            parts,
                            origin,
                            primitives,
                            intersections,
                        );

                        return {
                            ...state,
                            parts,
                            next,
                            selection: 0,
                        };
                    });
                }
                if (evt.key === 'ArrowLeft' || evt.key === 'h') {
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
                }
                if (evt.key === 'ArrowRight' || evt.key === 'l') {
                    evt.preventDefault();
                    evt.stopPropagation();
                    // go to the left
                    setState((state) => ({
                        ...state,
                        selection: (state.selection + 1) % state.next.length,
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

        if (completed) {
            return (
                <>
                    {transformedParts
                        ? transformedParts.map((path) => (
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
                                          lines: [
                                              {
                                                  color: '#ccc',
                                                  dash: [10, 10],
                                                  width: 5,
                                              },
                                          ],
                                          fills: [{ color: 0 }],
                                      },
                                  }}
                                  groups={{}}
                                  palette={palette}
                              />
                          ))
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
                            style: {
                                lines: [
                                    {
                                        color: isClip ? 'magenta' : '#fff',
                                        width: 5,
                                    },
                                ],
                                fills: isClip ? [] : [{ color: 0 }],
                            },
                        }}
                        onClick={() => {
                            onComplete(state.parts);
                        }}
                        groups={{}}
                        palette={palette}
                    />
                </>
            );
        }

        return (
            <>
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
                        color={isClip ? 'magenta' : 'rgba(0, 0, 255, 1.0)'}
                        onClick={() => {
                            setState((state) =>
                                backUpToIndex(
                                    state,
                                    i,
                                    origin,
                                    primitives,
                                    intersections,
                                ),
                            );
                        }}
                    />
                ))}

                {state.next.map((seg, i) => (
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
                        onClick={() => {
                            setState((state) => {
                                const parts = state.parts.concat([seg]);

                                const next = nextForState(
                                    parts,
                                    origin,
                                    primitives,
                                    intersections,
                                );

                                return {
                                    ...state,
                                    parts,
                                    next,
                                    selection: 0,
                                };
                            });
                        }}
                    />
                ))}
            </>
        );
    },
);

export const segmentAngle = (
    prev: Coord,
    segment: Segment,
    initial: boolean = true,
) => {
    if (segment.type === 'Line') {
        return angleTo(prev, segment.to);
    }
    if (initial) {
        const t1 = angleTo(segment.center, prev);
        const t2 = angleTo(segment.center, segment.to);
        const bt = angleBetween(t1, t2, segment.clockwise);
        const tm = t1 + (bt / 2) * (segment.clockwise ? 1 : -1); // (t1 + t2) / 2;
        const d = dist(segment.center, segment.to);
        const midp = push(segment.center, tm, d);
        // console.log(segment, t1, t2, bt, tm);
        // const midp =
        // tangent at prev,
        return angleTo(prev, midp);
        // return (
        //     angleTo(segment.center, prev) +
        //     (Math.PI / 2) * (segment.clockwise ? 1 : -1)
        // );
    } else {
        // tangent at land
        return (
            angleTo(segment.center, segment.to) +
            (Math.PI / 2) * (segment.clockwise ? 1 : -1)
        );
    }
};

function backUpToIndex(
    state: State,
    index: number,
    origin: Intersect,
    primitives: { prim: Primitive; guides: Array<Id> }[],
    intersections: Intersect[],
) {
    const last = state.parts[index];
    const parts = state.parts.slice(0, index);
    const next = nextForState(parts, origin, primitives, intersections);
    let idx = next.findIndex((seg) =>
        segmentsEqual(origin.coord, last.segment, seg.segment),
    );
    if (idx == -1) {
        idx = 0;
        console.warn(`Unable to find last one!!`, next, last.segment);
    }
    return { ...state, parts, next, selection: idx };
}

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

    let prevAngle = parts.length
        ? segmentAngle(
              parts.length > 1
                  ? parts[parts.length - 2].to.coord
                  : origin.coord,
              parts[parts.length - 1].segment,
              false,
          )
        : 0;
    const prevArc =
        parts.length && parts[parts.length - 1].segment.type === 'Arc'
            ? (parts[parts.length - 1].segment as ArcSegment)
            : null;

    // console.log(`GOT`, origin.coord, state.parts);
    // console.log(`NEXT`, next, next.map(p => segmentKey()))
    // console.log( covered, used);
    next = next.filter(
        (seg, i) =>
            !covered.includes(coordKey(seg.to.coord)) &&
            !used.includes(segmentKey(current.coord, seg.segment)),
    );

    if (prevArc) {
        // prevAngle = segmentAngle(parts.length > 1 ? parts[parts.length - 2].to.coord, origin.coord
        const nextArc = next.find(
            (seg) =>
                seg.segment.type === 'Arc' &&
                coordsEqual(seg.segment.center, prevArc.center),
        );
        if (nextArc) {
            prevAngle = segmentAngle(current.coord, nextArc.segment, true);
        }
    }

    const angled = next.map((seg) => ({
        seg,
        angle: roundAlmostPi(
            angleBetween(
                prevAngle,
                segmentAngle(current.coord, seg.segment, true),
                true,
            ),
        ),
    }));

    console.log(prevAngle);
    console.log(angled);
    return angled
        .sort((a, b) => {
            if (
                prevArc &&
                a.seg.segment.type === 'Arc' &&
                coordsEqual(prevArc.center, a.seg.segment.center)
            ) {
                return -1;
            }
            if (
                prevArc &&
                b.seg.segment.type === 'Arc' &&
                coordsEqual(prevArc.center, b.seg.segment.center)
            ) {
                return 1;
            }
            return a.angle - b.angle;
        })
        .map((a) => a.seg);
}

export const roundAlmostPi = (angle: number) =>
    Math.abs(angle - Math.PI * 2) < epsilon ? 0 : angle;
