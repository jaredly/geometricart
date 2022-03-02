import * as React from 'react';
import { calcSegmentsD } from '../editor/RenderPath';
import { Segment } from '../types';
import { register } from '../vest';
import { prevSegmentsToShape, SegmentWithPrev } from './clipPathNew';
import { cleanUpInsetSegments2 } from './findInternalRegions';
import { insetSegments } from './insetPath';
import { coordsEqual } from './pathsAreIdentical';
import {
    angleDifferences,
    isClockwise,
    pathToPoints,
    pointsAngles,
    totalAngle,
} from './pathToPoints';
import { ShapeEditor } from './ShapeEditor';

type Input = [Array<SegmentWithPrev>, number];
type Output = Array<Array<Segment>>;

const ShowDebug = ({
    shape,
    inset,
}: {
    inset: number;
    shape: Array<SegmentWithPrev>;
}) => {
    const seg = prevSegmentsToShape(shape);
    if (!seg) {
        return null;
    }
    const [insetSeg, corners] = insetSegments(seg, inset);
    const regions = cleanUpInsetSegments2(insetSeg, corners);
    return (
        <>
            <path
                d={calcSegmentsD(seg, seg[seg.length - 1].to, undefined, 1)}
                stroke="white"
                opacity={0.2}
                strokeWidth={2}
                fill="none"
            />
            {regions.map((region, i) => (
                <path
                    key={i}
                    stroke="red"
                    fill="none"
                    strokeWidth={2}
                    d={calcSegmentsD(
                        region,
                        region[region.length - 1].to,
                        false,
                        1,
                    )}
                />
            ))}
        </>
    );
};

register({
    id: 'inset',
    dir: __dirname,
    transform: ([segments, size]) => {
        const seg = prevSegmentsToShape(segments);
        if (!seg) {
            throw new Error(`Not a shape`);
        }
        const [inset, corners] = insetSegments(seg, size);
        return cleanUpInsetSegments2(inset, corners);
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
                        initial={initial ? initial[0] : null}
                        onChange={(v) =>
                            onChange([v, initial ? initial[1] : 10])
                        }
                    >
                        {(shape, rendered) => (
                            <>
                                {rendered}
                                {shape?.length ? (
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
                                ) : null}
                            </>
                        )}
                    </ShapeEditor>
                    <button onClick={() => onChange([[], 10])}>Clear</button>
                    {initial != null ? (
                        <>
                            <input
                                type="range"
                                min={-100}
                                max={100}
                                value={inset || initial[1]}
                                onChange={(evt) => {
                                    setInset(+evt.target.value);
                                }}
                                onMouseUp={() => {
                                    onChange([initial![0], inset!]);
                                    setInset(null);
                                }}
                            />
                            {inset || initial[1]}
                        </>
                    ) : null}
                </div>
            );
        },
        fixture: ({ input, output }: { input: Input; output: Output }) => {
            return (
                <div>
                    <svg width={300} height={300}>
                        <ShowDebug inset={input[1]} shape={input[0]} />
                    </svg>
                </div>
            );
        },
    },
});
