import React, {useEffect, useMemo} from 'react';
import {Bounds, findBoundingRect} from '../editor/Export';
import {Text} from '../editor/Forms';
import {canvasRender} from '../rendering/CanvasRender';
import {Action} from '../state/Action';
import {Path, State, StyleLine} from '../types';
import {Toolbar} from './Toolbar';
import {Settings} from './Settings';
import {ItemEdit} from './ItemEdit';
import PathKitInit, {PathKit} from 'pathkit-wasm';
import {Canvas} from '../editor/Canvas';
import {IconDelete} from '../icons/Icon';
import {usePK} from '../editor/pk';

const many = (value: string, m: number) => {
    const values: string[] = [];
    for (let i = 0; i < m; i++) {
        values.push(value);
    }
    return values;
};

declare let process: any;

export const GCodeEditor = ({
    state,
    dispatch,
    canvasProps,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
    canvasProps: React.ComponentProps<typeof Canvas>;
}) => {
    // const canvas = React.useRef(null as null | HTMLCanvasElement);

    const bounds = React.useMemo(
        () => findBoundingRect(state),
        [state.view, state.paths, state.pathGroups],
    );

    const pathKit = usePK();

    const originalSize = 700;

    const aspect = bounds ? (bounds.y2 - bounds.y1) / (bounds.x2 - bounds.x1) : 1;

    let h = aspect > 0 ? originalSize : originalSize * aspect;
    let w = aspect > 0 ? originalSize / aspect : originalSize;
    // let h = bounds ? (bounds.y2 - bounds.y1) * state.view.zoom : originalSize;
    // let w = bounds ? (bounds.x2 - bounds.x1) * state.view.zoom : originalSize;
    // let dx = bounds ? (bounds.x1 + bounds.x2) / 2 : 0;
    // let dy = bounds ? (bounds.y1 + bounds.y2) / 2 : 0;

    const availableColors = useMemo(
        () => ({line: findLineColors(state), fill: findFillColors(state)}),
        [state.paths],
    );

    return (
        <div style={{display: 'flex'}}>
            <div>
                <Canvas {...canvasProps} width={w} height={h} />

                <div style={{margin: 8}}>
                    <Settings state={state} dispatch={dispatch} bounds={bounds} />
                    <div
                        style={{
                            margin: 16,
                            display: 'grid',
                            gridTemplateColumns: many('max-content', 16).join(' '),
                        }}
                    >
                        {state.gcode.items.map((item, i) => {
                            return (
                                <div key={i} style={{display: 'contents'}}>
                                    <UpDown i={i} dispatch={dispatch} state={state} />
                                    <div style={{flexBasis: 8}} />
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
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'red',
                                        }}
                                        onClick={() =>
                                            dispatch({
                                                type: 'gcode:item:are',
                                                item: {
                                                    key: i,
                                                    type: 'remove',
                                                },
                                            })
                                        }
                                    >
                                        <IconDelete />
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
            <div style={{marginTop: 100}}>
                {pathKit ? (
                    <Toolbar state={state} bounds={bounds} w={w} h={h} PathKit={pathKit} />
                ) : null}
            </div>
        </div>
    );
};

export const UpDown = ({
    i,
    dispatch,
    state,
}: {
    i: number;
    dispatch: React.Dispatch<Action>;
    state: State;
}) => {
    return (
        <div style={{display: 'flex', flexDirection: 'row'}}>
            <button
                disabled={i === 0}
                onClick={() => {
                    dispatch({
                        type: 'gcode:item:order',
                        oldIndex: i,
                        newIndex: i - 1,
                    });
                }}
            >
                ↑
            </button>
            <button
                disabled={i === state.gcode.items.length - 1}
                onClick={() => {
                    dispatch({
                        type: 'gcode:item:order',
                        oldIndex: i,
                        newIndex: i + 1,
                    });
                }}
            >
                ↓
            </button>
        </div>
    );
};

export type LineColors = {
    [key: string]: {
        count: number;
        color: string | number;
        width?: number;
    };
};

export type FillColors = {
    [key: string]: {
        count: number;
        color: string | number;
        lighten?: number;
    };
};

const findFillColors = (state: State): FillColors => {
    const colors: FillColors = {};
    Object.keys(state.paths).forEach((k) => {
        state.paths[k].style.fills.forEach((fill) => {
            if (fill && fill.color != null) {
                const key = fill.color + ':' + fill.lighten + ':pocket';
                if (!colors[key]) {
                    colors[key] = {
                        count: 0,
                        color: fill.color!,
                        lighten: fill.lighten,
                    };
                }
                colors[key].count += 1;
            }
        });
    });
    return colors;
};

const findLineColors = (state: State): LineColors => {
    const colors: LineColors = {};
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
    item: {type: 'pause'; message: string},
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
    [key: string]: Array<{path: Path; style: StyleLine}>;
} {
    const colors: {
        [key: string]: Array<{path: Path; style: StyleLine}>;
    } = {};
    insetPaths.forEach((path) => {
        path.style.lines.forEach((line) => {
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
        });
        path.style.fills.forEach((fill) => {
            if (fill && fill.color != null) {
                const key = fill.color + ':' + fill.lighten + ':pocket';
                colors[key] = (colors[key] || []).concat([
                    {
                        path,
                        style: fill!,
                    },
                ]);
            }
        });
    });
    return colors;
}
