import * as React from 'react';
import { useCurrent } from '../src/App';
import { windingNumber } from '../src/clipPath';
import {
    cleanUpInsetSegments2,
    findInternalPos,
    findRegions,
    removeContainedRegions,
    removeNonWindingRegions,
    segmentAngle,
    segmentsToNonIntersectingSegments,
} from '../src/findInternalRegions';
import { angleBetween } from '../src/findNextSegments';
import { pathToPrimitives } from '../src/findSelection';
import { BlurInt, Text } from '../src/Forms';
import { angleTo, dist, push } from '../src/getMirrorTransforms';
import { insetSegmentsBeta } from '../src/insetPath';
import {
    ensureClockwise,
    isClockwise,
    pathToPoints,
} from '../src/pathToPoints';
import { calcPathD } from '../src/RenderPath';
import { Coord, Segment } from '../src/types';
import { getInsets, insetColors, pathSegs, size } from './run';

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
            if (document.activeElement !== document.body) {
                return;
            }
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
                evt.preventDefault();
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

const initialState = (): Array<Segment> => {
    if (localStorage[KEY]) {
        return JSON.parse(localStorage[KEY]);
    }
    return star();
    // return []
};

const KEY = 'geo-test-canvas';
export const Canvas = ({
    onComplete,
    initial,
}: {
    onComplete: (segments: Array<Segment>, title: string) => void;
    initial: null | Array<Segment>;
}) => {
    let [segments, setSegments] = React.useState(initialState());
    const [title, setTitle] = React.useState('Untitled');
    const [debug, setDebug] = React.useState(
        null as null | { kind: number; inset: number },
    );

    React.useEffect(() => {
        localStorage[KEY] = JSON.stringify(segments);
    }, [segments]);

    const iref = React.useRef(initial);
    React.useEffect(() => {
        if (iref.current !== initial) {
            iref.current = initial;
            if (initial) {
                setSegments(initial);
            }
        }
    }, [initial]);

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
                <button onClick={() => setSegments([])}>Clear</button>
            </div>
            <div>
                <button onClick={() => setDebug(null)} disabled={debug == null}>
                    No Debug
                </button>
                <button
                    onClick={() =>
                        setDebug({ kind: 1, inset: debug?.inset ?? 40 })
                    }
                    disabled={debug?.kind === 1}
                >
                    Debug 1
                </button>
                <button
                    onClick={() =>
                        setDebug({ kind: 2, inset: debug?.inset ?? 40 })
                    }
                    disabled={debug?.kind === 2}
                >
                    Debug 2
                </button>
                <button
                    onClick={() =>
                        setDebug({ kind: 3, inset: debug?.inset ?? 40 })
                    }
                    disabled={debug?.kind === 3}
                >
                    Debug 3
                </button>
                {debug ? (
                    <>
                        <BlurInt
                            value={debug.inset}
                            onChange={(inset) =>
                                inset
                                    ? setDebug({ inset, kind: debug.kind })
                                    : null
                            }
                        />
                        <input
                            type="range"
                            min={-20}
                            max={60}
                            step={10}
                            value={debug.inset}
                            onChange={(evt) =>
                                setDebug({
                                    inset: +evt.target.value,
                                    kind: debug.kind,
                                })
                            }
                        />
                    </>
                ) : null}
            </div>

            <Drawing
                segments={segments}
                setSegments={setSegments}
                onComplete={() => onComplete(segments, title)}
                render={(segments) => {
                    if (!segments.length) {
                        return;
                    }
                    const showWind = debug?.kind;
                    const windAt = debug?.inset ?? 40;
                    if (showWind === 3) {
                        const all = getInsets(segments);
                        const inset = insetSegmentsBeta(segments, windAt);
                        const result = cleanUpInsetSegments2(inset);
                        console.log(all, result);

                        return result.map((segments, i) => (
                            <path
                                stroke={insetColors[i]}
                                key={i}
                                strokeDasharray={'2'}
                                strokeWidth={1}
                                fill="none"
                                d={calcPathD(pathSegs(segments), 1)}
                            />
                        ));
                    }
                    if (showWind === 1) {
                        const inset = insetSegmentsBeta(segments, windAt);
                        const result = segmentsToNonIntersectingSegments(inset);
                        const regions = findRegions(
                            result.result,
                            result.froms,
                        );
                        const finals = removeContainedRegions(
                            removeNonWindingRegions(
                                inset,
                                regions.filter(isClockwise),
                            ),
                        );

                        // const result = cleanUpInsetSegments2(inset);

                        return (
                            <>
                                <path
                                    d={calcPathD(pathSegs(inset), 1)}
                                    stroke="rgba(255,255,0,0.5)"
                                    strokeWidth={1}
                                    fill="none"
                                />

                                {regions
                                    .filter((r) => !isClockwise(r))
                                    .map((r, i) => (
                                        <path
                                            d={calcPathD(pathSegs(r), 1)}
                                            fill="rgba(255, 255,255,0.1)"
                                            stroke="yellow"
                                            strokeWidth={0.5}
                                            key={i}
                                        />
                                    ))}
                                {finals.map((region, i) => (
                                    <path
                                        d={calcPathD(pathSegs(region), 1)}
                                        fill="rgba(0, 255,0,0.5)"
                                        stroke="yellow"
                                        strokeWidth={1}
                                        key={i}
                                    />
                                ))}
                                {result.result.map((seg, i) =>
                                    segmentArrow(seg.prev, i, seg.segment),
                                )}
                                {pathToPoints(segments).map((point, i) => (
                                    <circle
                                        key={i}
                                        cx={point.x}
                                        cy={point.y}
                                        r={5}
                                        fill="red"
                                    />
                                ))}
                            </>
                        );
                    }
                    if (showWind) {
                        const inset = insetSegmentsBeta(segments, windAt);
                        const parts = segmentsToNonIntersectingSegments(inset);
                        const regions = findRegions(
                            parts.result,
                            parts.froms,
                        ).filter(isClockwise);

                        segments = ensureClockwise(segments);
                        const primitives = pathToPrimitives(inset);
                        // const wind = windingNumber(
                        //     { x: 0, y: 0 },
                        //     primitives,
                        //     segments,
                        //     false,
                        // );
                        // const wcount = wind.reduce(
                        //     (c, w) => (w.up ? 1 : -1) + c,
                        //     0,
                        // );

                        return (
                            <>
                                {/* <text x={0} y={0} fill={'white'}>
                                    {wcount}
                                </text> */}
                                <path
                                    d={calcPathD(pathSegs(inset), 1)}
                                    fill="none"
                                    stroke="yellow"
                                    strokeWidth={1}
                                />
                                {inset.map((seg, i) =>
                                    segmentArrow(
                                        inset[
                                            i === 0 ? inset.length - 1 : i - 1
                                        ].to,
                                        i,
                                        seg,
                                    ),
                                )}
                                {regions.map((region, i) => {
                                    const pos = findInternalPos(region);
                                    const wind = windingNumber(
                                        pos,
                                        primitives,
                                        inset,
                                        false,
                                    );
                                    const wcount = wind.reduce(
                                        (c, w) => (w.up ? 1 : -1) + c,
                                        0,
                                    );
                                    return (
                                        <>
                                            <path
                                                d={calcPathD(
                                                    pathSegs(region),
                                                    1,
                                                )}
                                                fill={`hsla(${
                                                    (i / regions.length) * 360
                                                }, 100%, 50%, 0.5)`}
                                                key={i}
                                            />
                                            <circle
                                                cx={pos.x}
                                                cy={pos.y}
                                                r={2}
                                                fill={'purple'}
                                            />
                                            <text
                                                x={pos.x}
                                                y={pos.y}
                                                fill={'white'}
                                            >
                                                {wcount}
                                            </text>
                                            {wind.map(
                                                ({ prev, seg, up, hit }, j) => {
                                                    return (
                                                        <g key={i + 'w' + j}>
                                                            {/* <RenderSegment
                                                                prev={prev}
                                                                segment={seg}
                                                                zoom={1}
                                                                color={
                                                                    up
                                                                        ? 'red'
                                                                        : 'green'
                                                                }
                                                            /> */}
                                                            <circle
                                                                cx={hit.x}
                                                                cy={hit.y}
                                                                r={2}
                                                                fill="green"
                                                            />
                                                        </g>
                                                    );
                                                },
                                            )}
                                        </>
                                    );
                                })}
                                {/* {wind.map(({ prev, seg, up, hit }, i) => {
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
                                })} */}
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

const star = (): Array<Segment> => {
    const r0 = 70;
    const r1 = 60;
    const points = [];
    const n = 20;
    for (let i = 0; i < n; i++) {
        const t = ((Math.PI * 2) / n) * i;
        const p = push({ x: 0, y: 0 }, t, i % 2 === 0 ? r1 : r0);
        points.push(p);
    }
    return points.map((to) => ({ type: 'Line', to }));
};

function segmentArrow(prev: Coord, i: number, seg: Segment) {
    let mid;
    if (seg.type === 'Line') {
        mid = {
            x: (seg.to.x + prev.x) / 2,
            y: (seg.to.y + prev.y) / 2,
        };
    } else {
        const t0 = angleTo(seg.center, prev);
        const tb = angleBetween(t0, angleTo(seg.center, seg.to), seg.clockwise);
        mid = push(seg.center, t0 + tb / 2, dist(seg.center, seg.to));
    }
    const theta = angleTo(prev, seg.to);
    const show = (p: Coord) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    return (
        <polygon
            points={[
                push(mid, theta, 2),
                push(mid, theta + (Math.PI * 2) / 3, 2),
                push(mid, theta + (Math.PI * 4) / 3, 2),
            ]
                .map(show)
                .join(' ')}
            fill="purple"
            stroke="white"
            strokeWidth={0.5}
            key={i}
        />
    );
}
