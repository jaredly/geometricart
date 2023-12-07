import React, { useState } from 'react';
import { useCurrent } from '../App';
import { evaluateAnimatedValues, getAnimatedFunctions } from '../editor/Canvas';
import { findBoundingRect } from '../editor/Export';
import { addMetadata, renderTexture } from '../editor/ExportPng';
import { BlurInt, Toggle } from '../editor/Forms';
import { CancelIcon, CheckmarkIcon, PencilIcon } from '../icons/Icon';
import { epsilon } from '../rendering/intersect';
import { canvasRender } from '../rendering/CanvasRender';
import { Action } from '../state/Action';
import { initialHistory } from '../state/initialState';
import { Animations, State } from '../types';
import { getAnimatedPaths, getAnimationScripts } from './getAnimatedPaths';
import { Timelines } from './Timeline';
import { Scripts } from './Scripts';
import { Lerps } from './Lerps';
// @ts-ignore
import { tar } from 'tinytar';
import { cacheOverlays } from '../history/HistoryPlayback';

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
    const [recording, setRecording] = React.useState(false);

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
        const run = async () => {
            if (!canvas.current) {
                return;
            }
            if (nowRecording.current) {
                return;
            }

            const ctx = canvas.current.getContext('2d')!;
            ctx.save();
            await canvasRender(
                ctx,
                {
                    ...state,
                    view: { ...state.view, center: { x: -dx, y: -dy } },
                },
                w * 2 * zoom,
                h * 2 * zoom,
                2 * zoom,
                animatedFunctions,
                animationPosition,
                await cacheOverlays(state),
                animationPosition === 0 ? null : backgroundAlpha,
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
        };
        run();
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

            ctx.save();
            await canvasRender(
                ctx,
                centeredState,
                w * 2 * zoom,
                h * 2 * zoom,
                2 * zoom,
                animatedFunctions,
                i,
                await cacheOverlays(state),
                i === 0 ? null : backgroundAlpha,
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
        <div style={{ paddingBottom: 50 }}>
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
                            const animatedPaths = Object.keys(scripts).length
                                ? getAnimatedPaths(
                                      state,
                                      scripts,
                                      animationPosition,
                                      currentAnimatedValues,
                                  )
                                : state.paths;

                            blob = await addMetadata(blob, {
                                ...state,
                                paths: animatedPaths,
                                animations: {
                                    timelines: [],
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
                <button
                    onClick={() => {
                        const scripts = getAnimationScripts(state);
                        const currentAnimatedValues = evaluateAnimatedValues(
                            animatedFunctions,
                            animationPosition,
                        );
                        const animatedPaths = Object.keys(scripts).length
                            ? getAnimatedPaths(
                                  state,
                                  scripts,
                                  animationPosition,
                                  currentAnimatedValues,
                              )
                            : state.paths;
                        dispatch({
                            type: 'reset',
                            state: {
                                ...state,
                                paths: animatedPaths,
                                animations: {
                                    timelines: [],
                                    lerps: {},
                                    scripts: {},
                                    config: state.animations.config,
                                },
                                history: initialHistory,
                            },
                        });
                    }}
                >
                    Calcify &amp; Reset
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
                <Timelines
                    dispatch={dispatch}
                    state={state}
                    animationPosition={animationPosition}
                    setAnimationPosition={setAnimationPosition}
                />
                <Lerps dispatch={dispatch} state={state} />
            </div>
            <Scripts state={state} dispatch={dispatch} />
        </div>
    );
};

export const Editable = ({
    text,
    onChange,
}: {
    text: string;
    onChange: (t: string) => void;
}) => {
    const [editing, setEditing] = useState(null as null | string);
    if (editing != null) {
        return (
            <>
                <input
                    value={editing}
                    onChange={(evt) => setEditing(evt.target.value)}
                />
                <button
                    onClick={() => {
                        setEditing(null);
                        onChange(editing);
                    }}
                >
                    <CheckmarkIcon />
                </button>
                <button onClick={() => setEditing(null)}>
                    <CancelIcon />
                </button>
            </>
        );
    }
    return (
        <>
            {text}
            <button
                onClick={() => {
                    setEditing(text);
                }}
            >
                <PencilIcon />
            </button>
        </>
    );
};

export function tarImages(images: Uint8Array[], fps: number, state: State) {
    // @ts-ignore
    // const tar = import('tinytar').tar;

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
    const [kind, setKind] = React.useState(
        'float' as 'float' | 'float-fn' | 'pos-fn',
    );
    return (
        <div
            style={{
                borderBottom: '2px solid #aaa',
                padding: 8,
                margin: 8,
                marginBottom: 16,
            }}
        >
            <span style={{ marginRight: 8 }}>
                Vbl name:{' '}
                <input
                    value={key}
                    style={{ width: 50 }}
                    onChange={(evt) => setKey(evt.target.value)}
                    placeholder="vbl name"
                />
            </span>
            <span style={{ marginRight: 8 }}>
                Kind:{' '}
                <button
                    onClick={() => setKind('float')}
                    disabled={kind === 'float'}
                >
                    Lines
                </button>
                <button
                    onClick={() => setKind('float-fn')}
                    disabled={kind === 'float-fn'}
                >
                    Float
                </button>
                <button
                    onClick={() => setKind('pos-fn')}
                    disabled={kind === 'pos-fn'}
                >
                    Pos
                </button>
            </span>
            {kind === 'float' ? (
                <>
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
                </>
            ) : null}
            <button
                onClick={() => {
                    onAdd(
                        key,
                        kind === 'float'
                            ? {
                                  type: 'float',
                                  range: [low, high],
                                  points: [],
                              }
                            : kind === 'float-fn'
                            ? {
                                  type: 'float-fn',
                                  code: '(t) => sin(t)',
                              }
                            : {
                                  type: 'pos-fn',
                                  code: '(t) => ({x: sin(t), y: cos(t)})',
                              },
                    );
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

export function convertDataURIToBinary(dataURI: string) {
    var base64 = dataURI.replace(/^data[^,]+,/, '');
    var raw = window.atob(base64);
    var rawLength = raw.length;

    var array = new Uint8Array(new ArrayBuffer(rawLength));
    for (let i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }
    return array;
}
