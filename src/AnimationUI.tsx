import { jsx } from '@emotion/react';
import React from 'react';
import { BlurInt, Text, Toggle } from './Forms';
import { Animations, State } from './types';
import { Action } from './Action';
import prettier from 'prettier';
import babel from 'prettier/parser-babel';
import { canvasRender } from './CanvasRender';
import { epsilon } from './intersect';
import { addMetadata, findBoundingRect } from './Export';
import { initialHistory } from './initialState';

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
    const [fps, setFps] = React.useState(60);
    const [increment, setIncrement] = React.useState(0.05);
    const [lockAspectRatio, setLockAspectRatio] = React.useState(false);
    const [crop, setCrop] = React.useState(10);

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
    // const crop = 10;

    let h = bounds
        ? makeEven((bounds.y2 - bounds.y1) * state.view.zoom + crop * 2)
        : originalSize;
    let w = bounds
        ? makeEven((bounds.x2 - bounds.x1) * state.view.zoom + crop * 2)
        : originalSize;
    if (lockAspectRatio) {
        if (w / h > 16 / 9) {
            h = (w / 16) * 9;
        }
        if (h / w > 4 / 3) {
            w = (h / 4) * 3;
        }
    }

    React.useEffect(() => {
        if (!canvas.current) {
            return;
        }

        const ctx = canvas.current.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.current.width, canvas.current.height);
        ctx.save();
        canvasRender(ctx, state, w * 2, h * 2, 2, animationPosition).then(
            () => {
                ctx.restore();
            },
        );
    }, [animationPosition, state, w, h]);

    const onRecord = (increment: number) => {
        const ctx = canvas.current!.getContext('2d')!;
        const images: Array<Uint8Array> = [];

        setTranscodingProgress({ start: Date.now(), percent: 0 });

        let i = 0;
        const fn = () => {
            i += increment;
            if (i >= 1 - epsilon) {
                const blob = tarImages(images, fps, state);

                setDownloadUrl({
                    url: URL.createObjectURL(blob),
                    name: new Date().toISOString() + '.tar.jdanim',
                });
                setTranscodingProgress({ start: 0, percent: 0 });
                return;
            }
            ctx.save();
            canvasRender(ctx, state, w * 2, h * 2, 2, i).then(() => {
                ctx.restore();

                setTranscodingProgress((t) => ({ ...t, percent: i }));

                const dataUrl = canvas.current!.toDataURL('image/jpeg');
                const data = convertDataURIToBinary(dataUrl);
                images.push(data);

                requestAnimationFrame(fn);
            });
        };
        requestAnimationFrame(fn);
    };

    return (
        <div style={{}}>
            <canvas
                ref={canvas}
                width={w * 2}
                height={h * 2}
                style={{ width: w, height: h }}
            />
            <div style={{ display: 'flex' }}>
                <div>
                    FPS:{' '}
                    <BlurInt
                        value={fps}
                        onChange={(f) => (f ? setFps(f) : null)}
                    />
                </div>
                <Toggle
                    value={lockAspectRatio}
                    onChange={setLockAspectRatio}
                    label="Ensure aspect ratio is between 16:9 and 3:4"
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
                    // display: 'flex',
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
    onAdd: (name: string, v: Animations['timeline']['']) => void;
}) => {
    const [key, setKey] = React.useState('t');
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
                                code: `(paths) => {\n    // do stuff\n}`,
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
            {Object.keys(state.animations.timeline).map((key) => {
                const vbl = state.animations.timeline[key];
                if (vbl.type !== 'float') {
                    return 'Not a float, not yet supported';
                }
                return (
                    <div
                        key={key}
                        style={{
                            padding: 8,
                            margin: 8,
                            border: '1px solid #aaa',
                        }}
                    >
                        {key}
                        <div>
                            Range:
                            <BlurInt
                                value={vbl.range[0]}
                                onChange={(low) => {
                                    if (low == null) return;
                                    dispatch({
                                        type: 'timeline:update',
                                        key,
                                        vbl: {
                                            ...vbl,
                                            range: [low, vbl.range[1]],
                                        },
                                    });
                                }}
                            />
                            <BlurInt
                                value={vbl.range[1]}
                                onChange={(high) => {
                                    if (high == null) return;
                                    dispatch({
                                        type: 'timeline:update',
                                        key,
                                        vbl: {
                                            ...vbl,
                                            range: [vbl.range[0], high],
                                        },
                                    });
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
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
