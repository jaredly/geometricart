import * as React from 'react';
import { calcSegmentsD } from '../editor/RenderPath';
import { Coord, Segment } from '../types';
import { register } from '../vest';
import { angleForSegment } from './clipPath';
import { prevSegmentsToShape, SegmentWithPrev } from './clipPathNew';
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
import { RenderDebugInsetSegment } from './ShowDebugInsetSegment';

type Input = [SegmentWithPrev, SegmentWithPrev, number];
type Output = Array<Segment>;

export const asArray = <T,>(m: T | Array<T>): Array<T> =>
    Array.isArray(m) ? m : [m];

export const ShowDebugInsetSegment = ({
    inset,
    one,
    two,
}: {
    inset: number;
    one: SegmentWithPrev;
    two: SegmentWithPrev;
}) => {
    const segments = asArray(
        insetSegment(one.prev, one.segment, two.segment, inset, true),
    );
    return (
        <RenderDebugInsetSegment
            one={one}
            two={two}
            segments={segments}
            inset={inset}
        />
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
                                    <ShowDebugInsetSegment
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
                            </>
                        )}
                    </ShapeEditor>
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
                        <ShowDebugInsetSegment
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
