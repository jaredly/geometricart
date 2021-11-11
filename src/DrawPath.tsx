import { jsx } from '@emotion/react';
import React from 'react';
import { RenderPath } from './RenderPath';
import { coordKey, primitiveKey } from './calcAllIntersections';
import { RenderSegment } from './RenderSegment';
import { findNextSegments } from './findNextSegments';
import { Primitive } from './intersect';
import { Coord, Id, Intersect, PendingSegment, Segment } from './types';

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

export const DrawPath = React.memo(
    ({
        primitives,
        intersections,
        origin,
        zoom,
        onComplete,
        palette,
    }: {
        primitives: Array<{ prim: Primitive; guides: Array<Id> }>;
        origin: Intersect;
        zoom: number;
        intersections: Array<Intersect>;
        palette: Array<string>;
        onComplete: (segments: Array<PendingSegment>) => unknown;
    }) => {
        const [parts, setParts] = React.useState([] as Array<PendingSegment>);

        const covered = parts.map((part) => coordKey(part.to.coord));
        const butLast = covered.slice(0, -1);
        // .concat([coordKey(origin.coord)]);

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
        const next = findNextSegments(
            { type: 'Path', origin, parts },
            primitives.map((prim) => prim.prim),
            intersections,
        ).filter(
            (seg, i) =>
                !covered.includes(coordKey(seg.to.coord)) &&
                !used.includes(segmentKey(current.coord, seg.segment)),
        );
        const prevBase = parts.length < 2 ? origin : parts[parts.length - 2].to;
        const prev =
            parts.length > 0
                ? findNextSegments(
                      { type: 'Path', origin, parts: parts.slice(0, -1) },
                      primitives.map((prim) => prim.prim),
                      intersections,
                  ).filter(
                      (seg) =>
                          !butLast.includes(coordKey(seg.to.coord)) &&
                          !used.includes(
                              segmentKey(prevBase.coord, seg.segment),
                          ),
                      //   (seg) => coordKey(seg.to.coord) !== coordKey(current.coord),
                  )
                : null;

        // const nextSegments = React.useMemo(() => {
        //     return findNextSegments(
        //         { type: 'Path', origin, parts },
        //         primitives,
        //         intersections,
        //     );
        // }, [parts, intersections, primitives]);

        // console.log(next, prev, parts, used);

        const completed =
            parts.length &&
            coordKey(parts[parts.length - 1].to.coord) ===
                coordKey(origin.coord);

        return (
            <>
                {completed ? (
                    <RenderPath
                        zoom={zoom}
                        path={{
                            group: null,
                            id: '',
                            created: 0,
                            ordering: 0,
                            hidden: false,
                            origin: origin.coord,
                            segments: parts.map((p) => p.segment),
                            style: { lines: [], fills: [{ color: 0 }] },
                        }}
                        onClick={() => {
                            onComplete(parts);
                        }}
                        groups={{}}
                        palette={palette}
                    />
                ) : null}
                {parts.map((seg, i) => (
                    <RenderSegment
                        key={i}
                        segment={seg.segment}
                        zoom={zoom}
                        prev={i === 0 ? origin.coord : parts[i - 1].to.coord}
                        color="rgba(0, 0, 255, 1.0)"
                        onMouseOver={() => {
                            if (parts.length > i + 1) {
                                setParts(parts.slice(0, i + 1));
                            }
                        }}
                    />
                ))}
                {prev
                    ? prev.map((seg, i) => (
                          <RenderSegment
                              color="rgba(255, 0, 0, 0.5)"
                              key={i}
                              segment={seg.segment}
                              zoom={zoom}
                              prev={prevBase.coord}
                              onMouseOver={() => {
                                  setParts(parts.slice(0, -1).concat([seg]));
                              }}
                          />
                      ))
                    : null}
                {completed
                    ? null
                    : next.map((seg, i) => (
                          <RenderSegment
                              key={i}
                              color="rgba(0,255,0,0.5)"
                              segment={seg.segment}
                              zoom={zoom}
                              prev={current.coord}
                              onMouseOver={() => {
                                  setParts(parts.concat([seg]));
                              }}
                          />
                      ))}
            </>
        );
    },
);
