import { jsx } from '@emotion/react';
import React, { useMemo, useState } from 'react';
import { GCodePath, State } from './types';
import { Action } from './state/Action';
import { findBoundingRect } from './editor/Export';
import { canvasRender } from './rendering/CanvasRender';
import { BlurInt, Text } from './editor/Forms';

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

    return (
        <div>
            <canvas
                ref={canvas}
                width={w * 2}
                height={h * 2}
                style={{ width: w, height: h }}
            />
            <div>
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
