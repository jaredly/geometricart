// This is for tests? idk
import * as React from 'react';
import { render } from 'react-dom';
import { useCurrent } from '../src/App';
import { mergeBounds, segmentsBounds } from '../src/Export';
import { Text } from '../src/Forms';
import { angleTo, dist, push } from '../src/getMirrorTransforms';
import { insetPath, insetSegments, pruneInsetPath } from '../src/insetPath';
import { calcPathD } from '../src/RenderPath';
import { Coord, Path, Segment } from '../src/types';

const size = 500;

/**
 *
 * Ok so the basic idea is that I can test my inset code
 * with various test cases.
 *
 * And I can construct the line segments manually
 * by clicking control points.
 */

/*
Ok, test case format:
- input path (list of segments)
- for various inset numbers, have the passing output, if it exists

So when we're looking at a case, we can say "this passes" or "this doesn't"


*/

export const insetColors = ['#0f0', '#00f', '#ff0', '#f0f', '#0ff'];

type Example = {
    input: Array<Segment>;
    output: Insets;
    title: string;
    id: number;
};

const maxId = (examples: Array<Example>) => {
    return examples.reduce((max, ex) => Math.max(ex.id, max), -1);
};

const App = () => {
    const [examples, setExamples] = React.useState([] as Array<Example>);

    React.useEffect(() => {
        if (examples.length === 0) {
            return;
        }
        fetch(`/cases/`, {
            method: 'POST',
            body: JSON.stringify(examples),
        });
    }, [examples]);

    return (
        <div style={{ margin: 48 }}>
            <Canvas
                onComplete={(segments, title) => {
                    setExamples((ex) =>
                        ex.concat({
                            id: maxId(examples) + 1,
                            input: segments,
                            output: getInsets(segments),
                            title,
                        }),
                    );
                }}
            />
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    overflow: 'auto',
                }}
            >
                {examples.map((example, i) => (
                    <ShowExample
                        key={i}
                        example={example}
                        onDelete={() => {
                            setExamples((ex) => {
                                ex = ex.slice();
                                ex.splice(i, 1);
                                return ex;
                            });
                        }}
                        onChange={(example) => {
                            setExamples((ex) => {
                                ex = ex.slice();
                                ex[i] = example;
                                return ex;
                            });
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

const ShowExample = ({
    example,
    onChange,
    onDelete,
}: {
    example: Example;
    onChange: (ex: Example) => void;
    onDelete: () => void;
}) => {
    const { input: segments, output: insets, title } = example;

    const bounds = React.useMemo(() => {
        let bounds = segmentsBounds(segments);
        Object.keys(insets).forEach((k) => {
            insets[+k].paths.forEach((inset) => {
                bounds = mergeBounds(bounds, segmentsBounds(inset));
            });
        });
        return bounds;
    }, [segments, insets]);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {Object.keys(insets)
                        .sort()
                        .map((k, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    const output = { ...insets };
                                    output[+k] = {
                                        ...insets[+k],
                                        pass: !insets[+k].pass,
                                    };
                                    onChange({
                                        ...example,
                                        output,
                                    });
                                }}
                                style={{
                                    flex: 1,
                                    border: `2px solid ${insetColors[i]}`,
                                    background: 'none',
                                    borderRadius: 0,
                                    color: 'white',
                                    margin: 4,
                                    cursor: 'pointer',
                                }}
                            >
                                {insets[+k].pass ? 'Pass' : 'Fail'}
                            </button>
                        ))}
                </div>
                {/* <button
                        onClick={() => {
                            setEdit(false);
                        }}
                    >
                        Save
                    </button> */}
                <button
                    onClick={() => {
                        onDelete();
                    }}
                >
                    Delete
                </button>
            </div>
            <svg
                width={size / 2}
                height={size / 2}
                viewBox={`${bounds.x0 - 10} ${bounds.y0 - 10} ${
                    bounds.x1 - bounds.x0 + 20
                } ${bounds.y1 - bounds.y0 + 20}`}
            >
                <path
                    stroke={'red'}
                    strokeWidth={3}
                    d={calcPathD(pathSegs(segments), 1)}
                />
                {Object.keys(insets)
                    .sort()
                    .map((k, ki) =>
                        insets[+k].paths.map((segments, i) => (
                            <path
                                stroke={insetColors[ki]}
                                strokeDasharray={insets[+k].pass ? '' : '5 5'}
                                key={`${k}:${i}`}
                                strokeWidth={3}
                                fill="none"
                                d={calcPathD(pathSegs(segments), 1)}
                            />
                        )),
                    )}
            </svg>
            <Text
                value={title}
                onChange={(title) => {
                    onChange({ ...example, title });
                }}
            />
        </div>
    );
};

const Canvas = ({
    onComplete,
}: {
    onComplete: (segments: Array<Segment>, title: string) => void;
}) => {
    let [segments, setSegments] = React.useState([] as Array<Segment>);
    const origin = segments.length
        ? segments[segments.length - 1].to
        : { x: 0, y: 0 };
    const [cursor, setCursor] = React.useState(null as Coord | null);
    const [title, setTitle] = React.useState('Untitled');

    const [adding, setAdding] = React.useState({ type: 'line' } as
        | { type: 'line' }
        | {
              type: 'arc';
              center: null | Coord;
              clockwise: boolean;
          });

    const addingNow = useCurrent(adding);
    const currentSegments = useCurrent(segments);

    React.useEffect(() => {
        const fn = (evt: KeyboardEvent) => {
            const adding = addingNow.current;
            if (evt.key === 'z' && evt.metaKey) {
                evt.preventDefault();
                return setSegments((seg) => seg.slice(0, -1));
            }
            if (evt.key === 't') {
                setAdding((adding) =>
                    adding.type === 'line'
                        ? { type: 'arc', clockwise: true, center: null }
                        : { type: 'line' },
                );
            }
            if (evt.key === ' ') {
                if (adding.type === 'arc') {
                    console.log('swap');
                    setAdding({ ...adding, clockwise: !adding.clockwise });
                } else {
                    console.log('adding', adding.type);
                }
            }
            if (evt.key === 'Enter') {
                onComplete(currentSegments.current, title);
                setSegments([]);
                setTitle('Untitled');
            }
        };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, []);

    let next: null | Segment = null;
    if (cursor && dist(cursor, origin) > 10) {
        if (adding.type === 'line' && segments.length) {
            next = { type: 'Line', to: cursor };
        }
        if (adding.type === 'arc' && adding.center) {
            const angle = angleTo(adding.center, cursor);
            const prev = segments.length
                ? segments[segments.length - 1].to
                : origin;
            const mag = dist(adding.center, prev);
            const to = push(adding.center, angle, mag);
            next = {
                type: 'Arc',
                center: adding.center,
                to,
                clockwise: adding.clockwise,
            };
        }
    }

    segments = next ? segments.concat([next]) : segments;

    const insets = getInsets(segments);

    return (
        <div>
            <div>
                <Text value={title} onChange={setTitle} />
                <button
                    onClick={() => {
                        onComplete(currentSegments.current, title);
                        setSegments([]);
                        setTitle('Untitled');
                    }}
                >
                    Add example
                </button>
            </div>
            <svg
                width={size}
                height={size}
                onMouseLeave={() => setCursor(null)}
                viewBox={`-${size / 2} -${size / 2} ${size} ${size}`}
                style={{
                    border: '1px solid magenta',
                }}
                onMouseMove={(evt) => {
                    const svg = evt.currentTarget.getBoundingClientRect();
                    setCursor({
                        x: evt.clientX - svg.left - size / 2,
                        y: evt.clientY - svg.top - size / 2,
                    });
                }}
                onClick={() => {
                    if (!cursor) {
                        return;
                    }
                    if (adding.type === 'line') {
                        setSegments((segments) => {
                            return segments.concat([
                                {
                                    type: 'Line',
                                    to: cursor,
                                },
                            ]);
                        });
                    } else {
                        const arc = adding;
                        if (arc.center) {
                            const angle = angleTo(arc.center, cursor);
                            const prev = segments.length
                                ? segments[segments.length - 1].to
                                : origin;
                            const mag = dist(arc.center, prev);
                            const to = push(arc.center, angle, mag);
                            setSegments((segments) => {
                                return segments.concat([
                                    {
                                        type: 'Arc',
                                        center: arc.center!,
                                        to,
                                        clockwise: arc.clockwise,
                                    },
                                ]);
                            });
                            setAdding({ ...arc, center: null });
                        } else {
                            setAdding({ ...arc, center: cursor });
                        }
                    }
                }}
            >
                {adding.type === 'arc' && adding.center ? (
                    <circle
                        cx={adding.center.x}
                        cy={adding.center.y}
                        r={3}
                        fill="magenta"
                    />
                ) : null}
                {segments.length ? (
                    <path
                        stroke={'red'}
                        strokeWidth={3}
                        d={calcPathD(pathSegs(segments), 1)}
                    />
                ) : null}
                {Object.keys(insets)
                    .sort()
                    .map((k, ki) =>
                        insets[+k].paths.map((segments, i) => (
                            <path
                                stroke={insetColors[ki]}
                                key={`${k}:${i}`}
                                strokeDasharray={insets[+k].pass ? '' : '5 5'}
                                strokeWidth={3}
                                fill="none"
                                d={calcPathD(pathSegs(segments), 1)}
                            />
                        )),
                    )}
                <circle cx={origin.x} cy={origin.y} r={5} fill="blue" />
                {cursor ? (
                    <circle
                        cx={cursor.x}
                        cy={cursor.y}
                        r={3}
                        fill={
                            adding.type === 'arc' && !adding.center
                                ? 'magenta'
                                : 'red'
                        }
                    />
                ) : null}
            </svg>
            <div>
                <button
                    onClick={() => setAdding({ type: 'line' })}
                    disabled={adding.type === 'line'}
                >
                    Line
                </button>
                <button
                    onClick={() =>
                        setAdding({
                            type: 'arc',
                            center: null,
                            clockwise: true,
                        })
                    }
                    disabled={adding.type !== 'line'}
                >
                    Arc
                </button>
            </div>
        </div>
    );
};

render(<App />, document.getElementById('root'));

export type Insets = {
    [key: number]: {
        paths: Array<Array<Segment>>;
        pass: boolean;
    };
};

function getInsets(segments: Segment[]) {
    const insets: Insets = [];
    if (segments.length > 1) {
        for (let i = -2; i < 3; i++) {
            const inset = i * 20 + 20;
            if (inset != 0) {
                const insetted = insetSegments(segments, inset);
                insets[inset] = {
                    paths: insetted.length
                        ? pruneInsetPath(insetted).filter((s) => s.length)
                        : [],
                    pass: false,
                };
            }
        }
    }
    return insets;
}

const blankPath: Path = {
    segments: [],
    origin: { x: 0, y: 0 },
    created: 0,
    group: null,
    hidden: false,
    open: false,
    id: '',
    ordering: 0,
    style: {
        lines: [],
        fills: [],
    },
    clipMode: 'none',
};

export const pathSegs = (segments: Array<Segment>): Path => ({
    ...blankPath,
    segments,
    origin: segments[segments.length - 1].to,
});
