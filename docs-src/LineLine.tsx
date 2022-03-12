import * as React from 'react';
import {
    // @ts-ignore
    insetLineLineTrace,
    insetLineLine,
    // @ts-ignore
    rawSource,
} from '../src/rendering/inset/lineLine';
import { lineLine, lineToSlope } from '../src/rendering/intersect';
import { Fixtures } from './Fixtures';
import fixtures from './lineLine.json';
import { insetPrev, naiveInset } from '../src/rendering/ShowDebugInsetSegment';
import { RenderSegmentBasic } from '../src/editor/RenderSegment';
import { Arrow, pointsList } from '../src/editor/ShowHitIntersection2';
import { angleTo, dist, push } from '../src/rendering/getMirrorTransforms';
import { Coord, Segment } from '../src/types';
import { Fixture } from '../src/vest/types';
import { CoordEditor } from '../src/rendering/inset/CoordEditor';
import { Slider } from '../src/rendering/inset/Slider';

type I = [[Coord, Coord, Coord], number];
const Input = ({
    input: [[p1, p2, p3], inset],
    onChange,
}: {
    input: I;
    onChange?: (i: I) => void;
}) => {
    return (
        <>
            <polyline
                points={pointsList([p1, p2, p3])}
                stroke="red"
                fill="none"
                strokeWidth={2}
            />
            <CoordEditor
                coords={[p1, p2, p3]}
                margin={0}
                constrain={(pos, i) => {
                    if (i !== 1) {
                        return pos;
                    }
                    const line = lineToSlope(p1, p3, true);
                    const cross = lineToSlope(
                        pos,
                        push(pos, angleTo(p1, p3) + Math.PI / 2, 10),
                    );
                    const p = lineLine(line, cross);
                    if (p && dist(pos, p) < 5) {
                        return p;
                    }
                    return pos;
                }}
                onSet={(points) =>
                    onChange
                        ? onChange([points as [Coord, Coord, Coord], inset])
                        : null
                }
            />
            {onChange ? (
                <Slider
                    inset={inset}
                    onChange={(inset) => onChange([[p1, p2, p3], inset])}
                />
            ) : null}
        </>
    );
};

const Output = ({
    output: segments,
    input: [[p1, p2, p3], inset],
}: {
    input: I;
    output: Array<Segment>;
}) => {
    const naive = naiveInset(
        { prev: p2, segment: { type: 'Line', to: p3 }, shape: -1 },
        inset,
    );
    return (
        <>
            <g style={{ pointerEvents: 'none' }}>
                <RenderSegmentBasic
                    prev={segments[segments.length - 1].to}
                    segment={naive.segment}
                    inner={{
                        stroke: 'green',
                        strokeWidth: 1,
                        strokeDasharray: '5 5',
                    }}
                />
                {segments.map((seg, i) => (
                    <RenderSegmentBasic
                        key={i}
                        prev={
                            i === 0
                                ? insetPrev(p1, { type: 'Line', to: p2 }, inset)
                                : segments[i - 1].to
                        }
                        segment={seg}
                        inner={{ stroke: 'green', strokeWidth: 3 }}
                    />
                ))}
            </g>
        </>
    );
};

export const LineLine = () => (
    <Fixtures
        fixtures={fixtures as Array<Fixture<I, Array<Segment>>>}
        Input={Input}
        Output={Output}
        source={rawSource}
        run={([[p1, p2, p3], inset]) => {
            return insetLineLine(
                p1,
                { type: 'Line', to: p2 },
                { type: 'Line', to: p3 },
                inset,
            );
        }}
        info={insetLineLineTrace.traceInfo}
        trace={([[p1, p2, p3], inset], trace) => {
            return insetLineLineTrace(
                p1,
                { type: 'Line', to: p2 },
                { type: 'Line', to: p3 },
                inset,
                trace,
            );
        }}
    />
);
