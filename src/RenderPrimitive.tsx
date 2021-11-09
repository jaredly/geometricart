/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import { Primitive } from './intersect';

export function RenderPrimitive({
    prim,
    zoom,
    height,
    width,
}: {
    prim: Primitive;
    zoom: number;
    height: number;
    width: number;
}): jsx.JSX.Element {
    if (prim.type === 'line') {
        if (prim.m === Infinity) {
            if (prim.limit) {
                return (
                    <line
                        x1={prim.b * zoom}
                        y1={prim.limit[0] * zoom}
                        y2={prim.limit[1] * zoom}
                        x2={prim.b * zoom}
                        stroke="#666"
                        strokeWidth="1"
                    />
                );
            }
            return (
                <line
                    x1={prim.b * zoom}
                    y1={-height}
                    y2={height}
                    x2={prim.b * zoom}
                    stroke="#666"
                    strokeWidth="1"
                />
            );
        }
        if (prim.limit) {
            return (
                <line
                    x1={prim.limit[0] * zoom}
                    y1={prim.limit[0] * zoom * prim.m + prim.b * zoom}
                    x2={prim.limit[1] * zoom}
                    y2={prim.limit[1] * zoom * prim.m + prim.b * zoom}
                    stroke="#666"
                    strokeWidth="1"
                />
            );
        }

        return (
            <line
                x1={-width}
                y1={-width * prim.m + prim.b * zoom}
                x2={width}
                y2={prim.m * width + prim.b * zoom}
                stroke="#666"
                strokeWidth="1"
            />
        );
    }
    return (
        <circle
            cx={prim.center.x * zoom}
            cy={prim.center.y * zoom}
            r={prim.radius * zoom}
            stroke="#666"
            strokeWidth="1"
            fill="none"
        />
    );
}
