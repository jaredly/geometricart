import { jsx } from '@emotion/react';
import React from 'react';
import { RenderPath } from './RenderPath';
import { coordKey, primitiveKey } from './calcAllIntersections';
import { RenderSegment } from './RenderSegment';
import { findNextSegments } from './findNextSegments';
import { Primitive } from './intersect';
import { Intersect, PendingSegment } from './types';

export const DrawPath = ({
    primitives,
    intersections,
    origin,
    zoom,
    onComplete,
}: {
    primitives: Array<Primitive>;
    origin: Intersect;
    zoom: number;
    intersections: Array<Intersect>;
    onComplete: (segments: Array<PendingSegment>) => unknown;
}) => {
    const [parts, setParts] = React.useState([] as Array<PendingSegment>);

    const next = findNextSegments(
        { type: 'Path', origin, parts },
        primitives,
        intersections,
    );
    const current = parts.length == 0 ? origin : parts[parts.length - 1].to;
    const prev =
        parts.length > 0
            ? findNextSegments(
                  { type: 'Path', origin, parts: parts.slice(0, -1) },
                  primitives,
                  intersections,
              ).filter(
                  (seg) => coordKey(seg.to.coord) !== coordKey(current.coord),
              )
            : null;

    // const nextSegments = React.useMemo(() => {
    //     return findNextSegments(
    //         { type: 'Path', origin, parts },
    //         primitives,
    //         intersections,
    //     );
    // }, [parts, intersections, primitives]);

    const prevBase = parts.length < 2 ? origin : parts[parts.length - 2].to;

    const completed =
        parts.length &&
        coordKey(parts[parts.length - 1].to.coord) === coordKey(origin.coord);

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
                        origin: origin.coord,
                        segments: parts.map((p) => p.segment),
                        style: { lines: [], fills: [{ color: 'green' }] },
                    }}
                    onClick={() => {
                        onComplete(parts);
                    }}
                    groups={{}}
                />
            ) : null}
            {parts.map((seg, i) => (
                <RenderSegment
                    key={i}
                    segment={seg.segment}
                    zoom={zoom}
                    prev={i === 0 ? origin.coord : parts[i - 1].to.coord}
                    color="white"
                    onMouseOver={() => {
                        if (parts.length > i + 1) {
                            setParts(parts.slice(0, i));
                        }
                    }}
                />
            ))}
            {prev
                ? prev.map((seg, i) => (
                      <RenderSegment
                          color="rgba(100, 100, 100, 0.1)"
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
                          color="rgba(255,255,0,0.1)"
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
};
