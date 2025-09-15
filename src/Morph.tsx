/* @jsx jsx */
import {jsx} from '@emotion/react';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useDropTarget} from './editor/useDropTarget';
import {Coord, Tiling} from './types';
import {useLocalStorage} from './vest/App';
import {TilingSvg} from './editor/Tilings';
import {getSvgData, handleTiling} from './editor/handleTiling';
import {eigenShapesToLines} from './editor/tilingPoints';
import {coordKey} from './rendering/coordKey';

const getFileContents = (file: File) => {
    return new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => {
            res(reader.result as string);
        };
        reader.onerror = () => {
            rej(reader.error);
        };
        reader.readAsText(file);
    });
};

const PREFIX = '<!-- TILING:';
const SUFFIX = '-->';

const lerp = (a: number, b: number, i: number) => a + (b - a) * i;

export const plerp = (p0: Coord, p1: Coord, i: number) => ({
    x: lerp(p0.x, p1.x, i),
    y: lerp(p0.y, p1.y, i),
});

type Moving = {idx: number; which: number; at: Coord};

const Point = ({
    pos,
    setMoving,
    moving,
    idx,
    which,
}: {
    idx: number;
    which: number;
    pos: Coord;
    moving: Moving | null;
    setMoving: (m: Moving) => void;
}) => {
    if (moving?.idx === idx && moving?.which === which) {
        pos = moving.at;
    }
    return (
        <circle
            cx={pos.x}
            cy={pos.y}
            r={0.03}
            fill="rgba(255,255,255,0.1)"
            stroke="magenta"
            strokeWidth={0.005}
            style={{
                cursor: 'pointer',
            }}
            onMouseDown={() => {
                setMoving({idx, which, at: pos});
            }}
        />
    );
};

export const Editor = ({one, two}: {one: Tiling; two: Tiling}) => {
    const onez = useMemo(() => handleTiling(one), [one]);
    const twoz = useMemo(() => handleTiling(two), [two]);

    const [frames, setFrames] = useState([onez.lines] as [Coord, Coord][][]);
    const [current, setCurrent] = useState(onez.lines);

    const [moving, setMoving] = useState(null as null | Moving);

    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        if (moving != null) {
            const fn = () => {
                setMoving((m) => {
                    if (m != null) {
                        setCurrent((current) => {
                            current = current.slice();
                            current[m.idx] = [...current[m.idx]];
                            current[m.idx][m.which] = m.at;
                            return current;
                        });
                    }
                    return null;
                });
            };
            document.body.addEventListener('mouseup', fn);
            return () => document.body.removeEventListener('mouseup', fn);
        }
    }, [moving != null]);

    const snaps = useMemo(() => {
        const byKey: {[key: string]: Coord} = {};
        const add = (...c: Coord[]) => {
            c.forEach((c) => {
                byKey[coordKey(c)] = c;
            });
        };
        add(...onez.lines.flat());
        add(...twoz.lines.flat());
        add(...onez.bounds);
        return Object.values(byKey);
    }, [onez, twoz]);

    return (
        <div>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                style={{background: 'black', width: 1000, height: 1000}}
                viewBox="-1.5 -1.5 3 3"
                onMouseMove={(evt) => {
                    if (moving) {
                        const box = evt.currentTarget.getBoundingClientRect();
                        const x = (evt.clientX - box.left) / box.width;
                        const y = (evt.clientY - box.top) / box.height;
                        const x0 = (x - 0.5) * 3;
                        const y0 = (y - 0.5) * 3;

                        const margin = 0.002;
                        let best = null as null | [Coord, number];
                        for (let snap of snaps.concat(
                            current.flatMap((c, ci) =>
                                ci === moving.idx ? (moving.which === 0 ? [c[1]] : [c[0]]) : c,
                            ),
                        )) {
                            const dx = snap.x - x0;
                            const dy = snap.y - y0;
                            const d = dx * dx + dy * dy;
                            if (d < margin && (!best || d < best[1])) {
                                best = [snap, d];
                            }
                        }

                        setMoving({
                            ...moving,
                            at: best ? best[0] : {x: x0, y: y0},
                        });
                    }
                }}
            >
                <path
                    fill="white"
                    opacity={0.1}
                    d={'M' + onez.bounds.map((p) => `${p.x} ${p.y}`).join('L') + 'Z'}
                />
                {onez.lines.map(([p0, p1], i) => (
                    <line
                        key={i}
                        x1={p0.x}
                        y1={p0.y}
                        x2={p1.x}
                        y2={p1.y}
                        strokeWidth={0.01}
                        stroke="red"
                        opacity={0.5}
                    />
                ))}
                {twoz.lines.map(([p0, p1], i) => (
                    <line
                        key={i}
                        x1={p0.x}
                        y1={p0.y}
                        x2={p1.x}
                        y2={p1.y}
                        strokeWidth={0.01}
                        stroke="blue"
                    />
                ))}
                {current.map(([p0, p1], i) => {
                    p0 = moving?.idx === i && moving.which === 0 ? moving.at : p0;
                    p1 = moving?.idx === i && moving.which === 1 ? moving.at : p1;
                    return (
                        <React.Fragment key={i}>
                            <line
                                x1={p0.x}
                                y1={p0.y}
                                x2={p1.x}
                                y2={p1.y}
                                strokeWidth={0.01}
                                stroke="red"
                                style={{cursor: 'pointer'}}
                                onDoubleClick={(evt) => {
                                    let svg = evt.currentTarget as any as HTMLElement;
                                    while (svg.nodeName !== 'svg') {
                                        svg = svg.parentElement!;
                                    }
                                    const box = svg.getBoundingClientRect();
                                    const x = (evt.clientX - box.left) / box.width;
                                    const y = (evt.clientY - box.top) / box.height;
                                    const x0 = (x - 0.5) * 3;
                                    const y0 = (y - 0.5) * 3;
                                    const pnew = {x: x0, y: y0};

                                    const c2 = current.slice();
                                    c2[i] = [p0, pnew];
                                    c2.splice(i, 0, [pnew, p1]);
                                    setCurrent(c2);
                                }}
                            />
                            <Point
                                pos={p0}
                                setMoving={setMoving}
                                moving={moving}
                                idx={i}
                                which={0}
                            />
                            <Point
                                pos={p1}
                                setMoving={setMoving}
                                moving={moving}
                                idx={i}
                                which={1}
                            />
                        </React.Fragment>
                    );
                })}
            </svg>
            <div>
                {frames.length} frames
                <div style={{display: 'flex', flexDirection: 'row'}}>
                    {frames.map((frame, i) => (
                        <div key={i} style={{display: 'flex', flexDirection: 'row'}}>
                            {TilingSvg({
                                bounds: onez.bounds,
                                shapes: [], // TODO what
                                lines: eigenShapesToLines(frame, one.shape, onez.tr, onez.bounds),
                                size: 150,
                            })}

                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                <button
                                    onClick={() => {
                                        setCurrent(frame);
                                    }}
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => {
                                        const f = frames.slice();
                                        f[i] = current;
                                        setFrames(f);
                                    }}
                                >
                                    Update
                                </button>
                                <button
                                    onClick={() => {
                                        const f = frames.slice();
                                        f.splice(i, 1);
                                        setFrames(f);
                                    }}
                                >
                                    Remove frame {i}
                                </button>
                                <button
                                    onClick={() => {
                                        const f = frames.slice();
                                        f.push(frame);
                                        setFrames(f);
                                    }}
                                >
                                    Add to end
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={() => setFrames([...frames, current])}>Save frame</button>
            </div>
            <div>
                <button
                    onClick={() => {
                        setAnimate(!animate);
                    }}
                >
                    Animate
                </button>
                <button
                    onClick={() => {
                        const blob = new Blob([JSON.stringify(frames)], {
                            type: 'application/json',
                        });
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = `frames-${Date.now()}.json`;
                        a.click();
                    }}
                >
                    Download frames
                </button>
                <input
                    type="file"
                    onChange={(evt) => {
                        getFileContents(evt.target.files!.item(0)!).then((text) => {
                            setFrames(JSON.parse(text));
                        });
                    }}
                />
            </div>
            {animate ? (
                <Animate frames={frames} shape={one.shape} tr={onez.tr} bounds={onez.bounds} />
            ) : null}
        </div>
    );
};

export const Morph = () => {
    const [tilings, setTilings] = useLocalStorage('morph:tilings', [] as Tiling[]);

    const [dragging, props] = useDropTarget(async (file) => {
        const text = await getFileContents(file);
        const st = text.indexOf(PREFIX);
        const en = text.indexOf(SUFFIX);
        if (st === -1 || en === -1) {
            return;
        }
        const json: Tiling = JSON.parse(text.slice(st + PREFIX.length, en));
        setTilings((t) => [...t, json]);
    });

    if (tilings.length === 2) {
        return (
            <div>
                <Editor one={tilings[0]} two={tilings[1]} />
                {/* <TwoPass one={tilings[0]} two={tilings[1]} /> */}
                <button
                    style={{margin: 48}}
                    onClick={() => {
                        setTilings([]);
                    }}
                >
                    Clear
                </button>
            </div>
        );
    }

    return (
        <div
            {...props}
            style={{
                padding: 50,
                backgroundColor: dragging ? '#333' : 'black',
            }}
        >
            {tilings.map((t, i) => {
                const {bounds, lines, tr} = handleTiling(t);
                console.log(lines, tr, bounds);
                return (
                    <div key={i}>
                        {/* {t.cache.hash} */}
                        {TilingSvg({
                            bounds,
                            shapes: [], // TODO what
                            lines: eigenShapesToLines(lines, t.shape, tr, bounds),
                        })}
                    </div>
                );
            })}
            {!tilings.length ? <h1>Drop a tiling please</h1> : null}
        </div>
    );
};

export const Animate = ({
    frames,
    shape,
    tr,
    bounds,
}: {
    frames: [Coord, Coord][][];
    shape: Tiling['shape'];
    tr: Coord;
    bounds: Coord[];
}) => {
    const canvas = useRef<HTMLCanvasElement>(null);
    const size = 2000;

    useEffect(() => {
        const ctx = canvas.current!.getContext('2d')!;

        const total = 400;
        const scale = 4;

        const draw = (fi: number, i: number) => {
            const perc = i / total;

            const prev = frames[fi];
            const next = frames[(fi + 1) % frames.length];

            ctx.save();

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.scale(size / scale, size / scale);
            ctx.translate(scale / 2, scale / 2);
            ctx.lineWidth = 1 / 50;

            const lerped = prev.map(([a0, a1], i): [Coord, Coord] => {
                const [b0, b1] = next[i];
                return [plerp(a0, b0, perc), plerp(a1, b1, perc)];
            });

            ctx.strokeStyle = '#339319';
            eigenShapesToLines(lerped, shape, tr, bounds).forEach(([p0, p1], i) => {
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.stroke();
            });

            ctx.restore();
        };

        const tick = (fi: number, i: number) => {
            draw(fi, i);
            requestAnimationFrame(() => {
                if (i >= total) {
                    if (fi + 2 === frames.length) {
                        setTimeout(() => {
                            tick(0, 0);
                        }, 200);
                    } else if (frames[fi + 1].length !== frames[fi + 2].length) {
                        tick(fi + 2, 0);
                    } else {
                        // tick(fi + 1, 0);
                        setTimeout(() => {
                            tick(fi + 1, 0);
                        }, 200);
                    }
                } else {
                    tick(fi, i + 1);
                }
            });
        };
        tick(0, 0);
    }, []);

    return (
        <canvas
            ref={canvas}
            width={size}
            height={size}
            style={{
                width: size / 2,
                height: size / 2,
                border: '1px solid #339319',
                margin: 48,
            }}
        />
    );
};
