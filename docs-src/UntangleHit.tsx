import * as React from 'react';
import { arcPath } from '../src/editor/RenderPendingPath';
import { arrow, pointsList } from '../src/editor/ShowHitIntersection2';
import {
    HitsInfo,
    intersectSegments,
    SegmentWithPrev,
} from '../src/rendering/clipPathNew';
import { push } from '../src/rendering/getMirrorTransforms';
import { SegmentIntersection } from '../src/rendering/untangleHit';
import { HitTransition, untangleHit } from '../src/rendering/untangleHitAgain';
import { Coord } from '../src/types';
import { Fixture } from '../src/vest/types';
import { Fixtures } from './Fixtures';
import fixtures from './untangleHit.json';

type I = Parameters<typeof untangleHit>;
const mid = { x: 150, y: 150 };

const colors = ['red', 'green', 'blue'];

const ShowSegmentIntersection = ({
    seg,
    scale,
}: {
    scale: number;
    seg: SegmentIntersection;
}) => {
    if (seg.theta.type === 'flat') {
        return (
            <>
                {seg.enter ? (
                    <polyline
                        points={pointsList([
                            mid,
                            push(mid, seg.theta.theta, -100),
                        ])}
                        stroke={colors[seg.shape]}
                        strokeWidth={2 * scale}
                    />
                ) : null}
                {seg.exit ? (
                    <polyline
                        points={pointsList([
                            mid,
                            push(mid, seg.theta.theta, 100),
                        ])}
                        stroke={colors[seg.shape]}
                        strokeWidth={2 * scale}
                    />
                ) : null}
                {seg.exit ? (
                    <polygon
                        points={pointsList(
                            arrow(
                                push(mid, seg.theta.theta, 100),
                                seg.theta.theta,
                                5 * scale,
                            ),
                        )}
                        fill={colors[seg.shape]}
                        strokeWidth={2 * scale}
                    />
                ) : null}
            </>
        );
    } else {
        const centerTo =
            seg.theta.theta + (Math.PI / 2) * (seg.theta.clockwise ? 1 : -1);
        const center = push(mid, centerTo, seg.theta.radius);
        return (
            <>
                {seg.enter ? (
                    <path
                        stroke={colors[seg.shape]}
                        strokeWidth={2 * scale}
                        fill="none"
                        d={arcPath(
                            {
                                type: 'Arc',
                                center,
                                clockwise: seg.theta.clockwise,
                                to: mid,
                            },
                            push(
                                center,
                                centerTo + Math.PI - Math.PI / 2,
                                seg.theta.radius,
                            ),
                            1,
                            true,
                        )}
                    />
                ) : null}
                {seg.exit ? (
                    <>
                        <path
                            stroke={colors[seg.shape]}
                            strokeWidth={2 * scale}
                            fill="none"
                            d={arcPath(
                                {
                                    type: 'Arc',
                                    center,
                                    clockwise: seg.theta.clockwise,
                                    to: push(
                                        center,
                                        centerTo + Math.PI - Math.PI / 2,
                                        seg.theta.radius,
                                    ),
                                },
                                mid,
                                1,
                                true,
                            )}
                        />
                        <polygon
                            points={pointsList(
                                arrow(
                                    push(
                                        center,
                                        centerTo + Math.PI - Math.PI / 2,
                                        seg.theta.radius,
                                    ),
                                    // seg.theta.theta,
                                    centerTo +
                                        Math.PI -
                                        Math.PI / 2 -
                                        Math.PI / 2,
                                    5 * scale,
                                ),
                            )}
                            fill={colors[seg.shape]}
                            strokeWidth={2 * scale}
                        />
                    </>
                ) : null}
            </>
        );
    }
};

const Input = ({
    input: [intersections],
    scale,
}: {
    input: I;
    onChange?: (i: I) => void;
    scale: number;
}) => {
    return (
        <>
            {intersections.map((seg, i) => (
                <ShowSegmentIntersection key={i} scale={scale} seg={seg} />
            ))}
        </>
    );
};

const size = 300 / 5;

const Output = ({
    input,
    output,
    scale,
}: {
    input: I;
    output: ReturnType<typeof untangleHit>;
    scale: number;
}) => {
    return (
        <>
            {output.map((output, i) => (
                <ShowTransition
                    transition={output}
                    pos={{ x: (i + 0.5) * size, y: 300 - size / 2 }}
                    size={size}
                    key={i}
                />
            ))}
        </>
    );
};

const ShowTransition = ({
    transition,
    size,
    pos,
}: {
    size: number;
    pos: Coord;
    transition: HitTransition;
}) => {
    return (
        <>
            {transition.entries.map((entry, i) => (
                <polyline
                    points={pointsList([
                        pos,
                        push(pos, entry.theta.theta, -size / 2),
                    ])}
                    stroke={colors[entry.shape]}
                    strokeWidth={2}
                    key={i}
                />
            ))}
            {transition.exits.map((exit, i) => (
                <React.Fragment key={i}>
                    <polyline
                        points={pointsList([
                            pos,
                            push(pos, exit.exit.theta.theta, size / 2),
                        ])}
                        stroke={colors[exit.exit.shape]}
                        strokeWidth={2}
                    />
                    <polygon
                        points={pointsList(
                            arrow(
                                push(pos, exit.exit.theta.theta, size / 2),
                                exit.exit.theta.theta,
                                5,
                            ),
                        )}
                        fill={
                            exit.goingInside === null
                                ? 'orange'
                                : exit.goingInside
                                ? 'black'
                                : 'white'
                        }
                        stroke="black"
                        strokeWidth={1}
                    />
                </React.Fragment>
            ))}
        </>
    );
    return null;
};

const getHit = (hits: HitsInfo['hits']) => {
    const keys = Object.keys(hits).sort(
        (a, b) => hits[b].parties.length - hits[a].parties.length,
    );
    if (!keys.length) {
        return null;
    }
    try {
        const hit = hits[keys[0]];
        return hit.parties;
    } catch (e) {}
    return null;
};

const fx = fixtures.map((fx): Fixture<typeof untangleHit> => {
    const { hits } = intersectSegments(fx.input as SegmentWithPrev[]);
    const hit = getHit(hits);
    if (!hit) {
        throw new Error(`No valid intersection`);
    }
    return { ...fx, input: [hit], output: [] as Array<HitTransition> };
});

export const UntangleHit = () => (
    <Fixtures
        Input={Input}
        editDelay={100}
        Output={Output}
        run={untangleHit}
        fixtures={fx}
    />
);
