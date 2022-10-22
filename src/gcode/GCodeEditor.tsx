import React, { useMemo } from 'react';
import { Bounds, findBoundingRect } from '../editor/Export';
import { Text } from '../editor/Forms';
import { canvasRender } from '../rendering/CanvasRender';
import { Action } from '../state/Action';
import { Path, State, StyleLine } from '../types';
import { Toolbar } from './Toolbar';
import { Settings } from './Settings';
import { ItemEdit } from './ItemEdit';

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
                style={{
                    width: w,
                    height: h,
                    maxHeight: '60vh',
                    objectFit: 'contain',
                }}
            />
            <div style={{ margin: 8 }}>
                <Settings state={state} dispatch={dispatch} bounds={bounds} />
                <div style={{ margin: 16 }}>
                    {state.gcode.items.map((item, i) => {
                        return (
                            <div key={i} style={{ display: 'flex' }}>
                                {item.type === 'pause' ? (
                                    Pause(item, dispatch, i)
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
            {Toolbar(state, bounds, w, h)}
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

function Pause(
    item: { type: 'pause'; message: string },
    dispatch: React.Dispatch<Action>,
    i: number,
): React.ReactNode {
    return (
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
    );
}

export function findColorPaths(insetPaths: Path[]): {
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
