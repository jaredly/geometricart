/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { push } from './getMirrorTransforms';
import { Bounds, visibleEndPoints } from './GuideElement';
import { Primitive } from './intersect';
import { arcPath } from './RenderPendingPath';

export function RenderPrimitive({
    prim,
    zoom,
    height,
    width,
    onClick,
    isImplied,
    bounds,
    color,
    inactive,
    strokeWidth = 1,
}: // strokeDasharray,
{
    color?: string;
    isImplied?: boolean;
    prim: Primitive;
    bounds: Bounds;
    zoom: number;
    height: number;
    width: number;
    inactive?: boolean;
    strokeWidth?: number;
    onClick?: (evt: React.MouseEvent) => unknown;
    // strokeDasharray?: Array<number>
}): jsx.JSX.Element {
    const common = {
        stroke: color ?? (inactive ? 'rgba(102, 102, 102, 0.3)' : '#666'),
        strokeWidth,
        onClick: onClick,
        style: onClick ? { cursor: 'pointer' } : {},
        strokeDasharray: isImplied ? '3 3' : '',

        css: onClick
            ? {
                  ':hover': {
                      stroke: '#fff',
                  },
              }
            : {},
    };
    if (prim.type === 'line') {
        if (prim.limit) {
            if (prim.m === Infinity) {
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
                    x1={prim.limit[0] * zoom}
                    y1={prim.limit[0] * zoom * prim.m + prim.b * zoom}
                    x2={prim.limit[1] * zoom}
                    y2={prim.limit[1] * zoom * prim.m + prim.b * zoom}
                    {...common}
                />
            );
        } else {
            const [left, right] = visibleEndPoints(prim, bounds);
            return (
                <line
                    x1={left.x * zoom}
                    y1={left.y * zoom}
                    x2={right.x * zoom}
                    y2={right.y * zoom}
                    {...common}
                />
            );
        }
        // if (prim.m === Infinity) {
        //     if (prim.limit) {
        //         return (
        //             <line
        //                 x1={prim.b * zoom}
        //                 y1={prim.limit[0] * zoom}
        //                 y2={prim.limit[1] * zoom}
        //                 x2={prim.b * zoom}
        //                 {...common}
        //             />
        //         );
        //     }
        //     return (
        //         <line
        //             x1={prim.b * zoom}
        //             y1={-height}
        //             y2={height}
        //             x2={prim.b * zoom}
        //             {...common}
        //         />
        //     );
        // }
        // if (prim.limit) {
        //     return (
        //         <line
        //             x1={prim.limit[0] * zoom}
        //             y1={prim.limit[0] * zoom * prim.m + prim.b * zoom}
        //             x2={prim.limit[1] * zoom}
        //             y2={prim.limit[1] * zoom * prim.m + prim.b * zoom}
        //             {...common}
        //         />
        //     );
        // }

        // return (
        //     <line
        //         x1={-width}
        //         y1={-width * prim.m + prim.b * zoom}
        //         x2={width}
        //         y2={prim.m * width + prim.b * zoom}
        //         {...common}
        //     />
        // );
    }
    if (prim.limit && prim.limit[0] !== prim.limit[1]) {
        const [t0, t1] = prim.limit;
        const p0 = push(prim.center, t0, prim.radius);
        return (
            <path
                d={`M${p0.x * zoom},${p0.y * zoom} ${arcPath(
                    {
                        type: 'Arc',
                        center: prim.center,
                        clockwise: true,
                        to: push(prim.center, t1, prim.radius),
                    },
                    p0,
                    zoom,
                )}`}
                {...common}
                fill="none"
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
