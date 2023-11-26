import React, { useMemo, useRef, useState } from 'react';
import { makeEven } from '../animation/AnimationUI';
import { renderTexture } from '../editor/ExportPng';
import { undoAction } from '../editor/history';
import { canvasRender } from '../rendering/CanvasRender';
import { Action } from '../state/Action';
import { undo } from '../state/reducer';
import { Coord, State, View } from '../types';
import { animateHistory } from './animateHistory';
import { coordsEqual } from '../rendering/pathsAreIdentical';

// const historyItems = (history: History) => {
//     let current = history.branches[history.currentBranch];
//     let items = current.items.slice();
//     while (current.parent) {
//         const { branch, idx } = current.parent;
//         current = history.branches[branch];
//         items = current.items.slice(0, idx).concat(items);
//     }
//     return items;
// };

export const HistoryPlayback = ({
    state,
    dispatch,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
}) => {
    const canvas = React.useRef<HTMLCanvasElement>(null);
    // const interactionCanvas = React.useRef<HTMLCanvasElement>(null);
    // const bounds = React.useMemo(
    //     () => findBoundingRect(state),
    //     [state.view, state.paths, state.pathGroups],
    // );
    // const [recording, setRecording] = React.useState(false);

    const [zoomPreview, setZoomPreview] = useState(
        null as null | { zoom: number; center: Coord },
    );

    const [title, setTitle] = useState(false);
    const [preimage, setPreimage] = useState(false);
    const log = useRef<HTMLDivElement>(null);

    const histories = useMemo(() => {
        return simplifyHistory(getHistoriesList(state));
    }, [state]);

    const viewPoints = useMemo(() => findViewPoints(histories), [histories]);
    const mergedVP = useMemo(
        () => mergeViewPoints(viewPoints, state.historyView?.zooms),
        [viewPoints, state.historyView?.zooms],
    );

    const [current, setCurrent] = React.useState(0);

    const {
        crop,
        fps,
        zoom,
        increment,
        restrictAspectRatio: lockAspectRatio,
        backgroundAlpha,
    } = state.animations.config;

    const originalSize = 1000;
    // let h = bounds
    //     ? makeEven((bounds.y2 - bounds.y1) * state.view.zoom + crop * 2)
    //     : originalSize;
    // let w = bounds
    //     ? makeEven((bounds.x2 - bounds.x1) * state.view.zoom + crop * 2)
    //     : originalSize;
    let h = originalSize;
    let w = originalSize;

    // let dx = bounds ? (bounds.x1 + bounds.x2) / 2 : 0;
    // let dy = bounds ? (bounds.y1 + bounds.y2) / 2 : 0;
    let dx = -originalSize / 2;
    let dy = -originalSize / 2;

    let inputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (!canvas.current) {
            return;
        }
        const ctx = canvas.current.getContext('2d')!;
        ctx.save();
        const hstate = applyHistoryView(
            zoomPreview ? [{ idx: current, view: zoomPreview }] : mergedVP,
            current,
            // zoomPreview
            //     ? [{ idx: current, view: zoomPreview }]
            //     : state.historyView?.zooms ?? [],
            histories[current].state,
        );

        canvasRender(
            ctx,
            { ...hstate, overlays: {} },
            w * 2 * zoom,
            h * 2 * zoom,
            2 * zoom,
            {},
            0,
            null,
        ).then(() => {
            ctx.restore();
            if (hstate.view.texture) {
                const size = Math.max(w * 2 * zoom, h * 2 * zoom);
                renderTexture(hstate.view.texture, size, size, ctx);
            }
        });
    }, [state, w, h, dx, dy, zoom, backgroundAlpha, current, zoomPreview]);

    // useEffect(() => {
    //     // const ctx = interactionCanvas.current!.getContext('2d')!;
    //     const { state, action } = histories[current];
    // }, [state, current]);

    const stopped = useRef(true);

    return (
        <div style={{}}>
            <canvas
                ref={canvas}
                width={makeEven(w * 2 * zoom)}
                height={makeEven(h * 2 * zoom)}
                style={{
                    width: w * zoom,
                    height: h * zoom,
                    outline: '1px solid #333',
                    margin: 16,
                }}
            />
            <div>
                <label>
                    <input
                        type="checkbox"
                        checked={title}
                        onChange={() => setTitle(!title)}
                    />
                    Animate title
                </label>
                <div ref={log} />
                <button
                    onClick={() => {
                        if (stopped.current) {
                            stopped.current = false;
                            animateHistory(
                                state,
                                canvas.current!,
                                stopped,
                                current,
                                preimage,
                                log,
                                inputRef.current,
                                title,
                            );
                        } else {
                            stopped.current = true;
                        }
                    }}
                >
                    Animate it up
                </button>
            </div>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                }}
            >
                <span
                    style={{
                        width: 30,
                        display: 'inline-block',
                        textAlign: 'right',
                        marginRight: 8,
                    }}
                >
                    {current}
                </span>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div>
                        <input
                            type="range"
                            ref={inputRef}
                            value={current}
                            max={histories.length - 1}
                            onChange={(e) =>
                                setCurrent(parseInt(e.target.value))
                            }
                            style={{ width: '500px' }}
                        />
                        <button
                            onClick={() => {
                                const view = state.historyView
                                    ? { ...state.historyView }
                                    : { zooms: [], skips: [] };
                                view.skips = view.skips.slice();
                                if (view.skips.includes(current)) {
                                    view.skips = view.skips.filter(
                                        (k) => k !== current,
                                    );
                                } else {
                                    view.skips.push(current);
                                }
                                dispatch({ type: 'history-view:update', view });
                                setCurrent(current + 1);
                            }}
                            style={{
                                background: state.historyView?.skips.includes(
                                    current,
                                )
                                    ? 'red'
                                    : 'white',
                            }}
                        >
                            ✖️
                        </button>
                    </div>
                    <div
                        style={{ width: 500, position: 'relative', height: 10 }}
                    >
                        {viewPoints.map((pt) => (
                            <div
                                key={pt.idx}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: (pt.idx / histories.length) * 500,
                                    width: 10,
                                    height: 10,
                                    backgroundColor: 'green',
                                    borderRadius: 5,
                                    cursor: 'pointer',
                                }}
                                onClick={() => {
                                    const view = state.historyView
                                        ? { ...state.historyView }
                                        : { zooms: [], skips: [] };
                                    view.zooms = view.zooms.slice();
                                    view.zooms.push({
                                        idx: current,
                                        view: pt.view,
                                    });
                                    dispatch({
                                        type: 'history-view:update',
                                        view,
                                    });
                                }}
                            />
                        ))}
                        {state.historyView?.skips.map((idx) => (
                            <div
                                key={idx}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: (idx / histories.length) * 500,
                                    width: 5,
                                    height: 5,
                                    backgroundColor: 'red',
                                    borderRadius: 5,
                                    cursor: 'pointer',
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
            <div>
                {state.historyView?.zooms.map((zoom, i) => (
                    // <EditZoom zoom={zoom} setPreview={setZoomPreview} />
                    <div key={i}>
                        Idx:
                        {zoom.idx}
                        Zoom:
                        <NumberInput
                            value={zoomPreview?.zoom ?? zoom.view.zoom}
                            onChange={(v) => {
                                setZoomPreview((z) =>
                                    z
                                        ? { ...z, zoom: v }
                                        : { zoom: v, center: zoom.view.center },
                                );
                            }}
                            inner={{ style: { width: 100 } }}
                        />
                        Center:
                        <NumberInput
                            value={zoomPreview?.center.x ?? zoom.view.center.x}
                            onChange={(v) => {
                                setZoomPreview((z) =>
                                    z
                                        ? {
                                              ...z,
                                              center: {
                                                  x: v,
                                                  y: z.center.y,
                                              },
                                          }
                                        : {
                                              zoom: zoom.view.zoom,
                                              center: {
                                                  x: v,
                                                  y: zoom.view.center.y,
                                              },
                                          },
                                );
                            }}
                            inner={{ style: { width: 100 } }}
                        />
                        <NumberInput
                            value={zoomPreview?.center.y ?? zoom.view.center.y}
                            onChange={(v) => {
                                setZoomPreview((z) =>
                                    z
                                        ? {
                                              ...z,
                                              center: {
                                                  x: z.center.x,
                                                  y: v,
                                              },
                                          }
                                        : {
                                              zoom: zoom.view.zoom,
                                              center: {
                                                  x: zoom.view.center.x,
                                                  y: v,
                                              },
                                          },
                                );
                            }}
                            inner={{ style: { width: 100 } }}
                        />
                        {/* <Numberinpu */}
                        {zoomPreview ? (
                            <>
                                <button
                                    onClick={() => {
                                        const view = state.historyView
                                            ? { ...state.historyView }
                                            : { zooms: [], skips: [] };
                                        view.zooms = view.zooms.slice();
                                        view.zooms[i].view = zoomPreview;
                                        dispatch({
                                            type: 'history-view:update',
                                            view,
                                        });
                                        setZoomPreview(null);
                                    }}
                                >
                                    Commit
                                </button>
                                <button
                                    onClick={() => {
                                        setZoomPreview(null);
                                    }}
                                >
                                    Reset
                                </button>
                            </>
                        ) : null}
                    </div>
                ))}
                <button
                    onClick={() => {
                        const view = state.historyView
                            ? { ...state.historyView }
                            : { zooms: [], skips: [] };
                        view.zooms = view.zooms.slice();
                        view.zooms.push({
                            idx: current,
                            view: {
                                center: state.view.center,
                                zoom: state.view.zoom,
                            },
                        });
                        dispatch({
                            type: 'history-view:update',
                            view,
                        });
                    }}
                >
                    Add zoom override
                </button>
                {/* {JSON.stringify(state.historyView ?? 'no history view')} */}
            </div>
            <button onClick={() => setPreimage(!preimage)}>
                {!preimage
                    ? 'Image everything in advance'
                    : "Don't image everything in advance"}
            </button>
        </div>
    );
};

const NumberInput = ({
    value,
    onChange,
    inner,
}: {
    value: number;
    onChange: (v: number) => void;
    inner: React.ComponentProps<'input'>;
}) => {
    const [v, setV] = useState(null as null | string);
    return (
        <input
            value={v ?? value + ''}
            onChange={(evt) => {
                const value = evt.currentTarget.value;
                if (parseInt(value) + '' === value) {
                    setV(null);
                    onChange(parseInt(value));
                    return;
                }
                if (!isNaN(parseFloat(value)) && !value.endsWith('.')) {
                    setV(null);
                    onChange(parseFloat(value));
                    return;
                }
                setV(value);
            }}
            {...inner}
        />
    );
};

// const EditZoom = () => {
//     return <div>

//     </div>
// }

type ViewPoints = {
    idx: number;
    view: Pick<View, 'zoom' | 'center'>;
};

export const mergeViewPoints = (vp: ViewPoints[], zooms?: ViewPoints[]) => {
    const one = vp
        .map((v) => ({ v, from: 'vp' }))
        .concat(zooms?.map((v) => ({ v, from: 'zp' })) ?? []);
    return one
        .sort((a, b) =>
            a.v.idx === b.v.idx
                ? a.from !== b.from
                    ? a.from === 'vp'
                        ? -1
                        : 1
                    : 0
                : a.v.idx - b.v.idx,
        )
        .map((v) => v.v);
};

export function findViewPoints(histories: StateAndAction[]) {
    let points: ViewPoints[] = [];
    histories.forEach((item, i) => {
        let prev = points.length ? points[points.length - 1] : null;
        if (
            !prev ||
            prev.view.zoom !== item.state.view.zoom ||
            !coordsEqual(item.state.view.center, prev.view.center)
        ) {
            points.push({
                view: {
                    zoom: item.state.view.zoom,
                    center: item.state.view.center,
                },
                idx: i,
            });
        }
    });
    return points;
}

export function applyHistoryView(
    viewPoints: { idx: number; view: Pick<View, 'zoom' | 'center'> }[],
    current: number,
    // zooms: NonNullable<State['historyView']>['zooms'],
    hstate: State,
) {
    let relevantView = null;
    // console.log('zoomz', zooms);
    for (let vp of viewPoints) {
        if (vp.idx > current) break;
        relevantView = vp;
        // const f = zooms.find((z) => z.idx === vp.idx);
        // if (f) {
        //     console.log('found zoom for', vp.idx);
        //     relevantView = f;
        // }
    }
    if (relevantView) {
        hstate = {
            ...hstate,
            view: {
                ...hstate.view,
                center: relevantView.view.center,
                zoom: relevantView.view.zoom,
            },
        };
    }
    return hstate;
}

export function getHistoriesList(state: State, overrideZoom?: boolean) {
    let states: { state: State; action: Action | null }[] = [];
    let current = state;
    while (true) {
        const [history, action] = undoAction(current.history);
        if (!action) {
            states.unshift({ state: current, action: null });
            break;
        }
        states.unshift({
            state: overrideZoom
                ? {
                      ...current,
                      view: { ...current.view, zoom: state.view.zoom },
                  }
                : current,
            action: action.action,
        });
        current = undo({ ...current, history }, action);

        // Object.entries(current.paths).forEach(([id, path]) => {
        //     path.style.lines.forEach((line) => {
        //         if (line?.width === 3) {
        //             // line.width = 1;
        //         }
        //     });
        // });
    }
    return states;
}
export type StateAndAction = {
    state: State;
    action: Action | null;
};

export function simplifyHistory(history: StateAndAction[]): StateAndAction[] {
    // Remove pending guides that end up being cancelled.
    let result: StateAndAction[] = [];
    for (let i = 0; i < history.length; i++) {
        const { action } = history[i];
        if (!action) {
            result.push(history[i]);
            continue;
        }
        if (action.type === 'pending:type' && action.kind === null) {
            const toRemove: number[] = [];
            for (let j = result.length - 1; j >= 0; j--) {
                const { action } = result[j];
                if (!action) {
                    continue;
                }
                if (action.type === 'pending:point') {
                    toRemove.push(j);
                    continue;
                }
                if (action.type === 'pending:type') {
                    toRemove.push(j);
                    break;
                }
            }
            result = result.filter((_, j) => !toRemove.includes(j));
            continue;
        }
        // Skip some?
        if (
            action.type === 'mirror:active' ||
            action.type === 'pending:extent'
        ) {
            continue;
        }
        // Collapse all view updates.
        if (action.type === 'view:update' && result.length) {
            const last = result[result.length - 1];
            if (last.action?.type === 'view:update') {
                result[result.length - 1] = history[i];
                continue;
            }
        }
        result.push(history[i]);
    }
    return result;
}
