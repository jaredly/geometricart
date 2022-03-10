// Ok folks

import * as React from 'react';
import { arcPath } from '../src/editor/RenderPendingPath';
import { Arrow, arrow, pointsList } from '../src/editor/ShowHitIntersection2';
import { angleTo, push } from '../src/rendering/getMirrorTransforms';
import { Coord } from '../src/types';

const angleArrow = (angle: number) => {
    return (
        <>
            <polyline
                points={pointsList([
                    push({ x: 10, y: 10 }, angle, 5),
                    push({ x: 10, y: 10 }, angle, -10),
                ])}
                stroke="red"
                strokeWidth={1}
                fill="none"
            />
            <polyline
                points={pointsList(arrow({ x: 10, y: 10 }, angle, 5))}
                fill={'red'}
            />
            <text x={20} y={15} fill="white" fontSize={6} textAnchor="end">
                {(angle / Math.PI).toFixed(2)}π
            </text>
        </>
    );
};

// Little things inline
export const widgets: {
    [key: string]: (args: any, output: any) => JSX.Element;
} = {
    angleTo: (args: [Coord, Coord], output: number) => {
        return (
            <svg width={20} height={20}>
                {angleArrow(output)}
            </svg>
        );
    },
    angleBetween: (args: [number, number, boolean], output: number) => {
        const mid = { x: 10, y: 10 };
        const p0 = push(mid, args[0], 8);
        const p1 = push(mid, args[1], 8);
        const d = arcPath(
            {
                type: 'Arc',
                center: mid,
                clockwise: args[2],
                to: p1,
            },
            p0,
            1,
        );
        return (
            <svg width={20} height={20}>
                <path d={`M10,10 L${p0.x},${p0.y} ` + d} fill="blue" />
                <path d={`M${p0.x},${p0.y} ` + d} stroke="red" fill="none" />
                <polyline
                    points={pointsList([mid, p1])}
                    stroke="orange"
                    strokeWidth={1}
                    fill="none"
                />
                <circle cx={p1.x} cy={p1.y} r={2} fill="orange" />
            </svg>
        );
    },
    zeroToTwoPi: (args: [number], output: number) => {
        return (
            <svg width={20} height={20}>
                {angleArrow(output)}
            </svg>
        );
    },
};

// Big things in the SVG
export const visuals = {
    angleTo: (args: [Coord, Coord], output: number) => {},
};
