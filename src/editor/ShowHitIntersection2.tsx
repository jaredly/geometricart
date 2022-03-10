import * as React from 'react';
import {
    Angle,
    angleForSegment,
    anglesEqual,
    backAngle,
    isAngleBetweenAngles,
} from '../rendering/clipPath';
import { angleTo, dist, push } from '../rendering/getMirrorTransforms';
import { Coord } from '../types';
import { SegmentWithPrev } from '../rendering/clipPathNew';
import { HitTransitions } from '../rendering/untangleHit';
import { angleBetween } from '../rendering/findNextSegments';

export const pointsList = (points: Array<Coord>) =>
    points.map(({ x, y }) => `${x},${y}`).join(' ');

export const arrow = (coord: Coord, theta: number, size: number, wsize = 1) => [
    push(coord, theta, size),
    push(coord, theta + (Math.PI * 2) / 3, size * wsize),
    push(coord, theta - (Math.PI * 2) / 3, size * wsize),
];

const isInner = (
    enter: Angle,
    exit: Angle,
    other: { entry: Angle; exit: Angle },
) => {
    const back = backAngle(enter);
    if (
        isAngleBetweenAngles(back, backAngle(other.entry), exit, true) ||
        isAngleBetweenAngles(back, other.exit, exit, true)
    ) {
        return true;
    }
    return false;
};

const Corner = ({
    coord,
    enter,
    exit,
    isInside,
    other,
    // inner,
    size,
}: {
    coord: Coord;
    enter: Angle;
    exit: Angle;
    other: null | { entry: Angle; exit: Angle };
    isInside: boolean | null;
    // inner: boolean;
    size: number;
}) => {
    const inner = other ? isInner(enter, exit, other) : true;

    const back = backAngle(enter);
    const between = angleBetween(back.theta, exit.theta, true);
    // const innerAngle =
    const perp = back.theta + between / 2 + Math.PI * (inner ? 1 : 0); // * (inner ? -1 : 1);
    const p1 = push(coord, perp, size / 2);
    const p0 = push(p1, back.theta, size);
    const p2 = push(p1, exit.theta, size);
    const color = isInside === null ? 'magenta' : isInside ? 'white' : 'orange';
    return (
        <>
            <polyline
                points={pointsList([p0, p1, p2])}
                strokeWidth={size / 4}
                stroke={color}
                fill="none"
            />
            <polygon
                points={pointsList(arrow(p2, exit.theta, size / 2))}
                fill={color}
            />
        </>
    );
};

export const Arrow = ({
    point,
    theta,
    size,
    color,
}: {
    point: Coord;
    theta: number;
    size: number;
    color: string;
}) => {
    return (
        <polygon
            points={pointsList(arrow(point, theta, size / 2))}
            fill={color}
        />
    );
};

export const ShowHitIntersection2 = ({
    zoom,
    pair,
    coord,
    arrowSize = 10 / 100,
}: {
    coord: Coord;
    zoom: number;
    arrowSize?: number;
    pair: HitTransitions;
}) => {
    switch (pair.type) {
        case 'straight':
            return (
                <Corner
                    coord={coord}
                    enter={pair.transition.entry.theta}
                    exit={pair.transition.exit.theta}
                    other={null}
                    isInside={null}
                    size={arrowSize}
                />
            );
        case 'ambiguous':
            return (
                <>
                    <Corner
                        coord={coord}
                        enter={pair.back}
                        exit={pair.inside.theta}
                        other={{ entry: pair.back, exit: pair.outside.theta }}
                        isInside
                        size={arrowSize}
                    />
                    <Corner
                        coord={coord}
                        enter={pair.back}
                        exit={pair.outside.theta}
                        other={{ entry: pair.back, exit: pair.inside.theta }}
                        isInside={false}
                        size={arrowSize}
                    />
                </>
            );
        case 'cross': {
            const [one, two] = pair.transitions;
            return (
                <>
                    <Corner
                        coord={coord}
                        enter={one.entry.theta}
                        exit={one.exit.theta}
                        other={{ entry: two.entry.theta, exit: two.exit.theta }}
                        isInside={one.goingInside}
                        size={arrowSize}
                    />
                    <Corner
                        coord={coord}
                        enter={two.entry.theta}
                        exit={two.exit.theta}
                        other={{ entry: one.entry.theta, exit: one.exit.theta }}
                        isInside={two.goingInside}
                        size={arrowSize}
                    />
                </>
            );
        }
    }
    return null;
};
