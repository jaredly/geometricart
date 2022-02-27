import * as React from 'react';
import { segmentToPrimitive } from '../editor/findSelection';
import { RenderPrimitive } from '../editor/RenderPrimitive';
import { RenderSegmentBasic } from '../editor/RenderSegment';
import { Coord } from '../types';
import { Config } from '../vest/types';
import { register } from '../vest/vest';
import { SegmentWithPrev } from './clipPathNew';
import { angleTo, dist, push } from './getMirrorTransforms';
import { intersections } from './intersect';

type Pair = [SegmentWithPrev, SegmentWithPrev];

type Pending = {
    type: 'Line' | 'Arc';
    clockwise: boolean;
    points: Array<Coord>;
};

export const pendingToSeg = (s: Pending): SegmentWithPrev | null => {
    if (s.type === 'Line') {
        if (s.points.length > 1) {
            return {
                prev: s.points[0],
                segment: { type: 'Line', to: s.points[1] },
                shape: -1,
            };
        }
    } else {
        if (s.points.length > 2) {
            return {
                prev: s.points[0],
                shape: -1,
                segment: {
                    type: 'Arc',
                    center: s.points[1],
                    to: push(
                        s.points[1],
                        angleTo(s.points[1], s.points[2]),
                        dist(s.points[0], s.points[1]),
                    ),
                    clockwise: s.clockwise,
                },
            };
        }
    }
    return null;
};

export const segToPending = (s: SegmentWithPrev | null): Pending =>
    s
        ? {
              type: s.segment.type,
              clockwise: s.segment.type === 'Arc' ? s.segment.clockwise : false,
              points:
                  s.segment.type === 'Line'
                      ? [s.prev, s.segment.to]
                      : [s.prev, s.segment.center, s.segment.to],
          }
        : { type: 'Line', clockwise: false, points: [] };

const snap = (v: number, grid: number) => Math.round(v / grid) * grid;

const SegmentEditor = ({
    initial,
    onChange,
    children,
}: {
    initial: null | SegmentWithPrev;
    onChange: (p: SegmentWithPrev) => void;
    children: (
        current: null | SegmentWithPrev,
        rendered: React.ReactNode,
    ) => React.ReactNode;
}) => {
    const grid = 5;

    const [current, setCurrent] = useInitialState(initial, segToPending);
    const [cursor, setCursor] = React.useState(null as null | Coord);

    const points = cursor ? current.points.concat([cursor]) : current.points;
    const seg = pendingToSeg({ ...current, points });

    return (
        <div>
            <svg
                width={300}
                height={300}
                onMouseMove={(evt) => {
                    const box = evt.currentTarget.getBoundingClientRect();
                    setCursor({
                        x: snap(evt.clientX - box.left, grid),
                        y: snap(evt.clientY - box.top, grid),
                    });
                }}
                onMouseLeave={() => setCursor(null)}
                onClick={(evt) => {
                    const box = evt.currentTarget.getBoundingClientRect();
                    const coord = {
                        x: snap(evt.clientX - box.left, grid),
                        y: snap(evt.clientY - box.top, grid),
                    };
                    const max = current.type === 'Line' ? 2 : 3;
                    const changed = {
                        ...current,
                        points: current.points
                            .slice(0, max - 1)
                            .concat([coord]),
                    };
                    console.log(max, changed, current);
                    setCurrent(changed);
                    const seg = pendingToSeg(changed);
                    if (seg) {
                        onChange(seg);
                    }
                }}
            >
                {children(
                    seg,
                    <>
                        {seg ? (
                            <RenderSegmentBasic
                                zoom={1}
                                prev={seg.prev}
                                segment={seg.segment}
                                inner={{
                                    stroke: 'red',
                                    strokeWidth: 4,
                                }}
                            />
                        ) : null}
                        {points.map((p, i) => (
                            <circle
                                key={i}
                                cx={p.x}
                                cy={p.y}
                                fill="red"
                                r={5}
                            />
                        ))}
                    </>,
                )}
            </svg>
            <div>
                <button
                    // disabled={current.type === 'Line'}
                    onClick={() => {
                        setCurrent({
                            type: 'Line',
                            points: [],
                            clockwise: false,
                        });
                    }}
                >
                    Line
                </button>
                <button
                    // disabled={current.type === 'Arc'}
                    onClick={() => {
                        setCurrent({
                            type: 'Arc',
                            points: [],
                            clockwise: false,
                        });
                    }}
                >
                    Arc
                </button>
            </div>
        </div>
    );
};

export const useInitialState = <T, R = T>(
    v: T,
    transform?: (t: T) => R,
): [R, React.Dispatch<React.SetStateAction<R>>] => {
    const [current, set] = React.useState(
        transform ? transform(v) : (v as any as R),
    );
    const prev = React.useRef(v);
    React.useEffect(() => {
        if (prev.current !== v) {
            prev.current = v;
            set(transform ? transform(v) : (v as any as R));
        }
    }, [v]);
    return [current, set];
};

const Input = ({
    initial,
    onChange,
}: {
    initial: Pair | null;
    onChange: (pair: Pair) => void;
}) => {
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
                            {rendered}
                            {points
                                ? points.map((p, i) => (
                                      <circle
                                          key={i}
                                          r={4}
                                          cx={p.x}
                                          cy={p.y}
                                          fill="white"
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

const Output = ({ input, output }: { input: Pair; output: Array<Coord> }) => {
    return (
        <div>
            <svg width={300} height={300}>
                <RenderSegmentBasic
                    zoom={1}
                    prev={input[0].prev}
                    segment={input[0].segment}
                />
                <RenderSegmentBasic
                    zoom={1}
                    prev={input[1].prev}
                    segment={input[1].segment}
                />
                {output.map((p, i) => (
                    <circle cx={p.x} cy={p.y} r={4} fill="yellow" key={i} />
                ))}
            </svg>
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
