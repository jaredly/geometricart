import * as React from 'react';
import {
    Angle,
    angleForSegment,
    anglesEqual,
    backAngle,
} from '../rendering/clipPath';
import { angleTo, dist, push } from '../rendering/getMirrorTransforms';
import { Coord } from '../types';
import { SegmentWithPrev } from '../rendering/clipPathNew';
import { HitTransitions } from '../rendering/untangleHit';
import { angleBetween } from '../rendering/findNextSegments';

export const pointsList = (points: Array<Coord>) =>
    points.map(({ x, y }) => `${x},${y}`).join(' ');

export const arrow = (coord: Coord, theta: number, size: number) => [
    push(coord, theta, size),
    push(coord, theta + (Math.PI * 2) / 3, size),
    push(coord, theta - (Math.PI * 2) / 3, size),
];

const Corner = ({
    coord,
    enter,
    exit,
    isInside,
    inner,
    size,
}: {
    coord: Coord;
    enter: Angle;
    exit: Angle;
    isInside: boolean | null;
    inner: boolean;
    size: number;
}) => {
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

export const ShowHitIntersection2 = ({
    zoom,
    pair,
    coord,
    arrowSize = 10 / 100,
}: // segments,
{
    coord: Coord;
    zoom: number;
    arrowSize?: number;
    pair: HitTransitions;
    // segments: Array<SegmentWithPrev>;
}) => {
    // iff hmmm segments is somehow different um
    // so maybe I can just have a flag on the config of the fixture?
    // yeah that sounds nice.
    switch (pair.type) {
        case 'straight':
            return (
                <Corner
                    coord={coord}
                    enter={pair.transition.entry.theta}
                    exit={pair.transition.exit.theta}
                    inner
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
                        inner
                        isInside
                        size={arrowSize}
                    />
                    <Corner
                        coord={coord}
                        enter={pair.back}
                        exit={pair.outside.theta}
                        inner={false}
                        isInside={false}
                        size={arrowSize}
                    />
                </>
            );
        case 'cross': {
            const [one, two] = pair.transitions;
            if (one.goingInside != true && two.goingInside != true) {
                // ugh how do I know which goes which way
                return (
                    <>
                        <Corner
                            coord={coord}
                            enter={one.entry.theta}
                            exit={one.exit.theta}
                            inner={
                                one.goingInside === null &&
                                two.goingInside === null
                                    ? !!two.goingInside
                                    : !one.goingInside
                            }
                            isInside={one.goingInside}
                            size={arrowSize}
                        />
                        <Corner
                            coord={coord}
                            enter={two.entry.theta}
                            exit={two.exit.theta}
                            inner={!two.goingInside}
                            isInside={two.goingInside}
                            size={arrowSize}
                        />
                    </>
                );
            } else {
                return (
                    <>
                        <Corner
                            coord={coord}
                            enter={one.entry.theta}
                            exit={one.exit.theta}
                            inner={!!one.goingInside}
                            isInside={one.goingInside}
                            size={arrowSize}
                        />
                        <Corner
                            coord={coord}
                            enter={two.entry.theta}
                            exit={two.exit.theta}
                            inner={!!two.goingInside}
                            isInside={two.goingInside}
                            size={arrowSize}
                        />
                    </>
                );
            }
        }
    }
    return null;
};
