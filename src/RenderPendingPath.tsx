import { jsx } from '@emotion/react';
import React from 'react';
import { angleBetween } from './findNextSegments';
import { angleTo, dist } from './getMirrorTransforms';
import { RenderSegment } from './RenderSegment';
import { ArcSegment, Coord, PendingPath, PendingSegment } from './types';

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

export const angleDiff = (angle: number, base: number) => {
    const res = angle - base;
    if (res < -Math.PI) {
        return res + Math.PI * 2;
    }
    if (res > Math.PI) {
        return res - Math.PI * 2;
    }
    return res;
};

export const arcPath = (segment: ArcSegment, prev: Coord, zoom: number) => {
    const r = dist(segment.to, segment.center);

    const ve = angleTo(segment.center, segment.to);
    const vs = angleTo(segment.center, prev);
    const sve = angleDiff(ve, vs);
    // const esv = angleDiff(
    //     angleTo(prev, segment.center),
    //     angleTo(prev, segment.to),
    // );

    // const largeArc = false; // sve > 0; // Math.abs(sve) < Math.PI ? 0 : 1;
    const largeArc =
        angleBetween(
            vs,
            ve,
            segment.clockwise,
            // angleTo(segment.center, prev),
            // angleTo(segment.center, segment.to)
        ) > Math.PI;
    // const sweep = esv > 0;
    const sweep = segment.clockwise;

    return `A ${r * zoom} ${r * zoom} 0 ${largeArc ? 1 : 0} ${sweep ? 1 : 0} ${
        segment.to.x * zoom
    } ${segment.to.y * zoom}`;
};
