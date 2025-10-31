import * as React from 'react';
import {segmentToPrimitive} from '../editor/findSelection';
import {RenderSegmentBasic} from '../editor/RenderSegment';
import {Coord} from '../types';
import {Config} from '../vest/types';
import {register} from '../vest';
import {SegmentWithPrev} from './clipPathNew';
import {intersections} from './intersect';
import {SegmentEditor, useInitialState} from './SegmentEditor';

type Pair = [SegmentWithPrev, SegmentWithPrev];

const Input = ({initial, onChange}: {initial: Pair | null; onChange: (pair: Pair) => void}) => {
    const [current, setCurrent] = useInitialState<
        [SegmentWithPrev | null, SegmentWithPrev | null] | null
    >(initial);
    const [editSecond, setEditSecond] = React.useState(false);
    React.useEffect(() => {
        if (current && current[0] && current[1] && current !== initial) {
            onChange([current[0], current[1]]);
        }
    }, [current]);
    const first = current ? current[0] : null;
    const second = current ? current[1] : null;
    const other = editSecond ? first : second;
    // const points =
    //     first && second
    //         ? intersections(
    //               segmentToPrimitive(first.prev, first.segment),
    //               segmentToPrimitive(second.prev, second.segment),
    //           )
    //         : null;
    return (
        <div>
            <SegmentEditor
                initial={editSecond ? second : first}
                onChange={(value) => {
                    setCurrent((v) => {
                        v = v || [null, null];
                        return editSecond ? [v[0], value] : [value, v[1]];
                    });
                }}
            >
                {(pending, rendered) => {
                    let one = editSecond ? first : pending;
                    let two = editSecond ? pending : second;
                    let points =
                        one && two
                            ? intersections(
                                  segmentToPrimitive(one.prev, one.segment),
                                  segmentToPrimitive(two.prev, two.segment),
                              )
                            : null;
                    return (
                        <>
                            {other ? (
                                <RenderSegmentBasic
                                    zoom={1}
                                    prev={other.prev}
                                    segment={other.segment}
                                    inner={{
                                        stroke: 'green',
                                        strokeWidth: 4,
                                    }}
                                />
                            ) : null}
                            {other?.segment.type === 'Arc' ? (
                                <circle
                                    r={4}
                                    cx={other.segment.center.x}
                                    cy={other.segment.center.y}
                                    fill="green"
                                />
                            ) : null}
                            {rendered}
                            {points
                                ? points.map((p, i) => (
                                      <circle
                                          key={i}
                                          r={4}
                                          cx={p.x}
                                          cy={p.y}
                                          fill="yellow"
                                          stroke="black"
                                          strokeWidth={1}
                                      />
                                  ))
                                : null}
                        </>
                    );
                }}
            </SegmentEditor>
            <div>
                <button
                    disabled={!editSecond}
                    onClick={() => {
                        setEditSecond(false);
                    }}
                >
                    First
                </button>
                <button
                    disabled={editSecond}
                    onClick={() => {
                        setEditSecond(true);
                    }}
                >
                    Second
                </button>
            </div>
        </div>
    );
};

const Output = ({
    input,
    output,
    previous,
}: {
    input: Pair;
    output: Array<Coord>;
    previous: {output: Array<Coord> | null; isPassing: boolean};
}) => {
    return (
        <div>
            <svg width={300} height={300}>
                <RenderSegmentBasic
                    zoom={1}
                    prev={input[0].prev}
                    segment={input[0].segment}
                    inner={{
                        stroke: 'red',
                        strokeWidth: 4,
                    }}
                />
                <RenderSegmentBasic
                    zoom={1}
                    prev={input[1].prev}
                    segment={input[1].segment}
                    inner={{
                        stroke: 'green',
                        strokeWidth: 4,
                    }}
                />
                {previous.output
                    ? previous.output.map((p, i) => (
                          <circle cx={p.x} cy={p.y} r={4} fill="red" key={i} />
                      ))
                    : null}
                {output.map((p, i) => (
                    <circle
                        cx={p.x}
                        cy={p.y}
                        r={4}
                        stroke="black"
                        strokeWidth={1}
                        fill="yellow"
                        key={i}
                    />
                ))}
            </svg>
            <div>{output.length} points</div>
        </div>
    );
};

const config: Config<Pair, Array<Coord>> = {
    id: 'intersect',
    dir: __dirname,
    transform: ([one, two]) =>
        intersections(
            segmentToPrimitive(one.prev, one.segment),
            segmentToPrimitive(two.prev, two.segment),
        ),
    render: {
        editor: Input,
        fixture: Output,
    },
};

register(config);
