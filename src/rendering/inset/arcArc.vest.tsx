import equal from 'fast-deep-equal';
import * as React from 'react';
import { arrow, pointsList } from '../../editor/ShowHitIntersection2';
import { ArcSegment, Coord, Segment } from '../../types';
import { register } from '../../vest';
import { zeroToTwoPi } from '../clipPath';
import { angleBetween } from '../findNextSegments';
import { angleTo, dist, push } from '../getMirrorTransforms';
import { SegmentEditor, useInitialState } from '../SegmentEditor';
import { ShapeEditor } from '../ShapeEditor';
import { RenderDebugInsetSegment } from '../ShowDebugInsetSegment';
import { insetArcArc } from './arcArc';
import { CoordEditor } from './CoordEditor';
import { CoordPicker } from './CoordPicker';
import { Slider } from './Slider';
import { SvgGrid } from './SvgGrid';

type InputI = [[Coord, Coord, Coord, boolean, boolean], number];
type Input = [[Coord, ArcSegment, ArcSegment], number];
type Output = Array<Segment>;

export const oldToNew = ([, one, two]: Input[0]): InputI[0] => {
    return [one.center, one.to, two.center, one.clockwise, two.clockwise];
};

export const newToOld = ([
    center,
    to,
    twoCenter,
    oneClock,
    twoClock,
]: InputI[0]): Input[0] => {
    const r = dist(center, to);
    const t = angleTo(center, to);
    const prev = push(center, t + ((oneClock ? -1 : 1) * Math.PI) / 2, r);
    return [
        prev,
        { type: 'Arc', clockwise: oneClock, center, to },
        {
            type: 'Arc',
            clockwise: twoClock,
            center: twoCenter,
            to: push(
                twoCenter,
                angleTo(twoCenter, to) + ((twoClock ? 1 : -1) * Math.PI) / 2,
                dist(twoCenter, to),
            ),
        },
    ];
};

function makeNext(state: State): null | ArcSegment {
    if (!state.arc || !state.next.center) {
        return null;
    }
    return {
        type: 'Arc',
        center: state.next.center,
        clockwise: state.next.clockwise,
        to: push(
            state.next.center,
            angleTo(state.arc.segment.to, state.next.center) +
                (state.next.clockwise ? -1 : 1) * Math.PI * 0.75,
            dist(state.next.center, state.arc.segment.to),
        ),
    };
}

const vector = (coord: Coord, theta: number, size: number, color = 'red') => {
    const p = push(coord, theta, size);
    return (
        <>
            <line
                stroke={color}
                x1={coord.x}
                y1={coord.y}
                x2={p.x}
                y2={p.y}
                strokeWidth={size / 8}
            />
            <polygon
                points={pointsList(arrow(p, theta, size / 4))}
                fill={color}
            />
        </>
    );
};

const ShowDebug = ({ input: [[prev, seg, next], inset] }: { input: Input }) => {
    const t0 = angleTo(seg.center, seg.to);
    const tan0 = t0 + (Math.PI / 2) * (seg.clockwise ? 1 : -1);
    const t1 = angleTo(next.center, seg.to);
    const tan1 = t1 - (Math.PI / 2) * (next.clockwise ? 1 : -1);
    const between = zeroToTwoPi(angleBetween(tan0, tan1, false));

    return (
        <>
            <RenderDebugInsetSegment
                one={{ prev, segment: seg, shape: -1 }}
                two={{ prev: seg.to, segment: next, shape: -1 }}
                inset={inset}
                segments={insetArcArc([prev, seg, next], inset)}
            />
            {vector(seg.to, tan0, 30, 'yellow')}
            {vector(seg.to, tan1, 30, 'purple')}
        </>
    );
};

type State = {
    inset: number;
    arc: null | { prev: Coord; segment: ArcSegment; shape: number };
    next: { center: null | Coord; clockwise: boolean };
};

const stateToInput = (state: State): Input | null => {
    const next = makeNext(state);
    if (!state.arc || !next) {
        return null;
    }
    return [[state.arc.prev, state.arc.segment, next], state.inset];
};

const Editor2 = ({
    initial,
    onChange,
}: {
    initial: Input | null;
    onChange: (i: Input) => void;
}) => {
    const [state, setState] = useInitialState(
        initial ? initial : null,
        (input: Input | null): State => {
            if (!input) {
                return {
                    arc: null,
                    next: { center: null, clockwise: true },
                    inset: 10,
                };
            }
            return {
                arc: { prev: input[0][0], segment: input[0][1], shape: -1 },
                next: {
                    center: input[0][2].center,
                    clockwise: input[0][2].clockwise,
                },
                inset: input[1],
            };
        },
    );
    React.useEffect(() => {
        const t = setTimeout(() => {
            const input = stateToInput(state);
            if (input && !equal(input, initial)) {
                onChange(input);
            }
        }, 200);
        return () => clearTimeout(t);
    }, [state]);
    const [editSecond, setEditSecond] = React.useState(false);
    return (
        <div>
            {editSecond ? (
                <CoordPicker
                    coords={[]}
                    onSet={(coords) => {
                        console.log(coords[coords.length - 1]);
                        setState((s) => ({
                            ...s,
                            next: {
                                center: coords[coords.length - 1],
                                clockwise: s.next.clockwise,
                            },
                        }));
                    }}
                >
                    {(rendered, coords) => {
                        const coord = coords.length
                            ? coords[coords.length - 1]
                            : null;
                        const next = coord
                            ? {
                                  ...state,
                                  next: { ...state.next, center: coord },
                              }
                            : state;
                        const input = stateToInput(next);
                        return (
                            <>
                                {input ? <ShowDebug input={input} /> : null}
                                {rendered}
                            </>
                        );
                    }}
                </CoordPicker>
            ) : (
                <SegmentEditor
                    restrict="Arc"
                    initial={state.arc}
                    onChange={(seg) =>
                        seg.segment.type === 'Arc'
                            ? setState((s) => ({
                                  ...s,
                                  arc: seg as State['arc'],
                              }))
                            : null
                    }
                >
                    {(seg, rendered) => {
                        const input = stateToInput(
                            seg
                                ? { ...state, arc: seg as State['arc'] }
                                : state,
                        );
                        return (
                            <>
                                {input ? <ShowDebug input={input} /> : null}
                                {rendered}
                            </>
                        );
                    }}
                </SegmentEditor>
            )}
            <div>
                <button
                    onClick={() => setEditSecond(false)}
                    disabled={!editSecond}
                >
                    First
                </button>
                <button
                    onClick={() => setEditSecond(true)}
                    disabled={editSecond}
                >
                    Second
                </button>
                <button
                    onClick={() =>
                        setState((s) => ({
                            ...s,
                            next: { ...s.next, clockwise: !s.next.clockwise },
                        }))
                    }
                >
                    Second{' '}
                    {state.next.clockwise ? 'clockwise' : 'counterclockwise'}
                </button>
            </div>
            <div>
                <button
                    onClick={() => {
                        setState({
                            inset: state.inset,
                            arc: null,
                            next: { center: null, clockwise: true },
                        });
                    }}
                >
                    Clear
                </button>
                <input
                    type="range"
                    min={-100}
                    max={100}
                    value={state.inset}
                    onChange={(evt) => {
                        setState((s) => ({ ...s, inset: +evt.target.value }));
                    }}
                />
                {state.inset}
            </div>
        </div>
    );
};

const Editor3 = ({
    initial,
    onChange,
}: {
    initial: InputI;
    onChange: (i: InputI) => void;
}) => {
    const [p1, p2, p3, c1, c2] = initial[0];

    return (
        <div>
            <svg width={300} height={300}>
                <line
                    x1={0}
                    x2={300}
                    y1={150}
                    y2={150}
                    stroke="white"
                    strokeDasharray={'1 2'}
                    strokeWidth={1}
                />
                {/* <SvgGrid size={15} /> */}
                <CoordEditor
                    constrain={(coord) =>
                        Math.abs(coord.y - 150) < 10
                            ? { ...coord, y: 150 }
                            : coord
                    }
                    coords={[p1, p2, p3]}
                    onSet={([p1, p2, p3]) =>
                        onChange([[p1, p2, p3, c1, c2], initial[1]])
                    }
                    onClick={(idx, evt) => {
                        if (idx === 0) {
                            onChange([[p1, p2, p3, !c1, c2], initial[1]]);
                        } else if (idx === 2) {
                            onChange([[p1, p2, p3, c1, !c2], initial[1]]);
                        }
                    }}
                />
                <g style={{ pointerEvents: 'none' }}>
                    <ShowDebug input={[newToOld(initial[0]), initial[1]]} />
                </g>
                <Slider
                    inset={initial[1]}
                    onChange={(inset) => onChange([initial[0], inset])}
                />
            </svg>
        </div>
    );
};

register({
    id: 'arcArc',
    dir: __dirname,
    transform: (args) => {
        return insetArcArc(...args);
    },
    render: {
        editor: ({ initial, onChange }) => (
            <Editor3
                initial={
                    initial
                        ? [oldToNew(initial[0]), initial[1]]
                        : [
                              [
                                  { x: 10, y: 10 },
                                  { x: 20, y: 20 },
                                  { x: 40, y: 70 },
                                  true,
                                  false,
                              ],
                              10,
                          ]
                }
                onChange={(v) => onChange([newToOld(v[0]), v[1]])}
            />
        ),
        fixture: ({ input, output }: { input: Input; output: Output }) => {
            return (
                <div>
                    <svg width={300} height={300}>
                        <SvgGrid size={15} />
                        <ShowDebug input={input} />
                    </svg>
                </div>
            );
        },
    },
});
