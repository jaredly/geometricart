import { jsx } from '@emotion/react';
import React, { useState } from 'react';
import { BlurInt, Text, Toggle } from './Forms';
import { Animations, Coord, FloatLerp, State, LerpPoint } from './types';
import { Action } from './Action';
import prettier from 'prettier';
import babel from 'prettier/parser-babel';
import { canvasRender } from './CanvasRender';
import { epsilon } from './intersect';
import { addMetadata, findBoundingRect, renderTexture } from './Export';
import { initialHistory } from './initialState';
import { getAnimatedPaths, getAnimationScripts } from './getAnimatedPaths';
import { evaluateAnimatedValues, getAnimatedFunctions } from './Canvas';
import { useCurrent } from './App';

export const makeEven = (v: number) => {
    v = Math.ceil(v);
    return v % 2 === 0 ? v : v + 1;
};

export const AnimationEditor = ({
    state,
    dispatch,
}: {
    state: State;
    dispatch: (action: Action) => unknown;
}) => {
    const [animationPosition, setAnimationPosition] = React.useState(0);
    const canvas = React.useRef(null as null | HTMLCanvasElement);
    // const [fps, setFps] = React.useState(50);
    // const [zoom, setZoom] = React.useState(1);
    // const [increment, setIncrement] = React.useState(0.01);
    // const [lockAspectRatio, setLockAspectRatio] = React.useState(false);
    // const [crop, setCrop] = React.useState(10);
    const [recording, setRecording] = React.useState(false);
    // const [backgroundAlpha, setBackgroundAlpha] = React.useState(
    //     null as null | number,
    // );

    const {
        crop,
        fps,
        zoom,
        increment,
        restrictAspectRatio: lockAspectRatio,
        backgroundAlpha,
    } = state.animations.config;
    const setConfig = (fn: (c: Animations['config']) => Animations['config']) =>
        dispatch({
            type: 'animation:config',
            config: fn(state.animations.config),
        });
    const setCrop = (crop: number) => setConfig((c) => ({ ...c, crop }));
    const setFps = (fps: number) => setConfig((c) => ({ ...c, fps }));
    const setZoom = (zoom: number) => setConfig((c) => ({ ...c, zoom }));
    const setIncrement = (increment: number) =>
        setConfig((c) => ({ ...c, increment }));
    const setLockAspectRatio = (restrictAspectRatio: boolean) =>
        setConfig((c) => ({ ...c, restrictAspectRatio }));
    const setBackgroundAlpha = (backgroundAlpha: number) =>
        setConfig((c) => ({ ...c, backgroundAlpha }));

    const [downloadUrl, setDownloadUrl] = React.useState(
        null as null | { url: string; name: string },
    );
    const [transcodingProgress, setTranscodingProgress] = React.useState({
        start: 0.0,
        percent: 0.0,
    });

    const bounds = React.useMemo(
        () => findBoundingRect(state),
        [state.view, state.paths, state.pathGroups],
    );

    const originalSize = 1000;

    let h = bounds
        ? makeEven((bounds.y2 - bounds.y1) * state.view.zoom + crop * 2)
        : originalSize;
    let w = bounds
        ? makeEven((bounds.x2 - bounds.x1) * state.view.zoom + crop * 2)
        : originalSize;

    let dx = bounds ? (bounds.x1 + bounds.x2) / 2 : 0;
    let dy = bounds ? (bounds.y1 + bounds.y2) / 2 : 0;

    if (lockAspectRatio) {
        if (w / h > 16 / 9) {
            h = (w / 16) * 9;
        }
        if (h / w > 5 / 4) {
            w = (h / 5) * 4;
        }
    }

    const animatedFunctions = React.useMemo(
        () => getAnimatedFunctions(state.animations),
        [state.animations],
    );

    const nowRecording = useCurrent(recording);

    React.useEffect(() => {
        if (!canvas.current) {
            return;
        }
        if (nowRecording.current) {
            return;
        }

        const ctx = canvas.current.getContext('2d')!;
        ctx.save();
        canvasRender(
            ctx,
            { ...state, view: { ...state.view, center: { x: -dx, y: -dy } } },
            w * 2 * zoom,
            h * 2 * zoom,
            2 * zoom,
            animatedFunctions,
            animationPosition,
            backgroundAlpha,
        ).then(() => {
            ctx.restore();
            if (state.view.texture) {
                renderTexture(
                    state.view.texture,
                    Math.max(w * 2 * zoom, h * 2 * zoom),
                    1000,
                    // originalSize / 2,
                    ctx,
                );
            }
        });
    }, [animationPosition, state, w, h, dx, dy, zoom, backgroundAlpha]);

    const onRecord = (increment: number) => {
        const ctx = canvas.current!.getContext('2d')!;
        const images: Array<Uint8Array> = [];
        setRecording(true);
        nowRecording.current = true;

        setTranscodingProgress({ start: Date.now(), percent: 0 });

        const centeredState = {
            ...state,
            view: { ...state.view, center: { x: -dx, y: -dy } },
        };

        let i = 0;
        const prepare = async () => {
            if (backgroundAlpha != null) {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

                // for (let i = 0; i < 1 - epsilon; i += increment) {
                //     ctx.save();
                //     await canvasRender(
                //         ctx,
                //         centeredState,
                //         w * 2 * zoom,
                //         h * 2 * zoom,
                //         2 * zoom,
                //         animatedFunctions,
                //         i,
                //         backgroundAlpha,
                //     );
                //     ctx.restore();
                // }
            }
        };

        const encodeFrame = async () => {
            if (!nowRecording.current) {
                setTranscodingProgress({ start: 0, percent: 0 });
                return true;
            }
            i += increment;
            if (i >= 1 - epsilon) {
                const blob = tarImages(images, fps, state);

                setDownloadUrl({
                    url: URL.createObjectURL(blob),
                    name: new Date().toISOString() + '.tar.jdanim',
                });
                setTranscodingProgress({ start: 0, percent: 0 });
                setRecording(false);
                return true;
            }
            // ctx.globalAlpha = 0.02;
            // ctx.fillStyle = 'black';
            // ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            // // ctx.clearRect(0, 0, canvas.current.width, canvas.current.height);
            // ctx.globalAlpha = 1;

            ctx.save();
            await canvasRender(
                ctx,
                centeredState,
                w * 2 * zoom,
                h * 2 * zoom,
                2 * zoom,
                animatedFunctions,
                i,
                backgroundAlpha,
            );
            ctx.restore();
            if (state.view.texture) {
                renderTexture(
                    state.view.texture,
                    Math.max(w * 2 * zoom, h * 2 * zoom),
                    1000,
                    // originalSize / 2,
                    ctx,
                );
            }

            setTranscodingProgress((t) => ({ ...t, percent: i }));

            const dataUrl = canvas.current!.toDataURL('image/jpeg');
            const data = convertDataURIToBinary(dataUrl);
            images.push(data);
            return false;
        };

        const budget = 100;

        const fn = (budgetLeft: number) => {
            let start = Date.now();
            encodeFrame().then((finished) => {
                if (finished) {
                    return;
                }
                budgetLeft -= Date.now() - start;
                if (budgetLeft > 0) {
                    fn(budgetLeft);
                } else {
                    requestAnimationFrame(() => fn(budget));
                }
            });
        };

        prepare().then(() => {
            requestAnimationFrame(() => fn(budget));
        });
    };

    return (
        <div style={{}}>
            <canvas
                ref={canvas}
                width={makeEven(w * 2 * zoom)}
                height={makeEven(h * 2 * zoom)}
                style={{ width: w * zoom, height: h * zoom }}
            />
            <div style={{ display: 'flex' }}>
                <div>
                    FPS:{' '}
                    <BlurInt
                        value={fps}
                        onChange={(f) => (f ? setFps(f) : null)}
                    />{' '}
                    {1 / increment / fps} Seconds
                </div>
                <div>
                    Zoom:{' '}
                    <BlurInt
                        value={zoom}
                        onChange={(f) => (f ? setZoom(f) : null)}
                    />
                </div>
                <div>
                    BackgroundAlpha:{' '}
                    <BlurInt
                        value={backgroundAlpha}
                        onChange={(f) => (f ? setBackgroundAlpha(f) : null)}
                    />
                </div>
                <Toggle
                    value={lockAspectRatio}
                    onChange={setLockAspectRatio}
                    label="Ensure aspect ratio is between 16:9 and 4:5"
                />
                <div>
                    Crop:
                    <BlurInt
                        value={crop}
                        onChange={(f) => (f ? setCrop(f) : null)}
                    />
                </div>
                <div style={{ flex: 1 }} />
                <button
                    onClick={() => {
                        canvas.current!.toBlob(async (blob) => {
                            if (!blob) {
                                alert('Unable to export. Canvas error');
                                return;
                            }
                            blob = await addMetadata(blob, {
                                ...state,
                                history: initialHistory,
                            });
                            setDownloadUrl({
                                url: URL.createObjectURL(blob),
                                name: new Date().toISOString() + '.png',
                            });
                        }, 'image/png');
                    }}
                >
                    Export
                </button>
                <button
                    onClick={() => {
                        canvas.current!.toBlob(async (blob) => {
                            if (!blob) {
                                alert('Unable to export. Canvas error');
                                return;
                            }
                            const scripts = getAnimationScripts(state);
                            const currentAnimatedValues =
                                evaluateAnimatedValues(
                                    animatedFunctions,
                                    animationPosition,
                                );
                            const animatedPaths = scripts.length
                                ? getAnimatedPaths(
                                      state,
                                      scripts,
                                      currentAnimatedValues,
                                  )
                                : state.paths;

                            blob = await addMetadata(blob, {
                                ...state,
                                paths: animatedPaths,
                                animations: {
                                    lerps: {},
                                    scripts: {},
                                    config: state.animations.config,
                                },
                                history: initialHistory,
                            });
                            setDownloadUrl({
                                url: URL.createObjectURL(blob),
                                name: new Date().toISOString() + '-still.png',
                            });
                        }, 'image/png');
                    }}
                >
                    Export frame
                </button>
            </div>
            {transcodingProgress.start === 0 ? null : (
                <div>
                    {(transcodingProgress.percent * 100).toFixed(1)} percent
                    encoded. ETA{' '}
                    {(
                        ((Date.now() - transcodingProgress.start) /
                            1000 /
                            transcodingProgress.percent) *
                        (1 - transcodingProgress.percent)
                    ).toFixed(1)}
                    seconds
                    {recording ? (
                        <button onClick={() => setRecording(false)}>
                            Cancel recording
                        </button>
                    ) : null}
                </div>
            )}
            {downloadUrl ? (
                <div>
                    <a
                        href={downloadUrl.url}
                        download={downloadUrl.name}
                        style={{
                            color: 'white',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                        }}
                    >
                        Download {downloadUrl.name}
                    </a>
                </div>
            ) : null}
            <BlurInt
                value={increment}
                width={60}
                onChange={(increment) =>
                    increment ? setIncrement(increment) : null
                }
            />
            <button
                onClick={() => {
                    onRecord(increment);
                }}
            >
                Record
            </button>
            <TickTock
                t={animationPosition}
                increment={increment}
                set={setAnimationPosition}
            />
            <div
                style={{
                    background: 'rgba(0,0,0,0.4)',
                    display: 'flex',
                }}
            >
                <Scripts dispatch={dispatch} state={state} />
                <TimelineVariables dispatch={dispatch} state={state} />
            </div>
        </div>
    );
};

function tarImages(images: Uint8Array[], fps: number, state: State) {
    const tar = require('tinytar').tar;

    const args = [
        '-r',
        '' + fps,
        '-i',
        'image%03d.jpg',
        '-c:v',
        'libx264',
        '-crf',
        '18',
        '-pix_fmt',
        'yuv420p',
    ];
    args.push('video.mp4');
    const res = tar(
        images
            .map(
                (image, i) =>
                    ({
                        name: `image${i.toString().padStart(3, '0')}.jpg`,
                        data: image,
                    } as any),
            )
            .concat([
                {
                    name: 'run_ffmpeg.bash',
                    mode: parseInt('777', 8),
                    data: `#!/bin/bash
                                    set -ex
                                    ffmpeg ${args
                                        .map((a) =>
                                            a[0] === '-' ? a : `"${a}"`,
                                        )
                                        .join(' ')}
                                    `,
                },
                {
                    name: `state.json`,
                    data: JSON.stringify(state),
                },
            ]),
    );

    const blob = new Blob([res], {
        type: 'tar',
    });
    return blob;
}

export const AddVbl = ({
    onAdd,
}: {
    onAdd: (name: string, v: Animations['lerps']['']) => void;
}) => {
    const [key, setKey] = React.useState('vbl');
    const [low, setLow] = React.useState(0);
    const [high, setHigh] = React.useState(1);
    return (
        <div
            style={{
                borderBottom: '2px solid #aaa',
                padding: 8,
                margin: 8,
                marginBottom: 16,
            }}
        >
            <span>
                Vbl name:{' '}
                <input
                    value={key}
                    style={{ width: 50 }}
                    onChange={(evt) => setKey(evt.target.value)}
                    placeholder="vbl name"
                />
            </span>
            <span>
                Low:{' '}
                <BlurInt
                    value={low}
                    onChange={(v) => (v != null ? setLow(v) : null)}
                />
            </span>
            <span>
                High:{' '}
                <BlurInt
                    value={high}
                    onChange={(v) => (v != null ? setHigh(v) : null)}
                />
            </span>
            <button
                onClick={() => {
                    onAdd(key, {
                        type: 'float',
                        range: [low, high],
                        points: [],
                    });
                }}
            >
                Add New Vbl
            </button>
        </div>
    );
};

export const TickTock = ({
    t,
    set,
    increment,
}: {
    t: number;
    set: (t: number) => void;
    increment: number;
}) => {
    const [tick, setTick] = React.useState(null as number | null);
    React.useEffect(() => {
        if (!tick) {
            return;
        }
        let at = t;
        const id = setInterval(() => {
            at = (at + increment) % 1;
            set(at);
        }, tick);
        return () => clearInterval(id);
    }, [tick, increment]);
    return (
        <div>
            <BlurInt value={t} onChange={(t) => (t ? set(t) : null)} />
            <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={t + ''}
                onChange={(evt) => set(+evt.target.value)}
            />
            <button onClick={() => setTick(100)}>100ms</button>
            <button onClick={() => setTick(20)}>20ms</button>
            <button onClick={() => setTick(null)}>Clear tick</button>
        </div>
    );
};

function Scripts({
    state,
    dispatch,
}: {
    state: State;
    dispatch: (action: Action) => unknown;
}) {
    const [error, setError] = React.useState(null as null | Error);
    return (
        <div style={{ flex: 1, marginBottom: 100 }}>
            <div style={{ display: 'flex', padding: 8 }}>
                <button
                    style={{ marginRight: 16 }}
                    onClick={() => {
                        let i = 0;
                        while (state.animations.scripts[`script-${i}`]) {
                            i++;
                        }
                        const newKey = `script-${i}`;
                        dispatch({
                            type: 'script:update',
                            key: newKey,
                            script: {
                                code: `(paths, t) => {\n    // do stuff\n}`,
                                enabled: true,
                                phase: 'pre-inset',
                            },
                        });
                    }}
                >
                    Add script
                </button>
            </div>
            {Object.keys(state.animations.scripts).map((key) => {
                const script = state.animations.scripts[key];
                if (!script.enabled) {
                    return (
                        <div
                            key={key}
                            style={{
                                padding: 8,
                                border: '1px solid #aaa',
                                margin: 8,
                            }}
                        >
                            {key}{' '}
                            <button
                                onClick={() => {
                                    dispatch({
                                        type: 'script:update',
                                        key,
                                        script: {
                                            ...script,
                                            enabled: true,
                                        },
                                    });
                                }}
                            >
                                Enable
                            </button>
                        </div>
                    );
                }
                return (
                    <div
                        key={key}
                        style={{
                            padding: 8,
                            border: '1px solid white',
                            margin: 8,
                        }}
                    >
                        <div>{key}</div>
                        <button
                            onClick={() => {
                                dispatch({
                                    type: 'script:update',
                                    key,
                                    script: {
                                        ...script,
                                        enabled: !script.enabled,
                                    },
                                });
                            }}
                        >
                            {script.enabled ? 'Disable' : 'Enable'}
                        </button>
                        {script.selection ? (
                            <div>
                                Current selection: {script.selection.ids.length}{' '}
                                {script.selection.type}
                                <button
                                    onClick={() => {
                                        dispatch({
                                            type: 'script:update',
                                            key,
                                            script: {
                                                ...script,
                                                selection: undefined,
                                            },
                                        });
                                    }}
                                >
                                    Clear selection
                                </button>
                            </div>
                        ) : (
                            <div>
                                No selection (will apply to all paths)
                                <button
                                    disabled={!state.selection}
                                    onClick={() => {
                                        const sel = state.selection;
                                        if (
                                            sel?.type === 'PathGroup' ||
                                            sel?.type === 'Path'
                                        ) {
                                            dispatch({
                                                type: 'script:update',
                                                key,
                                                script: {
                                                    ...script,
                                                    selection: sel as any,
                                                },
                                            });
                                        }
                                    }}
                                >
                                    Set current selection
                                </button>
                            </div>
                        )}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'stretch',
                            }}
                        >
                            <Text
                                key={key}
                                multiline
                                value={script.code}
                                style={{ minHeight: 100 }}
                                onChange={(code) => {
                                    try {
                                        const formatted = prettier.format(
                                            code,
                                            {
                                                plugins: [babel],
                                                parser: 'babel',
                                            },
                                        );
                                        dispatch({
                                            type: 'script:update',
                                            key,
                                            script: {
                                                ...script,
                                                code: formatted,
                                            },
                                        });
                                        setError(null);
                                    } catch (err) {
                                        setError(err as Error);
                                    }
                                }}
                            />
                            {error ? (
                                <div
                                    style={{
                                        background: '#faa',
                                        border: '2px solid #f00',
                                        padding: 16,
                                        margin: 8,
                                        width: 400,
                                        whiteSpace: 'pre-wrap',
                                        fontFamily: 'monospace',
                                    }}
                                >
                                    {error.message}
                                </div>
                            ) : null}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function TimelineVariables({
    dispatch,
    state,
}: {
    dispatch: (action: Action) => unknown;
    state: State;
}) {
    return (
        <div style={{ flex: 1, overflow: 'auto' }}>
            <AddVbl
                onAdd={(key, vbl) => {
                    dispatch({ type: 'timeline:update', key, vbl });
                }}
            />
            {Object.keys(state.animations.lerps).map((key) => {
                const vbl = state.animations.lerps[key];
                if (vbl.type !== 'float') {
                    return 'Not a float, not yet supported';
                }
                return (
                    <FloatTimeline
                        key={key}
                        id={key}
                        vbl={vbl}
                        dispatch={dispatch}
                    />
                );
            })}
        </div>
    );
}

function FloatTimeline({
    id: key,
    vbl,
    dispatch,
}: {
    id: string;
    vbl: FloatLerp;
    dispatch: (action: Action) => unknown;
}): JSX.Element {
    const [current, setCurrentInner] = React.useState(null as null | FloatLerp);
    const last = React.useRef(vbl.points);
    React.useEffect(() => {
        if (last.current !== vbl.points) {
            last.current = vbl.points;
            setCurrentInner((c) => (c ? { ...c, points: vbl.points } : c));
        }
    }, [vbl.points]);

    if (!current) {
        return (
            <div
                style={{
                    padding: 8,
                    margin: 8,
                    border: '1px solid #aaa',
                }}
            >
                {key}
                <PointsViewer
                    onClick={() => setCurrentInner(vbl)}
                    points={vbl.points}
                />
                <button
                    onClick={() => {
                        dispatch({ type: 'timeline:update', key, vbl: null });
                    }}
                >
                    Delete
                </button>
            </div>
        );
    }

    return (
        <div
            style={{
                padding: 8,
                margin: 8,
                border: '1px solid #aaa',
            }}
        >
            {key}
            <button
                onClick={() => {
                    dispatch({
                        type: 'timeline:update',
                        key,
                        vbl: current,
                    });
                    setCurrentInner(null);
                }}
            >
                Save
            </button>
            <button
                onClick={() => {
                    setCurrentInner(null);
                }}
            >
                Cancel
            </button>
            <div>
                Range:
                <BlurInt
                    value={current.range[0]}
                    onChange={(low) => {
                        if (low == null) return;
                        dispatch({
                            type: 'timeline:update',
                            key,
                            vbl: {
                                ...current,
                                range: [low, current.range[1]],
                            },
                        });
                    }}
                />
                <BlurInt
                    value={current.range[1]}
                    onChange={(high) => {
                        if (high == null) return;
                        dispatch({
                            type: 'timeline:update',
                            key,
                            vbl: {
                                ...current,
                                range: [current.range[0], high],
                            },
                        });
                    }}
                />
            </div>
            <PointsEditor
                current={current.points}
                setCurrentInner={(points) =>
                    typeof points === 'function'
                        ? setCurrentInner((v) =>
                              v ? { ...v, points: points(v.points) } : v,
                          )
                        : setCurrentInner((v) => (v ? { ...v, points } : v))
                }
            />
        </div>
    );
}

export const mulPos = (a: Coord, b: Coord) => ({ x: a.x * b.x, y: a.y * b.y });

export const PointsViewer = ({
    points,
    onClick,
}: {
    points: Array<LerpPoint>;
    onClick: () => void;
}) => {
    const width = 50;
    const height = 50;

    const path = pointsPathD(height, points, width);
    return (
        <svg onClick={onClick} width={width} height={height}>
            <path d={path} stroke="red" strokeWidth={1} fill="none" />
        </svg>
    );
};

export const PointsEditor = ({
    current,
    // setCurrent,
    setCurrentInner,
}: {
    current: Array<LerpPoint>;
    // setCurrent: (p: Array<TimelinePoint>) => void;
    setCurrentInner: (
        p: Array<LerpPoint> | ((p: Array<LerpPoint>) => Array<LerpPoint>),
    ) => void;
}) => {
    // const [current, setCurrentInner] = React.useState(
    //     normalizePoints(points, 0, 1),
    // );

    const setCurrent = React.useCallback(
        (
            points:
                | Array<LerpPoint>
                | ((p: Array<LerpPoint>) => Array<LerpPoint>),
        ) => {
            if (typeof points === 'function') {
                setCurrentInner((p) => normalizePoints(points(p), 0, 1));
            } else {
                setCurrentInner(normalizePoints(points, 0, 1));
            }
        },
        [],
    );

    const svg = React.useRef(null as null | SVGElement);

    const width = 500;
    const height = 500;
    // const scale = { x: width, y: height };

    // const normalized = normalizePoints(current, 0, 1);

    const evtPos = React.useCallback(
        (evt: { clientX: number; clientY: number }) => {
            const box = svg.current!.getBoundingClientRect();
            return {
                x: (evt.clientX - box.left - 10) / width,
                y: (evt.clientY - box.top - 10) / height,
            };
        },
        [],
    );

    const changePoint = (point: LerpPoint, i: number) =>
        setCurrent((c) => {
            const n = current.slice();
            n[i] = point;
            return n;
        });

    const path = pointsPathD(height, current, width);

    // const path = pointsPath([
    //     { pos: { x: 0, y: height } },
    //     ...current.map((p) => ({
    //         pos: mulPos(p.pos, scale),
    //         leftCtrl: p.leftCtrl ? mulPos(p.leftCtrl, scale) : undefined,
    //         rightCtrl: p.rightCtrl ? mulPos(p.rightCtrl, scale) : undefined,
    //     })),
    //     { pos: { x: width, y: 0 } },
    // ]).join(' ');

    const [moving, setMoving] = React.useState(
        null as null | { i: number; which: 'pos' | 'leftCtrl' | 'rightCtrl' },
    );
    React.useEffect(() => {
        if (!moving) {
            return;
        }
        const fn = (evt: MouseEvent) => {
            evt.preventDefault();
            evt.stopPropagation();
            const pos = evtPos(evt);
            setCurrentInner((points) => {
                points = points.slice();
                points[moving.i] = {
                    ...points[moving.i],
                    [moving.which]:
                        moving.which === 'pos'
                            ? pos
                            : {
                                  x: pos.x - points[moving.i].pos.x,
                                  y: pos.y - points[moving.i].pos.y,
                              },
                };
                return points;
            });
        };
        const up = (evt: MouseEvent) => {
            evt.preventDefault();
            evt.stopPropagation();
            setMoving(null);
            setCurrent((c) => c);
        };
        document.addEventListener('mousemove', fn);
        document.addEventListener('mouseup', up);
        return () => {
            document.removeEventListener('mousemove', fn);
            document.removeEventListener('mouseup', up);
        };
    }, [moving]);

    return (
        <div>
            <svg
                style={{
                    border: '1px solid magenta',
                    display: 'block',
                }}
                ref={(node) => (node ? (svg.current = node) : null)}
                width={width + 20}
                height={height + 20}
                viewBox={`-10 -10 ${width + 20} ${height + 20}`}
                onClick={(evt) => {
                    if (evt.shiftKey || evt.metaKey) {
                        return;
                    }
                    const pos = evtPos(evt);
                    setCurrent(current.concat([{ pos }]));
                }}
            >
                <path d={path} stroke="red" strokeWidth={1} fill="none" />
                {current.map((point, i) => (
                    <React.Fragment key={i}>
                        {point.leftCtrl ? (
                            <line
                                x1={point.pos.x * width}
                                y1={point.pos.y * height}
                                x2={(point.pos.x + point.leftCtrl.x) * width}
                                y2={(point.leftCtrl.y + point.pos.y) * height}
                                stroke="blue"
                                strokeWidth={1}
                            />
                        ) : null}
                        {point.rightCtrl ? (
                            <line
                                x1={point.pos.x * width}
                                y1={point.pos.y * height}
                                x2={(point.pos.x + point.rightCtrl.x) * width}
                                y2={(point.rightCtrl.y + point.pos.y) * height}
                                stroke="green"
                                strokeWidth={1}
                            />
                        ) : null}
                        <circle
                            key={i}
                            cx={point.pos.x * width}
                            cy={point.pos.y * height}
                            r={5}
                            fill="red"
                            onMouseDown={(evt) => {
                                evt.stopPropagation();
                                evt.preventDefault();
                                setMoving({ i, which: 'pos' });
                            }}
                            onClick={(evt) => {
                                evt.stopPropagation();
                                evt.preventDefault();
                                if (evt.shiftKey) {
                                    const n = current.slice();
                                    n.splice(i, 1);
                                    return setCurrent(n);
                                }
                                if (evt.metaKey) {
                                    if (point.leftCtrl || point.rightCtrl) {
                                        changePoint({ pos: point.pos }, i);
                                    } else {
                                        changePoint(
                                            {
                                                pos: point.pos,
                                                leftCtrl: point.leftCtrl || {
                                                    x: -0.1,
                                                    y: 0,
                                                },
                                                rightCtrl: point.rightCtrl || {
                                                    x: 0.1,
                                                    y: 0,
                                                },
                                            },
                                            i,
                                        );
                                    }
                                }
                            }}
                        />
                        {point.leftCtrl ? (
                            <circle
                                key={i + 'l'}
                                cx={(point.pos.x + point.leftCtrl.x) * width}
                                cy={(point.leftCtrl.y + point.pos.y) * height}
                                r={5}
                                onMouseDown={(evt) => {
                                    evt.preventDefault();
                                    evt.stopPropagation();
                                    setMoving({ i, which: 'leftCtrl' });
                                }}
                                onClick={(evt) => {
                                    evt.stopPropagation();
                                    if (evt.shiftKey) {
                                        setCurrent((points) => {
                                            points = points.slice();
                                            points[i] = {
                                                ...points[i],
                                                leftCtrl: undefined,
                                            };
                                            return points;
                                        });
                                    }
                                }}
                                fill="blue"
                            />
                        ) : null}
                        {point.rightCtrl ? (
                            <circle
                                key={i + 'r'}
                                cx={(point.pos.x + point.rightCtrl.x) * width}
                                cy={(point.rightCtrl.y + point.pos.y) * height}
                                onClick={(evt) => {
                                    evt.stopPropagation();
                                    if (evt.shiftKey) {
                                        setCurrent((points) => {
                                            points = points.slice();
                                            points[i] = {
                                                ...points[i],
                                                rightCtrl: undefined,
                                            };
                                            return points;
                                        });
                                    }
                                }}
                                onMouseDown={(evt) => {
                                    evt.preventDefault();
                                    evt.stopPropagation();

                                    setMoving({ i, which: 'rightCtrl' });
                                }}
                                r={5}
                                fill="green"
                            />
                        ) : null}
                    </React.Fragment>
                ))}
            </svg>
        </div>
    );
};

export function pointsPathD(
    height: number,
    points: LerpPoint[],
    width: number,
) {
    const scale = { x: width, y: height };
    const scaled: Array<LerpPoint> = points.map((p) => ({
        pos: mulPos(p.pos, scale),
        leftCtrl: p.leftCtrl ? mulPos(p.leftCtrl, scale) : undefined,
        rightCtrl: p.rightCtrl ? mulPos(p.rightCtrl, scale) : undefined,
    }));
    if (!scaled.length || scaled[0].pos.x > 0) {
        scaled.unshift({ pos: { x: 0, y: 0 } });
    }
    if (!points.length || points[points.length - 1].pos.x < 1) {
        scaled.push({ pos: { x: width, y: height } });
    }
    return pointsPath(scaled).join(' ');
}

export function pointsPath(current: LerpPoint[]) {
    return current.map((p, i) => {
        if (i === 0) {
            return `M ${p.pos.x},${p.pos.y}`;
        }
        const prev = current[i - 1];
        if (prev.rightCtrl || p.leftCtrl) {
            const one = prev.rightCtrl
                ? {
                      x: prev.pos.x + prev.rightCtrl.x,
                      y: prev.pos.y + prev.rightCtrl.y,
                  }
                : prev.pos;
            const two = p.leftCtrl
                ? {
                      x: p.pos.x + p.leftCtrl.x,
                      y: p.pos.y + p.leftCtrl.y,
                  }
                : p.pos;
            return `C ${one.x},${one.y} ${two.x},${two.y} ${p.pos.x},${p.pos.y}`;
        }
        return `L ${p.pos.x},${p.pos.y}`;
    });
}

function normalizePoints(current: LerpPoint[], min: number, max: number) {
    let sorted = current.slice().sort((a, b) => a.pos.x - b.pos.x);
    sorted = sorted.map((point, i) => {
        const prev = i === 0 ? min : sorted[i - 1].pos.x;
        const next = i === sorted.length - 1 ? max : sorted[i + 1].pos.x;
        let leftCtrl = point.leftCtrl
            ? {
                  ...point.leftCtrl,
                  x: Math.min(
                      0,
                      Math.max(prev - point.pos.x, point.leftCtrl.x),
                  ),
              }
            : undefined;
        let rightCtrl = point.rightCtrl
            ? {
                  ...point.rightCtrl,
                  x: Math.max(
                      0,
                      Math.min(next - point.pos.x, point.rightCtrl.x),
                  ),
              }
            : undefined;
        return {
            leftCtrl,
            rightCtrl,
            pos: {
                x: Math.max(0, Math.min(1, point.pos.x)),
                y: Math.max(0, Math.min(1, point.pos.y)),
            },
        };
    });
    return sorted;
}

function convertDataURIToBinary(dataURI: string) {
    var base64 = dataURI.replace(/^data[^,]+,/, '');
    var raw = window.atob(base64);
    var rawLength = raw.length;

    var array = new Uint8Array(new ArrayBuffer(rawLength));
    for (let i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }
    return array;
}
