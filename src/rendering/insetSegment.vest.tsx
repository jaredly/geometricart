import * as React from 'react';
import { calcSegmentsD } from '../editor/RenderPath';
import { RenderSegmentBasic } from '../editor/RenderSegment';
import { Coord, Segment } from '../types';
import { register } from '../vest';
import { angleForSegment } from './clipPath';
import {
    addPrevsToSegments,
    prevSegmentsToShape,
    SegmentWithPrev,
} from './clipPathNew';
import { cleanUpInsetSegments2 } from './findInternalRegions';
import { angleTo, dist, push } from './getMirrorTransforms';
import { insetSegments } from './insetPath';
import { insetSegment } from './insetSegment';
import { coordsEqual } from './pathsAreIdentical';
import {
    angleDifferences,
    isClockwise,
    pathToPoints,
    pointsAngles,
    totalAngle,
} from './pathToPoints';
import { ShapeEditor } from './ShapeEditor';

type Input = [SegmentWithPrev, SegmentWithPrev, number];
type Output = Array<Segment>;

const asArray = <T,>(m: T | Array<T>): Array<T> => (Array.isArray(m) ? m : [m]);

const insetPrev = (prev: Coord, segment: Segment, amount: number) => {
    const angle = angleForSegment(prev, segment, prev);
    return push(prev, angle.theta + Math.PI / 2, amount);
};

const naiveInset = (seg: SegmentWithPrev, inset: number): SegmentWithPrev => {
    if (seg.segment.type === 'Line') {
        const t = angleTo(seg.prev, seg.segment.to) + Math.PI / 2;
        return {
            shape: seg.shape,
            prev: push(seg.prev, t, inset),
            segment: {
                type: 'Line',
                to: push(seg.segment.to, t, inset),
            },
        };
    } else {
        const r =
            dist(seg.segment.center, seg.prev) +
            inset * (seg.segment.clockwise ? -1 : 1);
        return {
            shape: seg.shape,
            prev: push(
                seg.segment.center,
                angleTo(seg.segment.center, seg.prev),
                r,
            ),
            segment: {
                ...seg.segment,
                to: push(
                    seg.segment.center,
                    angleTo(seg.segment.center, seg.segment.to),
                    r,
                ),
            },
        };
    }
};

const ShowDebug = ({
    inset,
    one,
    two,
}: {
    inset: number;
    one: SegmentWithPrev;
    two: SegmentWithPrev;
}) => {
    const res = asArray(
        insetSegment(one.prev, one.segment, two.segment, inset, true),
    );
    const withPrevs = addPrevsToSegments(
        res,
        -1,
        insetPrev(one.prev, one.segment, inset),
    );
    const ione = naiveInset(one, inset);
    const itwo = naiveInset(two, inset);
    return (
        <>
            <RenderSegmentBasic
                prev={one.prev}
                segment={one.segment}
                inner={{
                    stroke: 'green',
                    strokeWidth: 2,
                }}
                zoom={1}
            />
            <RenderSegmentBasic
                prev={two.prev}
                segment={two.segment}
                inner={{
                    stroke: 'blue',
                    strokeWidth: 2,
                }}
                zoom={1}
            />
            {withPrevs.map((s, i) => (
                <RenderSegmentBasic
                    key={i}
                    prev={s.prev}
                    segment={s.segment}
                    inner={{
                        stroke: 'red',
                        strokeWidth: 2,
                    }}
                    zoom={1}
                />
            ))}
            <RenderSegmentBasic
                prev={ione.prev}
                segment={ione.segment}
                inner={{
                    stroke: 'white',
                    strokeDasharray: '1 5',
                    strokeWidth: 1,
                }}
                zoom={1}
            />
            <RenderSegmentBasic
                prev={itwo.prev}
                segment={itwo.segment}
                inner={{
                    stroke: 'white',
                    strokeDasharray: '1 5',
                    strokeWidth: 1,
                }}
                zoom={1}
            />
        </>
    );
};

register({
    id: 'insetSegment',
    dir: __dirname,
    transform: ([one, two, size]) => {
        return asArray(
            insetSegment(one.prev, one.segment, two.segment, size, true),
        );
    },
    render: {
        editor: ({
            initial,
            onChange,
        }: {
            initial: Input | null;
            onChange: (i: Input) => void;
        }) => {
            const [inset, setInset] = React.useState(null as null | number);
            return (
                <div>
                    <ShapeEditor
                        initial={initial ? [initial[0], initial[1]] : null}
                        allowOpen
                        onChange={(v) => {
                            if (v.length === 2) {
                                onChange([
                                    v[0],
                                    v[1],
                                    initial ? initial[2] : 10,
                                ]);
                            }
                        }}
                    >
                        {(shape, rendered) => (
                            <>
                                {rendered}
                                {shape?.length === 2 ? (
                                    <ShowDebug
                                        inset={
                                            inset != null
                                                ? inset
                                                : initial
                                                ? initial[2]
                                                : 10
                                        }
                                        one={shape[0]}
                                        two={shape[1]}
                                    />
                                ) : null}
                                {/* {shape?.length ? (
                                    <ShowDebug
                                        inset={
                                            inset != null
                                                ? inset
                                                : initial
                                                ? initial[1]
                                                : 10
                                        }
                                        shape={shape}
                                    />
                                ) : null} */}
                            </>
                        )}
                    </ShapeEditor>
                    {/* <button onClick={() => onChange(null)}>Clear</button> */}
                    {initial != null ? (
                        <>
                            <input
                                type="range"
                                min={-100}
                                max={100}
                                value={inset || initial[2]}
                                onChange={(evt) => {
                                    setInset(+evt.target.value);
                                }}
                                onMouseUp={() => {
                                    if (inset != null) {
                                        onChange([
                                            initial![0],
                                            initial![1],
                                            inset!,
                                        ]);
                                        setInset(null);
                                    }
                                }}
                            />
                            {inset || initial[2]}
                        </>
                    ) : null}
                </div>
            );
        },
        fixture: ({ input, output }: { input: Input; output: Output }) => {
            return (
                <div>
                    <svg width={300} height={300}>
                        <ShowDebug
                            inset={input[2]}
                            one={input[0]}
                            two={input[1]}
                        />
                    </svg>
                </div>
            );
        },
    },
});
