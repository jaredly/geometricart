/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { Primitive } from './intersect';

export function RenderPrimitive({
    prim,
    zoom,
    height,
    width,
    onClick,
    inactive,
}: {
    prim: Primitive;
    zoom: number;
    height: number;
    width: number;
    inactive?: boolean;
    onClick?: (evt: React.MouseEvent) => unknown;
}): jsx.JSX.Element {
    const common = {
        stroke: inactive ? 'rgba(102, 102, 102, 0.3)' : '#666',
        strokeWidth: '1',
        onClick: onClick,
        style: onClick ? { cursor: 'pointer' } : {},
    };
    if (prim.type === 'line') {
        if (prim.m === Infinity) {
            if (prim.limit) {
                return (
                    <line
                        x1={prim.b * zoom}
                        y1={prim.limit[0] * zoom}
                        y2={prim.limit[1] * zoom}
                        x2={prim.b * zoom}
                        {...common}
                    />
                );
            }
            return (
                <line
                    x1={prim.b * zoom}
                    y1={-height}
                    y2={height}
                    x2={prim.b * zoom}
                    {...common}
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
                    {...common}
                />
            );
        }

        return (
            <line
                x1={-width}
                y1={-width * prim.m + prim.b * zoom}
                x2={width}
                y2={prim.m * width + prim.b * zoom}
                {...common}
            />
        );
    }
    return (
        <circle
            cx={prim.center.x * zoom}
            cy={prim.center.y * zoom}
            r={prim.radius * zoom}
            fill="none"
            {...common}
        />
    );
}
