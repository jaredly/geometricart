import { jsx } from '@emotion/react';
import React, { useMemo, useState } from 'react';
import { Coord, GCodePath, Path, State, Style, StyleLine } from './types';
import { Action } from './state/Action';
import { Bounds, findBoundingRect } from './editor/Export';
import { canvasRender } from './rendering/CanvasRender';
import { BlurInt, Text } from './editor/Forms';
import { initialState } from './state/initialState';
import { pathToPoints } from './rendering/pathToPoints';
import { insetPath } from './animation/getBuiltins';
import { dist } from './rendering/getMirrorTransforms';
import { sortedVisibleInsetPaths } from './rendering/sortedVisibleInsetPaths';
import { paletteColor } from './editor/RenderPath';

const findClosest = (shape: Coord[], point: Coord) => {
    let best = null as null | [number, number];
    shape.forEach((p, i) => {
        const d = dist(p, point);
        if (best == null || d < best[0]) {
            best = [d, i];
        }
    });
    return { dist: best![0], idx: best![1] };
};

export const greedyPaths = (paths: Array<{ path: Path; style: StyleLine }>) => {
    const points: Array<Array<Coord>> = [];
    paths.forEach(({ path, style }) => {
        if (style.inset) {
            insetPath(path, style.inset).forEach((sub) => {
                points.push(pathToPoints(sub.segments));
            });
        } else {
            points.push(pathToPoints(path.segments));
        }
    });

    const ordered: Coord[][] = [];
    const first = points.shift()!;
    first.push(first[0]);
    ordered.push(first);
    while (points.length) {
        const last = ordered[ordered.length - 1];
        let point = last[last.length - 1];
        let best = null as null | { dist: number; idx: number; subIdx: number };
        points.forEach((shape, i) => {
            const closest = findClosest(shape, point);
            if (best == null || closest.dist < best.dist) {
                best = { dist: closest.dist, idx: i, subIdx: closest.idx };
            }
        });
        const next = points[best!.idx];
        points.splice(best!.idx, 1);
        const reordeeed = next
            .slice(best!.subIdx)
            .concat(next.slice(0, best!.subIdx));
        reordeeed.push(reordeeed[0]);
        ordered.push(reordeeed);
    }
    return ordered;
};

const makeDepths = (depth: number, passDepth?: number) => {
    if (passDepth == null) {
        return [depth];
    }
    const depths = [];
    for (let i = passDepth; i <= depth; i += passDepth) {
        depths.push(Math.min(i, depth));
    }
    return depths;
};

export const pxToMM = (value: number, ppi: number) => {
    return (value / ppi) * 250.4 * 6;
};

export const generateGcode = (state: State) => {
    const clip = state.view.activeClip
        ? state.clips[state.view.activeClip]
        : undefined;

    const insetPaths = sortedVisibleInsetPaths(
        state.paths,
        state.pathGroups,
        { next: () => 0.5 },
        clip,
        state.view.hideDuplicatePaths,
        undefined,
        undefined,
        undefined,
    );

    const colors = findColorPaths(insetPaths);
    const bounds = findBoundingRect(state)!;

    const scalePos = ({ x, y }: Coord) => {
        return {
            x: pxToMM(x - bounds.x1, state.meta.ppi),
            y: pxToMM(y - bounds.y1, state.meta.ppi),
        };
    };

    const lines: Array<string> = [
        'g21 ; units to mm',
        'g90 ; absolute positioning',
        'g17 ; xy plane',
    ];
    const { clearHeight, pauseHeight } = state.gcode;

    const FAST_SPEED = 500;
    let time = 0;

    let last = null as null | Coord;

    state.gcode.items.forEach((item) => {
        if (item.type === 'pause') {
            lines.push(`g0 z${pauseHeight}`, `M0 ;;; ${item.message}`);
        } else {
            const { color, depth, speed, passDepth } = item;
            const greedy = greedyPaths(colors[color]);
            makeDepths(depth, passDepth).forEach((itemDepth) => {
                greedy.forEach((shape) => {
                    shape.forEach((pos, i) => {
                        const { x, y } = scalePos(pos);
                        let travel = last ? dist({ x, y }, last) : null;
                        if (i == 0) {
                            lines.push(
                                `g0 z${clearHeight}`,
                                `g0 x${x.toFixed(3)} y${y.toFixed(3)}`,
                                `g0 z0`,
                                `g1 z${-itemDepth} f${speed}`,
                            );
                            if (travel) {
                                time += travel! / speed;
                            }
                        } else {
                            if (travel) {
                                time += travel! / speed;
                            }
                            lines.push(
                                `g1 x${x.toFixed(3)} y${y.toFixed(
                                    3,
                                )} f${speed}`,
                            );
                        }
                        last = { x, y };
                    });
                });
            });
        }
    });

    return { time, text: lines.join('\n') };
};

export const GCodeEditor = ({
    state,
    dispatch,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
}) => {
    const canvas = React.useRef(null as null | HTMLCanvasElement);

    const bounds = React.useMemo(
        () => findBoundingRect(state),
        [state.view, state.paths, state.pathGroups],
    );

    const originalSize = 1000;

    let h = bounds ? (bounds.y2 - bounds.y1) * state.view.zoom : originalSize;
    let w = bounds ? (bounds.x2 - bounds.x1) * state.view.zoom : originalSize;
    let dx = bounds ? (bounds.x1 + bounds.x2) / 2 : 0;
    let dy = bounds ? (bounds.y1 + bounds.y2) / 2 : 0;

    React.useEffect(() => {
        if (!canvas.current) {
            return;
        }

        const ctx = canvas.current.getContext('2d')!;
        ctx.save();
        canvasRender(
            ctx,
            { ...state, view: { ...state.view, center: { x: -dx, y: -dy } } },
            w * 2,
            h * 2,
            2,
            {},
            0,
            null,
        );
        ctx.restore();
    }, [state.paths, w, h, dx, dy]);

    const availableColors = useMemo(() => findColors(state), [state.paths]);

    const [url, setUrl] = useState(
        null as null | { time: number; url: string },
    );

    return (
        <div>
            <canvas
                ref={canvas}
                width={w * 2}
                height={h * 2}
                style={{
                    width: w,
                    height: h,
                    maxHeight: '60vh',
                    objectFit: 'contain',
                }}
            />
            <div style={{ margin: 8 }}>
                <button
                    onClick={() => {
                        const { time, text } = generateGcode(state);
                        const blob = new Blob(
                            [
                                text +
                                    '\n' +
                                    ';; ** STATE **\n;; ' +
                                    JSON.stringify({
                                        ...state,
                                        history: initialState.history,
                                    }),
                            ],
                            { type: 'text/plain' },
                        );
                        setUrl({ time, url: URL.createObjectURL(blob) });
                    }}
                >
                    Generate gcode
                </button>
                {url ? (
                    <>
                        <a
                            onClick={() => setUrl(null)}
                            href={url.url}
                            style={{ color: 'white', margin: '0 8px' }}
                            download={
                                'geo-' + new Date().toISOString() + '-geo.gcode'
                            }
                        >
                            Download the gcode
                        </a>
                        {url.time.toFixed(2)} minutes?
                    </>
                ) : null}
                <div>
                    PPI:
                    <BlurInt
                        value={state.meta.ppi}
                        onChange={(ppi) =>
                            ppi
                                ? dispatch({
                                      type: 'meta:update',
                                      meta: { ...state.meta, ppi },
                                  })
                                : null
                        }
                        label={(ppi) => (
                            <div style={{ marginTop: 8, marginBottom: 16 }}>
                                Content Size:{' '}
                                {bounds
                                    ? pxToMM(
                                          bounds.x2 - bounds.x1,
                                          ppi,
                                      ).toFixed(1)
                                    : 'unknown'}
                                {'mm x '}
                                {bounds
                                    ? pxToMM(
                                          bounds.y2 - bounds.y1,
                                          ppi,
                                      ).toFixed(1)
                                    : 'unknown'}
                                {'mm  '}
                                {bounds
                                    ? (
                                          pxToMM(bounds.x2 - bounds.x1, ppi) /
                                          25
                                      ).toFixed(2)
                                    : 'unknown'}
                                {'" x '}
                                {bounds
                                    ? (
                                          pxToMM(bounds.y2 - bounds.y1, ppi) /
                                          25
                                      ).toFixed(2)
                                    : 'unknown'}
                                "
                            </div>
                        )}
                    />
                    Clear Height:
                    <BlurInt
                        value={state.gcode.clearHeight}
                        onChange={(clearHeight) =>
                            clearHeight
                                ? dispatch({
                                      type: 'gcode:config',
                                      config: { clearHeight },
                                  })
                                : null
                        }
                    />
                    Pause Height:
                    <BlurInt
                        value={state.gcode.pauseHeight}
                        onChange={(pauseHeight) =>
                            pauseHeight
                                ? dispatch({
                                      type: 'gcode:config',
                                      config: { pauseHeight },
                                  })
                                : null
                        }
                    />
                </div>
                <div style={{ margin: 16 }}>
                    {state.gcode.items.map((item, i) => {
                        return (
                            <div key={i} style={{ display: 'flex' }}>
                                {item.type === 'pause' ? (
                                    <>
                                        Pause:
                                        <Text
                                            value={item.message}
                                            onChange={(message) =>
                                                dispatch({
                                                    type: 'gcode:item:are',
                                                    item: {
                                                        key: i,
                                                        type: 'edit',
                                                        value: {
                                                            ...item,
                                                            message,
                                                        },
                                                    },
                                                })
                                            }
                                        />
                                    </>
                                ) : (
                                    <ItemEdit
                                        item={item}
                                        state={state}
                                        colors={availableColors}
                                        onChange={(item) =>
                                            dispatch({
                                                type: 'gcode:item:are',
                                                item: {
                                                    key: i,
                                                    type: 'edit',
                                                    value: item,
                                                },
                                            })
                                        }
                                    />
                                )}
                                <button
                                    onClick={() =>
                                        dispatch({
                                            type: 'gcode:item:are',
                                            item: { key: i, type: 'remove' },
                                        })
                                    }
                                >
                                    Delete
                                </button>
                            </div>
                        );
                    })}
                </div>
                <button
                    onClick={() => {
                        dispatch({
                            type: 'gcode:item:are',
                            item: {
                                key: state.gcode.items.length,
                                type: 'add',
                            },
                        });
                    }}
                >
                    Add Path
                </button>
                <button
                    onClick={() => {
                        dispatch({
                            type: 'gcode:item:are',
                            item: {
                                key: state.gcode.items.length,
                                type: 'add',
                                value: {
                                    type: 'pause',
                                    message: 'Change tool',
                                },
                            },
                        });
                    }}
                >
                    Add Pause
                </button>
            </div>
        </div>
    );
};

export type Colors = {
    [key: string]: {
        count: number;
        color: string | number;
        width: number;
    };
};

const findColors = (state: State): Colors => {
    const colors: {
        [key: string]: { count: number; color: string | number; width: number };
    } = {};
    Object.keys(state.paths).forEach((k) => {
        state.paths[k].style.lines.forEach((line) => {
            if (line && line.color != null && line.width != null) {
                const key = line.color + ':' + line.width.toFixed(3);
                if (!colors[key]) {
                    colors[key] = {
                        count: 0,
                        color: line.color!,
                        width: line.width!,
                    };
                }
                colors[key].count += 1;
            }
        });
    });
    return colors;
};

export const ItemEdit = ({
    item,
    onChange,
    colors,
    state,
}: {
    item: GCodePath;
    onChange: (item: GCodePath) => void;
    colors: Colors;
    state: State;
}) => {
    const [edited, setEdited] = useState(null as null | GCodePath);
    const selected = colors[edited?.color ?? item.color];
    return (
        <div>
            <select
                onChange={(evt) =>
                    setEdited({ ...(edited ?? item), color: evt.target.value })
                }
                value={edited?.color ?? item.color}
                style={{ marginRight: 8 }}
            >
                <option value="">Select a color</option>
                {Object.keys(colors).map((key) => (
                    <option value={key + ''} key={key}>
                        {paletteColor(
                            state.palettes[state.activePalette],
                            colors[key].color,
                        )}{' '}
                        ({colors[key].count} paths)
                    </option>
                ))}
            </select>
            {selected
                ? pxToMM(selected.width / 100, state.meta.ppi).toFixed(2)
                : 'unknown'}
            mm Bit size
            <span style={{ marginRight: 8 }} /> Speed
            <input
                style={{
                    width: 40,
                    textAlign: 'center',
                    marginRight: 16,
                    marginLeft: 4,
                }}
                value={edited?.speed ?? item.speed}
                placeholder="Speed"
                onChange={(evt) =>
                    setEdited({ ...(edited ?? item), speed: +evt.target.value })
                }
            />
            Depth
            <input
                style={{
                    width: 40,
                    textAlign: 'center',
                    marginRight: 16,
                    marginLeft: 4,
                }}
                value={edited?.depth ?? item.depth}
                placeholder="Depth"
                onChange={(evt) =>
                    setEdited({ ...(edited ?? item), depth: +evt.target.value })
                }
            />
            Pass Depth
            <input
                style={{
                    width: 40,
                    textAlign: 'center',
                    marginRight: 16,
                    marginLeft: 4,
                }}
                value={edited ? edited.passDepth : item.passDepth}
                placeholder="Depth"
                onChange={(evt) =>
                    setEdited({
                        ...(edited ?? item),
                        passDepth: evt.target.value.length
                            ? +evt.target.value
                            : undefined,
                    })
                }
            />
            {edited != null ? (
                <button
                    onClick={() => {
                        onChange(edited);
                        setEdited(null);
                    }}
                >
                    Save
                </button>
            ) : null}
        </div>
    );
};
function findColorPaths(insetPaths: Path[]): {
    [key: string]: Array<{ path: Path; style: StyleLine }>;
} {
    const colors: {
        [key: string]: Array<{ path: Path; style: StyleLine }>;
    } = {};
    insetPaths.forEach((path) => {
        if (path.style.lines.length === 1) {
            const line = path.style.lines[0];
            if (!line || line.width == null || line.color == null) {
                return;
            }
            const key = line.color + ':' + line.width.toFixed(3);
            colors[key] = (colors[key] || []).concat([
                {
                    path,
                    style: line!,
                },
            ]);
        }
    });
    return colors;
}
