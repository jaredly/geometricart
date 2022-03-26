// Ok folks

import * as React from 'react';
import { arcPath } from '../src/editor/RenderPendingPath';
import { Arrow, arrow, pointsList } from '../src/editor/ShowHitIntersection2';
import { Angle } from '../src/rendering/clipPath';
import { angleTo, dist, push } from '../src/rendering/getMirrorTransforms';
import { Circle } from '../src/rendering/intersect';
import { SegmentIntersection } from '../src/rendering/untangleHit';
import { SegmentGroup } from '../src/rendering/untangleHitAgain';
import { ArcSegment, Coord } from '../src/types';
import { ShowSegmentIntersection } from './UntangleHit';

const angleArrow = (orig: number, reverse?: boolean) => {
    const angle = reverse ? orig + Math.PI : orig;
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
                {(orig / Math.PI).toFixed(2)}π
            </text>
        </>
    );
};

const showAmount = (amount: number, max: number) => {
    let d = '';
    const single = max / 20;
    for (let i = 0; i < 20; i++) {
        const mx = single * (i + 1);
        if (amount >= mx) {
            d += `M${i},0 L${i},20 `;
            continue;
        }
        const mn = single * i;
        if (amount < mn) {
            break;
        }
        d += `M${i},0 L${i},${((amount - mn) / single) * 20} `;
    }
    return d;
};

// Little things inline
export const widgets: {
    [key: string]: (args: any, output: any, size: string) => JSX.Element;
} = {
    dist: ([p1, p2]: [Coord, Coord], output: number, size: string) => {
        return (
            <svg
                width={'100%'}
                height={'100%'}
                viewBox="0 0 20 20"
                style={{ marginBottom: '-.2em' }}
            >
                <path
                    d={showAmount(output, 300)}
                    stroke="red"
                    strokeWidth={1}
                    fill="none"
                />
                <text x={20} y={20} fill="white" fontSize={6} textAnchor="end">
                    {output.toFixed(0)}
                </text>
            </svg>
        );
        // if (size === '1em') {
        //     return (
        //         <div
        //             style={{
        //                 fontSize: '.3em',
        //                 display: 'flex',
        //                 flexDirection: 'column',
        //                 textAlign: 'center',
        //                 alignItems: 'center',
        //                 justifyContent: 'center',
        //             }}
        //         >
        //             {output.toFixed(2)}
        //         </div>
        //     );
        // } else {
        //     return <div>{output.toFixed(10)}</div>;
        // }
    },
    'Math.cos': ([angle], output: number) => {
        const mid = { x: 10, y: 10 };
        return (
            <svg
                width={'100%'}
                height={'100%'}
                viewBox="0 0 20 20"
                style={{ marginBottom: '-.2em' }}
            >
                <polyline
                    points={pointsList([mid, push(mid, angle, 10)])}
                    stroke="red"
                    strokeWidth={0.5}
                    fill="none"
                />
                <polyline
                    points={pointsList([mid, push(mid, 0, 10 * output)])}
                    stroke="red"
                    strokeWidth={1}
                    fill="none"
                />
                <text x={20} y={20} fill="white" fontSize={6} textAnchor="end">
                    {(angle / Math.PI).toFixed(2)}π
                </text>
            </svg>
        );
    },
    push: ([coord, theta, dist], output: Coord) => {
        return (
            <svg
                width={'100%'}
                height={'100%'}
                viewBox="0 0 20 20"
                style={{ marginBottom: '-.2em' }}
            >
                {angleArrow(theta, dist < 0)}
            </svg>
        );
    },
    backAngle: (args: [Angle], output: Angle) => {
        return (
            <svg
                width={'100%'}
                height={'100%'}
                viewBox="0 0 20 20"
                style={{ marginBottom: '-.2em' }}
            >
                {angleArrow(output.theta)}
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
                <text x={20} y={20} fill="white" fontSize={6} textAnchor="end">
                    {(output / Math.PI).toFixed(2)}π
                </text>
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
    circleCircle: ([c1, c2], output: Array<Coord>, size) => {
        // if (size === '1em') {
        //     return <div>{output.length + ''}</div>;
        // }
        // return <div>{JSON.stringify(output)}</div>;
        return (
            <svg
                width={'100%'}
                height={'100%'}
                viewBox="0 0 20 20"
                style={{ marginBottom: '-.2em' }}
            >
                <circle cx={7} cy={7} r={5} stroke="currentColor" fill="none" />
                <circle
                    cx={13}
                    cy={13}
                    r={5}
                    stroke="currentColor"
                    fill="none"
                />
            </svg>
        );
    },
    SegmentGroup: (value: SegmentGroup) => {
        return (
            <svg
                width={'100%'}
                height={'100%'}
                viewBox="0 0 300 300"
                style={{ marginBottom: '-.2em' }}
            >
                <circle cx={150} cy={150} r={10} fill="black" />
                {value.entries.map((entry, i) => (
                    <ShowSegmentIntersection
                        key={i}
                        seg={{
                            coordKey: '',
                            distance: 0,
                            enter: value.kind.type === 'enter',
                            exit: value.kind.type === 'exit',
                            id: 0,
                            segment: entry.segment,
                            shape: entry.shape,
                            theta: entry.theta,
                        }}
                        scale={2}
                    />
                ))}
            </svg>
        );
    },
    SegmentIntersection: (value: SegmentIntersection) => {
        return (
            <svg
                width={'100%'}
                height={'100%'}
                viewBox="0 0 300 300"
                style={{ marginBottom: '-.2em' }}
            >
                <ShowSegmentIntersection seg={value} scale={2} />
            </svg>
        );
    },
};

const renderCircle = (
    circle: Circle,
    props: React.ComponentProps<'circle'> & React.ComponentProps<'path'>,
) => {
    if (!circle.limit) {
        return (
            <circle
                cx={circle.center.x}
                cy={circle.center.y}
                r={circle.radius}
                {...props}
            />
        );
    }
    const prev = push(circle.center, circle.limit[0], circle.radius);
    const seg: ArcSegment = {
        type: 'Arc',
        center: circle.center,
        to: push(circle.center, circle.limit[1], circle.radius),
        clockwise: true,
    };
    return (
        <path d={`M${prev.x},${prev.y} ` + arcPath(seg, prev, 1)} {...props} />
    );
};

// Big things in the SVG
export const visuals: {
    [key: string]: (args: any, output: any) => JSX.Element;
} = {
    circleCircle: ([c1, c2]: [Circle, Circle], points: Array<Coord>) => {
        const shared = {
            stroke: 'currentColor',
            fill: 'none',
            strokeWidth: 1,
            strokeDasharray: '1 1',
        };
        return (
            <>
                {renderCircle(c1, shared)}
                {renderCircle(c2, shared)}
                {points.map((p, i) => (
                    <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={4}
                        fill="currentColor"
                        stroke="red"
                        strokeWidth={1}
                    />
                ))}
            </>
        );
    },
    dist: ([c1, c2], length) => {
        return (
            <>
                <circle cx={c1.x} cy={c1.y} r={5} fill="currentColor" />
                <circle cx={c2.x} cy={c2.y} r={5} fill="currentColor" />
                <polyline
                    points={pointsList([c1, c2])}
                    stroke="currentColor"
                    strokeWidth={2}
                    fill="none"
                />
            </>
        );
    },
    push: ([coord, theta, distance], output: Coord) => {
        const off = push(coord, theta, distance / 2);
        return (
            <>
                <circle cx={coord.x} cy={coord.y} r={5} fill="currentColor" />
                <circle cx={output.x} cy={output.y} r={5} fill="currentColor" />
                <polyline
                    points={pointsList([coord, off])}
                    stroke="currentColor"
                    strokeWidth={3}
                    fill="none"
                />
                <Arrow
                    point={off}
                    theta={theta + (distance < 0 ? Math.PI : 0)}
                    color="currentColor"
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
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeDasharray="3 3"
                    fill="none"
                />
                <circle cx={p2.x} cy={p2.y} r={5} fill="currentColor" />
                <circle cx={p1.x} cy={p1.y} r={5} fill="currentColor" />
                <Arrow
                    point={push(p1, output, dist(p1, p2) / 2)}
                    theta={output}
                    color="currentColor"
                    size={15}
                />
            </>
        );
    },
};
