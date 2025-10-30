
import {arcPath} from '../src/editor/RenderPendingPath';
import {arrow, pointsList} from '../src/editor/ShowHitIntersection2';
import {Angle} from '../src/rendering/epsilonToZero';
import {HitsInfo, intersectSegments, SegmentWithPrev} from '../src/rendering/clipPathNew';
import {push} from '../src/rendering/getMirrorTransforms';
import {SegmentIntersection} from '../src/rendering/untangleHit';
import {HitCorner, untangleHit} from '../src/rendering/untangleHitAgain';
import {Coord} from '../src/types';
import {Fixture} from '../src/vest/types';
import {Fixtures} from './Fixtures';
import fixtures from './untangleHit.json';

type I = Parameters<typeof untangleHit>;
const mid = {x: 150, y: 150};

const colors = ['red', 'green', 'blue'];

export const ShowAngle = ({
    angle,
    enter,
    color,
    scale,
    headColor,
    size = 100,
    center = mid,
}: {
    color: string;
    scale: number;
    angle: Angle;
    enter: boolean;
    headColor?: string;
    size?: number;
    center?: Coord;
}) => {
    if (angle.type === 'flat') {
        return (
            <>
                {enter ? (
                    <polyline
                        points={pointsList([center, push(center, angle.theta, -size)])}
                        stroke={color}
                        strokeLinecap="round"
                        strokeWidth={2 * scale}
                    />
                ) : (
                    <>
                        <polyline
                            points={pointsList([center, push(center, angle.theta, size)])}
                            strokeLinecap="round"
                            stroke={color}
                            strokeWidth={2 * scale}
                        />
                        <polygon
                            points={pointsList(
                                arrow(push(center, angle.theta, size), angle.theta, 5 * scale),
                            )}
                            fill={headColor ?? color}
                            strokeWidth={2 * scale}
                            stroke={headColor ? 'black' : color}
                        />
                    </>
                )}
            </>
        );
    } else {
        const rad = angle.radius * (1 / scale);
        const centerTo = angle.theta + (Math.PI / 2) * (angle.clockwise ? 1 : -1);
        const arcCenter = push(center, centerTo, rad);
        return (
            <>
                {enter ? (
                    <path
                        stroke={color}
                        strokeWidth={2 * scale}
                        fill="none"
                        strokeLinecap="round"
                        d={arcPath(
                            {
                                type: 'Arc',
                                center: arcCenter,
                                clockwise: angle.clockwise,
                                to: center,
                            },
                            push(arcCenter, centerTo + Math.PI - Math.PI / 2, rad),
                            1,
                            true,
                        )}
                    />
                ) : (
                    <>
                        <path
                            stroke={color}
                            strokeWidth={2 * scale}
                            fill="none"
                            strokeLinecap="round"
                            d={arcPath(
                                {
                                    type: 'Arc',
                                    center: arcCenter,
                                    clockwise: angle.clockwise,
                                    to: push(arcCenter, centerTo + Math.PI - Math.PI / 2, rad),
                                },
                                center,
                                1,
                                true,
                            )}
                        />
                        <polygon
                            points={pointsList(
                                arrow(
                                    push(arcCenter, centerTo + Math.PI - Math.PI / 2, rad),
                                    // angle.theta,
                                    centerTo + Math.PI - Math.PI / 2 - Math.PI / 2,
                                    5 * scale,
                                ),
                            )}
                            fill={color}
                            strokeWidth={2 * scale}
                        />
                    </>
                )}
            </>
        );
    }
};

export const ShowSegmentIntersection = ({
    seg,
    scale,
}: {
    scale: number;
    seg: SegmentIntersection;
}) => {
    return (
        <>
            {seg.enter ? (
                <ShowAngle angle={seg.theta} enter color={colors[seg.shape]} scale={scale} />
            ) : null}
            {seg.exit ? (
                <ShowAngle
                    angle={seg.theta}
                    enter={false}
                    color={colors[seg.shape]}
                    scale={scale}
                />
            ) : null}
        </>
    );
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
            {output.map((corner, i) => (
                <ShowTransition
                    transition={corner}
                    pos={{
                        x: 300 / 2 + (i - output.length / 2 + 0.5) * size,
                        y: 300 - size / 2,
                    }}
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
    transition: HitCorner;
}) => {
    return (
        <>
            <circle cx={pos.x} cy={pos.y} r={size / 10} fill={'black'} />
            {transition.entries.map((entry, i) => (
                <ShowAngle
                    key={i}
                    angle={entry.theta}
                    enter={true}
                    color={colors[entry.shape]}
                    center={pos}
                    scale={2}
                    size={size / 2}
                />
            ))}
            {transition.exits.map((exit, i) => (
                <ShowAngle
                    key={i}
                    angle={exit.exit.theta}
                    enter={false}
                    center={pos}
                    color={colors[exit.exit.shape]}
                    headColor={
                        exit.goingInside === null ? 'orange' : exit.goingInside ? 'black' : 'white'
                    }
                    scale={2}
                    size={size / 2}
                />
            ))}
        </>
    );
    return null;
};

const getHit = (hits: HitsInfo['hits']) => {
    const keys = Object.keys(hits).sort((a, b) => hits[b].parties.length - hits[a].parties.length);
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
    const {hits} = intersectSegments(fx.input as SegmentWithPrev[]);
    const hit = getHit(hits);
    if (!hit) {
        throw new Error(`No valid intersection`);
    }
    return {...fx, input: [hit], output: [] as Array<HitCorner>};
});

const UntangleHit = () => (
    <Fixtures Input={Input} editDelay={100} Output={Output} run={untangleHit} fixtures={fx} />
);
