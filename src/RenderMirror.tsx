/* @jsx jsx */
/* @jsxFrag React.Fragment */
import * as React from 'react';
import { jsx } from '@emotion/react';
import {
    angleTo,
    applyMatrices,
    dist,
    Matrix,
    push,
} from './getMirrorTransforms';
import { Mirror } from './types';

export const RenderMirror = ({
    mirror,
    transforms,
    zoom,
}: {
    mirror: Mirror;
    transforms: Array<Array<Matrix>>;
    zoom: number;
}) => {
    const d = angleTo(mirror.origin, mirror.point);
    const len = dist(mirror.origin, mirror.point);
    const mid = push(mirror.origin, d, len / 2);
    const off = mirror.reflect ? push(mid, d + Math.PI / 2, len / 4) : mid;
    // const top = push(mirror.origin, d, len);
    const line = { p1: off, p2: mirror.point };
    const lines = [line].concat(
        transforms.map((tr) => ({
            p1: applyMatrices(line.p1, tr),
            p2: applyMatrices(line.p2, tr),
        })),
    );
    return (
        <g style={{ pointerEvents: 'none' }}>
            {lines.map(({ p1, p2 }, i) => (
                <>
                    <line
                        key={i}
                        x1={p1.x * zoom}
                        y1={p1.y * zoom}
                        x2={p2.x * zoom}
                        y2={p2.y * zoom}
                        stroke={'#000'}
                        strokeWidth={'6'}
                    />
                    <line
                        key={`${i}-`}
                        x1={p1.x * zoom}
                        y1={p1.y * zoom}
                        x2={p2.x * zoom}
                        y2={p2.y * zoom}
                        stroke={'#fa0'}
                        strokeWidth={'4'}
                    />
                </>
            ))}
            <line
                x1={mirror.origin.x * zoom}
                y1={mirror.origin.y * zoom}
                x2={mirror.point.x * zoom}
                y2={mirror.point.y * zoom}
                stroke={'#fa0'}
                strokeWidth={'2'}
                strokeDasharray="5 5"
            />
            <circle
                r={10}
                cx={mirror.point.x * zoom}
                cy={mirror.point.y * zoom}
                fill="none"
                stroke="#fa0"
            />
        </g>
    );
};
