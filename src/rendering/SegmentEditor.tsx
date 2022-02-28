import * as React from 'react';
import { RenderSegmentBasic } from '../editor/RenderSegment';
import { Coord } from '../types';
import { SegmentWithPrev } from './clipPathNew';
import { angleTo, dist, push } from './getMirrorTransforms';

export const useOnChange = <T,>(v: T, fn: (v: T) => void) => {
    const prev = React.useRef(v);
    React.useEffect(() => {
        if (prev.current !== v) {
            prev.current = v;
            fn(v);
        }
    }, [v]);
};

export const useInitialState = <T, R = T>(
    v: T,
    transform?: (t: T) => R,
): [R, React.Dispatch<React.SetStateAction<R>>] => {
    const [current, set] = React.useState(
        transform ? transform(v) : (v as any as R),
    );
    useOnChange(v, (v) => set(transform ? transform(v) : (v as any as R)));
    return [current, set];
};

export const SegmentEditor = ({
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
    const grid = 15;

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
                    // console.log(max, changed, current);
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
                    style={
                        current.type === 'Line' ? { fontWeight: 'bold' } : {}
                    }
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
                    style={current.type === 'Arc' ? { fontWeight: 'bold' } : {}}
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
                {cursor ? ' (' + cursor.x + ',' + cursor.y + ')' : null}
            </div>
        </div>
    );
};
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
