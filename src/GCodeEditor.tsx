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
    const originalSize = 1000;

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
    ordered.push(points.shift()!);
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
        ordered.push(
            next.slice(best!.subIdx).concat(next.slice(0, best!.subIdx + 1)),
        );
    }
    return ordered;
};

const makeDepths = (depth: number, passDepth?: number) => {
    if (passDepth == null) {
        return [depth];
    }
    const depths = [];
    for (let i = passDepth; i <= depth; i += passDepth) {
        depths.push(i);
    }
    return depths;
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

    const colors: {
        [key: string]: Array<{ path: Path; style: StyleLine }>;
    } = {};
    insetPaths.forEach((path) => {
        if (path.style.lines.length === 1) {
            const line = path.style.lines[0];
            const color = line?.color!;
            colors[color] = (colors[color] || []).concat([
                {
                    path,
                    style: line!,
                },
            ]);
        }
    });
    Object.keys(state.paths).forEach((k) => {
        state.paths[k].style.lines.forEach((line) => {
            const color = line?.color;
            if (color) {
                colors[color] = (colors[color] || []).concat([
                    {
                        path: state.paths[k],
                        style: line,
                    },
                ]);
            }
        });
    });
    const bounds = findBoundingRect(state)!;

    const scalePos = ({ x, y }: Coord) => {
        return {
            x: ((x - bounds.x1) / state.meta.ppi) * 250.4,
            y: ((y - bounds.y1) / state.meta.ppi) * 250.4,
        };
    };

    const lines: Array<string> = [
        'g21 ; units to mm',
        'g90 ; absolute positioning',
        'g17 ; xy plane',
    ];
    const { clearHeight, pauseHeight } = state.gcode;

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
                        if (i == 0) {
                            lines.push(
                                `g0 z${clearHeight}`,
                                `g0 x${x.toFixed(3)} y${y.toFixed(3)}`,
                                `g0 z0`,
                                `g1 z${-itemDepth} f${speed}`,
                            );
                        } else {
                            lines.push(`g1 x${x.toFixed(3)} y${y.toFixed(3)}`);
                        }
                    });
                });
            });
        }
    });
    return lines.join('\n');
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

    const [url, setUrl] = useState(null as null | string);

    return (
        <div>
            <canvas
                ref={canvas}
                width={w * 2}
                height={h * 2}
                style={{ width: w, height: h }}
            />
            <div>
                {url ? (
                    <a
                        onClick={() => setUrl(null)}
                        href={url}
                        download={
                            'geo-' + new Date().toISOString() + '-geo.gcode'
                        }
                    >
                        Download the gcode
                    </a>
                ) : (
                    <button
                        onClick={() => {
                            const blob = new Blob(
                                [
                                    generateGcode(state) +
                                        '\n' +
                                        ';; ** STATE **\n;; ',
                                    // + JSON.stringify({
                                    //     ...state,
                                    //     history: initialState.history,
                                    // }),
                                ],
                                { type: 'text/plain' },
                            );
                            setUrl(URL.createObjectURL(blob));
                        }}
                    >
                        Generate gcode
                    </button>
                )}
                <div>
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
                    <br />
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
                {state.gcode.items.map((item, i) => {
                    return (
                        <div key={i}>
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
                                                    value: { ...item, message },
                                                },
                                            })
                                        }
                                    />
                                </>
                            ) : (
                                <ItemEdit
                                    item={item}
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

const findColors = (state: State) => {
    const colors: { [key: string]: number } = {};
    Object.keys(state.paths).forEach((k) => {
        state.paths[k].style.lines.forEach((line) => {
            const color = line?.color;
            if (color) {
                colors[color] = (colors[color] || 0) + 1;
            }
        });
    });
    return colors;
};

export const ItemEdit = ({
    item,
    onChange,
    colors,
}: {
    item: GCodePath;
    onChange: (item: GCodePath) => void;
    colors: { [key: string]: number };
}) => {
    const [edited, setEdited] = useState(null as null | GCodePath);
    return (
        <div>
            <select
                onChange={(evt) =>
                    setEdited({ ...(edited ?? item), color: evt.target.value })
                }
                value={edited?.color ?? item.color}
            >
                <option value="">Select a color</option>
                {Object.keys(colors).map((color) => (
                    <option value={color + ''} key={color}>
                        {color} ({colors[color]} paths)
                    </option>
                ))}
            </select>
            Speed
            <input
                value={edited?.speed ?? item.speed}
                placeholder="Speed"
                onChange={(evt) =>
                    setEdited({ ...(edited ?? item), speed: +evt.target.value })
                }
            />
            Depth
            <input
                value={edited?.depth ?? item.depth}
                placeholder="Depth"
                onChange={(evt) =>
                    setEdited({ ...(edited ?? item), depth: +evt.target.value })
                }
            />
            Pass Depth
            <input
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
