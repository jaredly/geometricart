import * as React from 'react';
import { useCurrent } from '../src/App';
import { ensureClockwise } from '../src/pathToPoints';
import { Text } from '../src/Forms';
import { angleTo, dist, push } from '../src/getMirrorTransforms';
import { calcPathD } from '../src/RenderPath';
import { Coord, Segment } from '../src/types';
import { windingNumber } from '../src/clipPath';
import { pathToPrimitives } from '../src/findSelection';
import { getInsets, size, pathSegs, insetColors } from './run';
import { RenderSegment } from '../src/RenderSegment';

export const Drawing = ({
    segments,
    setSegments,
    onComplete,
    render,
}: {
    segments: Array<Segment>;
    setSegments: (
        fn: Array<Segment> | ((segments: Array<Segment>) => Array<Segment>),
    ) => void;
    onComplete: () => void;
    render: (segs: Array<Segment>) => React.ReactNode;
}) => {
    const [cursor, setCursor] = React.useState(null as Coord | null);
    const origin = segments.length
        ? segments[segments.length - 1].to
        : { x: 0, y: 0 };

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
                onComplete();
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

    return (
        <div>
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
                {render(segments)}
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

export const Canvas = ({
    onComplete,
}: {
    onComplete: (segments: Array<Segment>, title: string) => void;
}) => {
    let [segments, setSegments] = React.useState([] as Array<Segment>);
    const [title, setTitle] = React.useState('Untitled');

    return (
        <div>
            <div>
                <Text value={title} onChange={setTitle} />
                <button
                    onClick={() => {
                        onComplete(segments, title);
                        setSegments([]);
                        setTitle('Untitled');
                    }}
                >
                    Add example
                </button>
            </div>
            <Drawing
                segments={segments}
                setSegments={setSegments}
                onComplete={() => onComplete(segments, title)}
                render={(segments) => {
                    const showWind = true;
                    if (showWind) {
                        segments = ensureClockwise(segments);
                        const wind = windingNumber(
                            { x: 0, y: 0 },
                            pathToPrimitives(segments),
                            segments,
                            false,
                        );
                        const wcount = wind.reduce(
                            (c, w) => (w.up ? 1 : -1) + c,
                            0,
                        );

                        return (
                            <>
                                <text x={0} y={0} fill={'white'}>
                                    {wcount}
                                </text>
                                {wind.map(({ prev, seg, up, hit }, i) => {
                                    return (
                                        <g key={i}>
                                            <RenderSegment
                                                prev={prev}
                                                segment={seg}
                                                zoom={1}
                                                color={up ? 'red' : 'green'}
                                            />
                                            <circle
                                                cx={hit.x}
                                                cy={hit.y}
                                                r={10}
                                                fill="green"
                                            />
                                        </g>
                                    );
                                })}
                                {segments.map((s, i) => (
                                    <circle
                                        key={i}
                                        cx={
                                            (s.to.x +
                                                segments[
                                                    (i + 1) % segments.length
                                                ].to.x *
                                                    10) /
                                            11
                                        }
                                        cy={
                                            (s.to.y +
                                                segments[
                                                    (i + 1) % segments.length
                                                ].to.y *
                                                    10) /
                                            11
                                        }
                                        r={10}
                                        strokeWidth={3}
                                        stroke="black"
                                        fill="none"
                                    />
                                ))}
                            </>
                        );
                    }
                    const insets = getInsets(segments);
                    return (
                        <>
                            {Object.keys(insets)
                                .sort()
                                .map((k, ki) =>
                                    insets[+k].paths.map((segments, i) => (
                                        <path
                                            stroke={insetColors[ki]}
                                            key={`${k}:${i}`}
                                            strokeDasharray={
                                                insets[+k].pass ? '' : '2'
                                            }
                                            strokeWidth={1}
                                            fill="none"
                                            d={calcPathD(pathSegs(segments), 1)}
                                        />
                                    )),
                                )}
                        </>
                    );
                }}
            />
        </div>
    );
};
