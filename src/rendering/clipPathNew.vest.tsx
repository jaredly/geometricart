import * as React from 'react';
import { segmentsBounds } from '../editor/Bounds';
import { calcPathD, calcSegmentsD, pathSegs } from '../editor/RenderPath';
import { Segment } from '../types';
import { register } from '../vest';
import {
    addPrevsToSegments,
    clipPathNew,
    collectRegions,
    getSomeHits,
    prevSegmentsToShape,
    SegmentWithPrev,
} from './clipPathNew';
import { angleTo, dist, push } from './getMirrorTransforms';
import { coordsEqual } from './pathsAreIdentical';
import { ensureClockwise, isClockwise } from './pathToPoints';
import { useInitialState } from './SegmentEditor';
import { ShapeEditor } from './ShapeEditor';

type Input = [Array<SegmentWithPrev>, Array<SegmentWithPrev>];
type Output = Array<{
    isInternal: boolean | null;
    isClockwise: boolean;
    segments: Array<Segment>;
}>;

const empty: Input = [[], []];

export const Editor = ({
    initial,
    onChange,
}: {
    initial: Input | null;
    onChange: (i: Input) => void;
}) => {
    const [current, setCurrent] = useInitialState(initial || empty);
    const [first, setFirst] = React.useState(true);
    const [showShapes, setShowShapes] = React.useState(true);

    React.useEffect(() => {
        if (!current) {
            return;
        }
        try {
            transform(current);
        } catch (e) {
            return;
        }
        onChange(current);
    }, [current]);

    return (
        <div>
            <button disabled={first} onClick={() => setFirst(true)}>
                First
            </button>
            <button disabled={!first} onClick={() => setFirst(false)}>
                Second
            </button>
            <ShapeEditor
                initial={current[first ? 0 : 1]}
                onChange={(shape) =>
                    setCurrent((c) => (first ? [shape, c[1]] : [c[0], shape]))
                }
            >
                {(shape, rendered) => {
                    let regions: Output = [];
                    try {
                        regions = transform(
                            shape
                                ? first
                                    ? [shape, current[1]]
                                    : [current[0], shape]
                                : current,
                        );
                    } catch (e) {}
                    const other = prevSegmentsToShape(
                        first ? current[1] : current[0],
                    );
                    return (
                        <>
                            {other?.length ? (
                                <path
                                    fill="none"
                                    stroke={'yellow'}
                                    opacity={0.5}
                                    strokeWidth={1}
                                    d={calcSegmentsD(
                                        other,
                                        other[other.length - 1].to,
                                        undefined,
                                        1,
                                    )}
                                />
                            ) : null}
                            {rendered}
                            {regions.map((r, i) => (
                                <path
                                    fill={
                                        r.isClockwise && r.isInternal
                                            ? 'rgba(255,255,255,0.2'
                                            : 'none'
                                    }
                                    key={i + 'f'}
                                    stroke={colors[i % colors.length]}
                                    opacity={0.8}
                                    strokeWidth={r.isClockwise ? 7 : 2}
                                    strokeDasharray={
                                        r.isInternal
                                            ? ''
                                            : r.isClockwise
                                            ? '7 7'
                                            : '3 3'
                                    }
                                    d={calcSegmentsD(
                                        r.segments,
                                        r.segments[r.segments.length - 1].to,
                                        undefined,
                                        1,
                                    )}
                                />
                            ))}
                        </>
                    );
                }}
            </ShapeEditor>
            <button onClick={() => setCurrent([[], []])}>Clear</button>
        </div>
    );
};
export const Fixture = ({
    input,
    output,
}: {
    input: Input;
    output: Output;
}) => {
    const first = prevSegmentsToShape(input[0]);
    const second = prevSegmentsToShape(input[1]);
    return (
        <div>
            <svg width={300} height={300}>
                {first ? (
                    <path
                        fill="none"
                        stroke={'yellow'}
                        opacity={0.5}
                        strokeWidth={1}
                        d={calcSegmentsD(
                            first,
                            first[first.length - 1].to,
                            undefined,
                            1,
                        )}
                    />
                ) : null}
                {second ? (
                    <path
                        fill="none"
                        stroke={'white'}
                        opacity={0.5}
                        strokeWidth={1}
                        d={calcSegmentsD(
                            second,
                            second[second.length - 1].to,
                            undefined,
                            1,
                        )}
                    />
                ) : null}

                {output.map((r, i) => (
                    <path
                        fill={
                            r.isClockwise && r.isInternal
                                ? 'rgba(255,255,255,0.2'
                                : 'none'
                        }
                        key={i}
                        stroke={colors[i % colors.length]}
                        opacity={0.5}
                        strokeWidth={r.isClockwise ? 7 : 2}
                        strokeDasharray={r.isInternal ? '' : '5 5'}
                        d={calcSegmentsD(
                            r.segments,
                            r.segments[r.segments.length - 1].to,
                            undefined,
                            1,
                        )}
                    />
                ))}
            </svg>
        </div>
    );
};

const colors = ['red', 'green', 'blue', 'orange', 'yellow', 'white'];

const fixCircle = (shape: Array<SegmentWithPrev>) => {
    const res: Array<SegmentWithPrev> = [];
    shape.forEach((seg) => {
        if (
            seg.segment.type === 'Arc' &&
            coordsEqual(seg.prev, seg.segment.to)
        ) {
            const opposite = push(
                seg.segment.center,
                angleTo(seg.prev, seg.segment.center),
                dist(seg.prev, seg.segment.center),
            );
            res.push(
                {
                    ...seg,
                    segment: { ...seg.segment, to: opposite },
                },
                {
                    ...seg,
                    prev: opposite,
                },
            );
        } else {
            res.push(seg);
        }
    });
    return res;
};

const transform = ([shape, clip]: Input, debug?: boolean) => {
    const allSegments = fixCircle(shape)
        .map((s) => ({ ...s, shape: 0 }))
        .concat(clip.map((c) => ({ ...c, shape: 1 })));
    const hitsResults = getSomeHits(allSegments, debug);
    if (!hitsResults) {
        throw new Error(`No intersection!`);
    }
    const regions = collectRegions(allSegments, hitsResults, debug, true);
    return regions.map((r) => {
        const segments = prevSegmentsToShape(r.segments)!;
        return {
            segments,
            isInternal: r.isInternal,
            isClockwise: isClockwise(segments),
        };
    });
};
register<Input, Output>({
    id: 'clipPathNew',
    dir: __dirname,
    transform: transform,
    render: {
        editor: Editor,
        fixture: Fixture,
    },
});
