import * as React from 'react';
import { useCurrent } from '../src/App';
import { windingNumber } from '../src/rendering/clipPath';
import { segmentsCenter } from '../src/editor/Export';
import {
    cleanUpInsetSegments2,
    findInsidePoint,
    findInternalPos,
    findRegions,
    removeContainedRegions,
    removeNonWindingRegions,
    segmentAngle,
} from '../src/rendering/findInternalRegions';
import { segmentsToNonIntersectingSegments } from '../src/rendering/segmentsToNonIntersectingSegments';
import { angleBetween } from '../src/rendering/findNextSegments';
import { pathToPrimitives } from '../src/editor/findSelection';
import { BlurInt, Text } from '../src/editor/Forms';
import {
    angleTo,
    dist,
    push,
    translationMatrix,
} from '../src/rendering/getMirrorTransforms';
import { insetSegments, insetSegmentsBeta } from '../src/rendering/insetPath';
import {
    ensureClockwise,
    isClockwise,
    pathToPoints,
} from '../src/rendering/pathToPoints';
import { transformSegment } from '../src/rendering/points';
import { calcPathD, segmentArrow } from '../src/editor/RenderPath';
import { Coord, Segment } from '../src/types';
import { fixture } from './fixture';
import { getInsets, insetColors, pathSegs, size } from './run';
import { coordKey } from '../src/rendering/calcAllIntersections';

export const maybeSnap = (v: number, snap?: number) =>
    snap ? Math.round(v / snap) * snap : v;

export const Drawing = ({
    segments,
    zoom,
    setSegments,
    onComplete,
    render,
    snap,
}: {
    zoom: number;
    segments: Array<Segment>;
    setSegments: (fn: (segments: Array<Segment>) => Array<Segment>) => void;
    onComplete: () => void;
    render: (segs: Array<Segment>) => React.ReactNode;
    snap?: number;
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
                        x: maybeSnap(evt.clientX - svg.left - size / 2, snap),
                        y: maybeSnap(evt.clientY - svg.top - size / 2, snap),
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
                {cursor ? coordKey(cursor) : ''}
            </div>
        </div>
    );
};

const initialState = (): Array<Segment> => {
    // const center = segmentsCenter(fixture);
    // return fixture.map((seg) =>
    //     transformSegment(seg, [
    //         translationMatrix({
    //             x: -center.x,
    //             y: -center.y,
    //         }),
    //     ]),
    // ); // insetSegmentsBeta(segments, windAt);

    // return fixture;
    if (localStorage[KEY]) {
        return JSON.parse(localStorage[KEY]);
    }
    return star();
};

export const useLocalStorage = <T,>(
    key: string,
    initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [value, setValue] = React.useState((): T => {
        const data = localStorage[key];
        if (data) {
            return JSON.parse(data);
        }
        return initial;
    });
    React.useEffect(() => {
        if (value !== initial) {
            localStorage[key] = JSON.stringify(value);
        }
    }, [value]);
    return [value, setValue];
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
    const [scale, setScale] = React.useState(1);
    // const scale = 300;
    const scalePos = (p: Coord) => ({
        x: p.x * scale,
        y: p.y * scale,
    });

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
                        setDebug({ kind: 1, inset: debug?.inset ?? 0 })
                    }
                    disabled={debug?.kind === 1}
                >
                    Debug 1
                </button>
                <button
                    onClick={() =>
                        setDebug({ kind: 2, inset: debug?.inset ?? 0 })
                    }
                    disabled={debug?.kind === 2}
                >
                    Debug 2
                </button>
                <button
                    onClick={() =>
                        setDebug({ kind: 3, inset: debug?.inset ?? 0 })
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
                                inset != null
                                    ? setDebug({ inset, kind: debug.kind })
                                    : null
                            }
                        />
                        <input
                            type="range"
                            min={-60}
                            max={160}
                            // step={10}
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
                zoom={scale}
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
                        const [inset, corners] = insetSegments(
                            segments,
                            windAt,
                        );
                        const result = cleanUpInsetSegments2(inset, corners);
                        // console.log(all, result);

                        return result.map((segments, i) => (
                            <path
                                stroke={insetColors[i]}
                                key={i}
                                strokeDasharray={'2'}
                                strokeWidth={1}
                                fill="none"
                                d={calcPathD(pathSegs(segments), scale)}
                            />
                        ));
                    }

                    /*
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
                    */
                    if (showWind === 1) {
                        const inset = insetSegmentsBeta(segments, windAt);
                        const primitives = pathToPrimitives(inset);
                        const parts = segmentsToNonIntersectingSegments(inset);
                        const regions = findRegions(parts.result, parts.froms); //.filter(isClockwise);
                        return (
                            <>
                                <path
                                    d={calcPathD(pathSegs(inset), scale)}
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
                                {regions.map((region, ri) => {
                                    return region.map((seg, i) => {
                                        const prev =
                                            region[
                                                i === 0
                                                    ? region.length - 1
                                                    : i - 1
                                            ].to;
                                        const next =
                                            region[(i + 1) % region.length];
                                        const res = findInsidePoint(
                                            prev,
                                            seg,
                                            next,
                                            10 / scale,
                                        );
                                        if (!res) {
                                            return;
                                        }
                                        let [t0, t1, pos, p0] = res;

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

                                        pos = scalePos(pos);
                                        p0 = scalePos(p0);
                                        const pa = push(p0, t0, 10);
                                        const pb = push(p0, t1, 10);

                                        return (
                                            <g key={`${ri}-${i}`}>
                                                <line
                                                    x1={p0.x}
                                                    y1={p0.y}
                                                    x2={pa.x}
                                                    y2={pa.y}
                                                    stroke="white"
                                                    strokeWidth={1}
                                                />
                                                <line
                                                    x1={p0.x}
                                                    y1={p0.y}
                                                    x2={pb.x}
                                                    y2={pb.y}
                                                    stroke="black"
                                                    strokeWidth={1}
                                                />
                                                <line
                                                    x1={p0.x}
                                                    y1={p0.y}
                                                    x2={pos.x}
                                                    y2={pos.y}
                                                    stroke={
                                                        wcount === 0
                                                            ? 'red'
                                                            : 'green'
                                                    }
                                                    strokeWidth={1}
                                                />
                                            </g>
                                        );
                                    });
                                })}
                            </>
                        );
                    }
                    if (showWind === 2) {
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
                                    d={calcPathD(pathSegs(inset), scale)}
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
                                    let [t0, t1, pos, p0] = findInternalPos(
                                        region,
                                        20,
                                    );

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
                                    pos = scalePos(pos);
                                    p0 = scalePos(p0);

                                    const pa = push(p0, t0, 10);
                                    const pb = push(p0, t1, 10);
                                    return (
                                        <>
                                            <text
                                                x={pos.x}
                                                y={pos.y}
                                                fill={'white'}
                                            >
                                                {wcount}
                                            </text>
                                            <path
                                                d={calcPathD(
                                                    pathSegs(region),
                                                    scale,
                                                )}
                                                fill={`hsla(${
                                                    (i / regions.length) * 360
                                                }, 100%, 50%, 0.5)`}
                                                key={i}
                                            />
                                            <line
                                                x1={pos.x}
                                                y1={pos.y}
                                                x2={p0.x}
                                                y2={p0.y}
                                                stroke="blue"
                                                strokeWidth={1}
                                            />
                                            {wind.map(({ hit }, j) => {
                                                return (
                                                    <g key={i + 'w' + j}>
                                                        <line
                                                            x1={hit.x - 3}
                                                            y1={hit.y}
                                                            x2={hit.x + 3}
                                                            y2={hit.y}
                                                            stroke="green"
                                                            strokeWidth={1}
                                                            fill="none"
                                                        />
                                                    </g>
                                                );
                                            })}
                                            <line
                                                stroke="black"
                                                strokeWidth={2}
                                                x1={p0.x}
                                                y1={p0.y}
                                                x2={pa.x}
                                                y2={pa.y}
                                            />
                                            <line
                                                stroke="white"
                                                strokeWidth={2}
                                                x1={p0.x}
                                                y1={p0.y}
                                                x2={pb.x}
                                                y2={pb.y}
                                            />
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
                                            d={calcPathD(
                                                pathSegs(segments),
                                                scale,
                                            )}
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
