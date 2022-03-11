// Ok folks

import * as React from 'react';
import { arcPath } from '../src/editor/RenderPendingPath';
import { Arrow, arrow, pointsList } from '../src/editor/ShowHitIntersection2';
import { angleTo, dist, push } from '../src/rendering/getMirrorTransforms';
import { Coord } from '../src/types';

const angleArrow = (angle: number) => {
    return (
        <>
            <polyline
                points={pointsList([
                    push({ x: 10, y: 10 }, angle, 2),
                    push({ x: 10, y: 10 }, angle, -10),
                ])}
                stroke="red"
                strokeWidth={1}
                fill="none"
            />
            <polyline
                points={pointsList(
                    arrow(push({ x: 10, y: 10 }, angle, 4), angle, 5),
                )}
                fill={'red'}
            />
            <text x={20} y={20} fill="white" fontSize={6} textAnchor="end">
                {(angle / Math.PI).toFixed(2)}π
            </text>
        </>
    );
};

// Little things inline
export const widgets: {
    [key: string]: (args: any, output: any) => JSX.Element;
} = {
    push: ([coord, theta, dist], output: Coord) => {
        return (
            <svg
                width={'100%'}
                height={'100%'}
                viewBox="0 0 20 20"
                style={{ marginBottom: '-.2em' }}
            >
                {angleArrow(theta + (dist < 0 ? Math.PI : 0))}
            </svg>
        );
    },
    angleTo: (args: [Coord, Coord], output: number) => {
        return (
            <svg
                width={'100%'}
                height={'100%'}
                viewBox="0 0 20 20"
                style={{ marginBottom: '-.2em' }}
            >
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
        const around = push(
            mid,
            angleTo(mid, p1) + (3 / 8) * (args[2] ? -1 : 1),
            8,
        );
        // const arrowTheta =
        //     angleTo(mid, p1) + (Math.PI / 2) * (args[2] ? 1 : -1);
        return (
            <svg
                width={'100%'}
                height={'100%'}
                viewBox="0 0 20 20"
                style={{ marginBottom: '-.2em' }}
            >
                <path
                    d={`M10,10 L${p0.x},${p0.y} ` + d}
                    fill="white"
                    opacity={0.2}
                />
                <path d={`M${p0.x},${p0.y} ` + d} stroke="red" fill="none" />
                {output === 0 ? (
                    <polyline
                        points={pointsList([mid, p1])}
                        stroke="orange"
                        strokeWidth={1}
                        fill="none"
                    />
                ) : null}
                {/* <circle cx={p1.x} cy={p1.y} r={2} fill="orange" /> */}
                {output != 0 ? (
                    <Arrow
                        point={around}
                        theta={angleTo(around, p1)}
                        color="red"
                        size={7}
                    />
                ) : null}
            </svg>
        );
    },
    zeroToTwoPi: (args: [number], output: number) => {
        return (
            <svg
                width={'100%'}
                height={'100%'}
                viewBox="0 0 20 20"
                style={{ marginBottom: '-.2em' }}
            >
                {angleArrow(output)}
            </svg>
        );
    },
};

// Big things in the SVG
export const visuals: {
    [key: string]: (args: any, output: any) => JSX.Element;
} = {
    push: ([coord, theta, distance], output: Coord) => {
        const off = push(coord, theta, distance / 2);
        return (
            <>
                <circle cx={coord.x} cy={coord.y} r={5} fill="red" />
                <circle cx={output.x} cy={output.y} r={5} fill="black" />
                <polyline
                    points={pointsList([coord, off])}
                    stroke="black"
                    strokeWidth={3}
                    fill="none"
                />
                <Arrow
                    point={off}
                    theta={theta + (distance < 0 ? Math.PI : 0)}
                    color="black"
                    size={15}
                />
            </>
        );
    },
    angleTo: ([p1, p2]: [Coord, Coord], output: number) => {
        return (
            <>
                <polyline
                    points={pointsList([p1, p2])}
                    stroke="black"
                    strokeWidth={3}
                    fill="none"
                />
                <circle cx={p2.x} cy={p2.y} r={5} fill="black" />
                <circle cx={p1.x} cy={p1.y} r={5} fill="black" />
                <Arrow
                    point={push(p1, output, dist(p1, p2) / 2)}
                    theta={output}
                    color="black"
                    size={15}
                />
            </>
        );
    },
};
