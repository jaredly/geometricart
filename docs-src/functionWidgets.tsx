// Ok folks

import * as React from 'react';
import { arrow, pointsList } from '../src/editor/ShowHitIntersection2';
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
                strokeWidth={2}
                fill="none"
            />
            <polyline
                points={pointsList(arrow({ x: 10, y: 10 }, angle, 10, 0.5))}
                fill={'red'}
            />
            <text x={20} y={15} fill="white" fontSize={8} textAnchor="end">
                {((angle / Math.PI) * 180).toFixed(0)}
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
        return (
            <svg width={20} height={20}>
                {angleArrow(output)}
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
