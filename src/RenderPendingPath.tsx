import { jsx } from '@emotion/react';
import React from 'react';
import { dist } from './getMirrorTransforms';
import { RenderSegment } from './RenderSegment';
import { ArcSegment, PendingPath, PendingSegment } from './types';

export const RenderPendingPath = React.memo(
    ({
        next,
        path,
        zoom,
        onAdd,
    }: {
        next: Array<PendingSegment>;
        path: PendingPath;
        zoom: number;
        onAdd: (next: PendingSegment) => unknown;
    }) => {
        const current = path.parts.length
            ? path.parts[path.parts.length - 1].to
            : path.origin;

        return (
            <>
                {path.parts.map((part, i) => (
                    <RenderSegment
                        key={i}
                        segment={part.segment}
                        zoom={zoom}
                        prev={
                            i === 0
                                ? path.origin.coord
                                : path.parts[i - 1].to.coord
                        }
                    />
                ))}
                {next.map((seg, i) => {
                    return (
                        <RenderSegment
                            key={i}
                            segment={seg.segment}
                            zoom={zoom}
                            prev={current.coord}
                            onClick={() => onAdd(seg)}
                        />
                    );
                })}
            </>
        );
    },
);

export const arcPath = (segment: ArcSegment, zoom: number) => {
    const r = dist(segment.to, segment.center);
    return `A ${r * zoom} ${r * zoom} 0 0 ${segment.clockwise ? 1 : 0} ${
        segment.to.x * zoom
    } ${segment.to.y * zoom}`;
};
