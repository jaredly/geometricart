import { jsx } from '@emotion/react';
import React from 'react';
import { angleBetween } from '../rendering/findNextSegments';
import { angleTo, dist } from '../rendering/getMirrorTransforms';
import { RenderSegment } from './RenderSegment';
import { ArcSegment, Coord, PendingPath, PendingSegment } from '../types';

// export const angleDiff = (angle: number, base: number) => {
//     const res = angle - base;
//     if (res < -Math.PI) {
//         return res + Math.PI * 2;
//     }
//     if (res > Math.PI) {
//         return res - Math.PI * 2;
//     }
//     return res;
// };

export const arcPath = (segment: ArcSegment, prev: Coord, zoom: number) => {
    const r = dist(segment.to, segment.center);

    const largeArc = isLargeArc(segment, prev);
    const sweep = segment.clockwise;

    return `A ${r * zoom} ${r * zoom} 0 ${largeArc ? 1 : 0} ${sweep ? 1 : 0} ${
        segment.to.x * zoom
    } ${segment.to.y * zoom}`;
};

export function isLargeArc(segment: ArcSegment, prev: Coord) {
    const ve = angleTo(segment.center, segment.to);
    const vs = angleTo(segment.center, prev);
    const largeArc = angleBetween(vs, ve, segment.clockwise) > Math.PI;
    return largeArc;
}
