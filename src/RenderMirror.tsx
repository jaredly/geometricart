/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import { angleTo, applyMatrices, Matrix, push } from './getMirrorTransforms';
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
    const off = push(mirror.origin, d + Math.PI / 2, 0.2);
    const top = push(mirror.origin, d, 0.4);
    const line = { p1: off, p2: top };
    const lines = [line].concat(
        transforms.map((tr) => ({
            p1: applyMatrices(line.p1, tr),
            p2: applyMatrices(line.p2, tr),
        })),
    );
    return (
        <g style={{ pointerEvents: 'none', opacity: 0.3 }}>
            {lines.map(({ p1, p2 }, i) => (
                <line
                    key={i}
                    x1={p1.x * zoom}
                    y1={p1.y * zoom}
                    x2={p2.x * zoom}
                    y2={p2.y * zoom}
                    stroke={'#fa0'}
                    strokeWidth={'4'}
                />
            ))}
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
