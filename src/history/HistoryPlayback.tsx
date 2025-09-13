import React, {useMemo, useRef, useState} from 'react';
import {makeEven} from '../animation/AnimationUI';
import {exportPNG, renderTexture} from '../editor/ExportPng';
import {undoAction} from '../editor/history';
import {canvasRender, makeImage, paletteImages} from '../rendering/CanvasRender';
import {coordsEqual} from '../rendering/pathsAreIdentical';
import {Action} from '../state/Action';
import {undo} from '../state/reducer';
import {Coord, State, View} from '../types';
import {animateHistory} from './animateHistory';
import {BlurInt} from '../editor/Forms';
import {CompassRenderState} from '../editor/compassAndRuler';
import {drawCompassAndRuler} from './animateAction';
import {worldToScreen} from '../editor/Canvas';
import {angleTo, dist, push} from '../rendering/getMirrorTransforms';

export const HistoryPlayback = ({
    state,
    dispatch,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
}) => {
    const canvas = React.useRef<HTMLCanvasElement>(null);

    const [zoomPreview, setZoomPreview] = useState(null as null | {zoom: number; center: Coord});

    const [exportUrl, setExportUrl] = useState(null as null | string);
    const [preview, setPreview] = useState('corner' as null | 'corner' | number);
    const [title, setTitle] = useState(false);
    const [preimage, setPreimage] = useState(false);
    const log = useRef<HTMLDivElement>(null);

    const histories = useMemo(() => {
        return getHistoriesList(state);
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
    let h = originalSize;
    let w = originalSize;

    let dx = -originalSize / 2;
    let dy = -originalSize / 2;

    let inputRef = useRef<HTMLInputElement>(null);

    // biome-ignore lint/correctness/useExhaustiveDependencies: lol
    React.useEffect(() => {
        const run = async () => {
            if (!canvas.current) {
                return;
            }

            const ctx = canvas.current.getContext('2d')!;
            ctx.save();
            const hstate = applyHistoryView(
                zoomPreview ? [{idx: current, view: zoomPreview}] : mergedVP,
                current,
                histories[current].state,
            );

            const overlays = await cacheOverlays(hstate);

            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            canvasRender(
                ctx,
                hstate,
                w * 2 * zoom,
                h * 2 * zoom,
                2 * zoom,
                {},
                0,
                overlays,
                await paletteImages(state.palette),
                false,
                null,
                true,
            );
            ctx.restore();
            if (hstate.view.texture) {
                const size = Math.max(w * 2 * zoom, h * 2 * zoom);
                renderTexture(hstate.view.texture, size, size, ctx);
            }

            const action = histories[current].action;

            if (action?.type === 'path:update:many') {
            } else {
                const cstate = histories[current].state.compassState;

                let lastMarkTheta = null as null | number;
                for (let i = current; i >= 0; i--) {
                    const action = histories[i].action;
                    if (action?.type === 'guide:add') {
                        if (action.guide.geom.type === 'CloneCircle') {
                            lastMarkTheta = 0;
                            break;
                        }
                        if (action.guide.geom.type === 'CircleMark') {
                            lastMarkTheta = action.guide.geom.angle2!;
                            break;
                        }
                    }
                }

                if (cstate) {
                    // const hstate = histories[current].state
                    drawCompassAndRuler(
                        ctx,
                        {
                            ruler: {p1: cstate.rulerP1, p2: cstate.rulerP2},
                            compass: {
                                source: {p1: cstate.compassRadius.p1, p2: cstate.compassRadius.p2},
                                mark: {
                                    p1: cstate.compassOrigin,
                                    p2: push(
                                        cstate.compassOrigin,
                                        lastMarkTheta ?? 0,
                                        dist(cstate.compassRadius.p1, cstate.compassRadius.p2),
                                    ),
                                },
                            },
                        },
                        {
                            toScreen: (point, state) =>
                                worldToScreen(ctx.canvas.width, ctx.canvas.height, point, {
                                    ...state.view,
                                    zoom: state.view.zoom * 2,
                                }),
                        },
                        hstate,
                    );
                }

                // Draw the cursor
                // if (
                //     state.lastDrawnCompassState &&
                //     !['path:create', 'path:create:many'].includes(action?.type!) &&
                //     !(action?.type === 'view:update' && !action.view.guides)
                // ) {
                //     drawCompassAndRuler(
                //         ctx,
                //         state.lastDrawnCompassState,
                //         state,
                //         histories[state.i].state,
                //     );
                // }
                // drawCursor(ctx, state.cursor.x, state.cursor.y);
            }
        };
        run();
    }, [state, w, h, dx, dy, zoom, backgroundAlpha, current, zoomPreview]);

    const stopped = useRef(true);

    return (
        <div style={{paddingBottom: 100}}>
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
                <div style={{display: 'flex'}}>
                    <label>
                        <input type="checkbox" checked={title} onChange={() => setTitle(!title)} />
                        Animate title
                    </label>
                    <div style={{flexBasis: 8}} />
                    <label>
                        Preview
                        <button
                            style={{fontWeight: preview === 'corner' ? 'bold' : undefined}}
                            onClick={() => setPreview('corner')}
                        >
                            Corner
                        </button>
                        <BlurInt
                            value={typeof preview === 'number' ? preview : null}
                            onChange={(number) => setPreview(number ?? null)}
                        />
                    </label>
                </div>
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
                                preview,
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

                <div style={{display: 'flex', flexDirection: 'column'}}>
                    <div>
                        <input
                            type="range"
                            ref={inputRef}
                            value={current}
                            max={histories.length - 1}
                            onChange={(e) => setCurrent(parseInt(e.target.value))}
                            style={{width: '500px'}}
                        />
                        <button
                            onClick={() => {
                                const view = state.historyView
                                    ? {...state.historyView}
                                    : {zooms: [], skips: []};
                                view.skips = view.skips.slice();
                                if (view.skips.includes(current)) {
                                    view.skips = view.skips.filter((k) => k !== current);
                                } else {
                                    view.skips.push(current);
                                }
                                dispatch({type: 'history-view:update', view});
                                setCurrent(current + 1);
                            }}
                            style={{
                                background: state.historyView?.skips.includes(current)
                                    ? 'red'
                                    : 'white',
                            }}
                        >
                            ✖️
                        </button>
                    </div>
                    <div style={{width: 500, position: 'relative', height: 10}}>
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
                                        ? {...state.historyView}
                                        : {zooms: [], skips: []};
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
            {histories[current].action?.type}
            <div>
                {renderZooms(state, zoomPreview, setZoomPreview, dispatch)}
                <button
                    onClick={() => {
                        const view = state.historyView
                            ? {...state.historyView}
                            : {zooms: [], skips: []};
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
            </div>
            <label>
                <input type="checkbox" checked={preimage} onChange={() => setPreimage(!preimage)} />
                Image everything in advance
            </label>
            <button
                style={{marginLeft: 8}}
                onClick={() => {
                    const state = applyHistoryView(
                        zoomPreview ? [{idx: current, view: zoomPreview}] : mergedVP,
                        current,
                        histories[current].state,
                    );
                    exportPNG(3000, state, 1000, true, false, 0).then((blob) => {
                        setExportUrl(URL.createObjectURL(blob));
                    });
                }}
            >
                Export snapshot
            </button>
            <div>
                {state.historyView?.start ?? 'No start'}
                <button
                    onClick={() => {
                        dispatch({
                            type: 'history-view:update',
                            view: {
                                ...(state.historyView ?? {
                                    zooms: [],
                                    skips: [],
                                }),
                                start: current,
                            },
                        });
                    }}
                >
                    Set start
                </button>
                {state.historyView?.end ?? 'No end'}
                <button
                    onClick={() => {
                        dispatch({
                            type: 'history-view:update',
                            view: {
                                ...(state.historyView ?? {
                                    zooms: [],
                                    skips: [],
                                }),
                                end: state.historyView?.end != null ? undefined : current,
                            },
                        });
                    }}
                >
                    {state.historyView?.end != null ? 'Clear end' : 'Set End'}
                </button>
            </div>
            {exportUrl ? (
                <a
                    href={exportUrl}
                    download={`image-snapshot-${Date.now()}.png`}
                    style={{
                        display: 'block',
                        borderRadius: 6,
                        marginBottom: 16,
                        padding: '4px 8px',
                        textDecoration: 'none',
                        cursor: 'pointer',
                    }}
                >
                    <img src={exportUrl} style={{maxHeight: 400}} />
                </a>
            ) : null}
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
    const one = vp.map((v) => ({v, from: 'vp'})).concat(zooms?.map((v) => ({v, from: 'zp'})) ?? []);
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

function renderZooms(
    state: State,
    zoomPreview: {zoom: number; center: Coord} | null,
    setZoomPreview: React.Dispatch<React.SetStateAction<{zoom: number; center: Coord} | null>>,
    dispatch: React.Dispatch<Action>,
): React.ReactNode {
    return state.historyView?.zooms.map((zoom, i) => (
        <div key={i}>
            Idx: {zoom.idx}
            Zoom:{' '}
            <NumberInput
                value={zoomPreview?.zoom ?? zoom.view.zoom}
                onChange={(v) => {
                    setZoomPreview((z) =>
                        z ? {...z, zoom: v} : {zoom: v, center: zoom.view.center},
                    );
                }}
                inner={{style: {width: 100}}}
            />
            Center:{' '}
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
                inner={{style: {width: 100}}}
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
                inner={{style: {width: 100}}}
            />
            {/* <Numberinpu */}
            {zoomPreview ? (
                <>
                    <button
                        onClick={() => {
                            const view = state.historyView
                                ? {...state.historyView}
                                : {zooms: [], skips: []};
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
            <button
                onClick={() => {
                    const view = state.historyView
                        ? {...state.historyView}
                        : {zooms: [], skips: []};
                    view.zooms = view.zooms.slice();
                    view.zooms.splice(i, 1);
                    dispatch({
                        type: 'history-view:update',
                        view,
                    });
                    setZoomPreview(null);
                }}
            >
                &times;
            </button>
        </div>
    ));
}

export async function cacheOverlays(hstate: State) {
    const overlays: {[key: string]: HTMLImageElement} = {};
    for (let [id, overlay] of Object.entries(hstate.overlays)) {
        const key = hstate.attachments[overlay.source].contents;
        overlays[key] = await makeImage(hstate.attachments[overlay.source].contents);
    }
    return overlays;
}

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
    viewPoints: {idx: number; view: Pick<View, 'zoom' | 'center'>}[],
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
    let states: {state: State; action: Action | null}[] = [];
    let current = state;
    while (true) {
        const [history, action] = undoAction(current.history);
        if (!action) {
            states.unshift({state: current, action: null});
            break;
        }
        states.unshift({
            state: overrideZoom
                ? {
                      ...current,
                      view: {...current.view, zoom: state.view.zoom},
                  }
                : current,
            action: action.action,
        });
        current = undo({...current, history}, action);
    }
    const simple = simplifyHistory(states);
    return simple.slice(state.historyView?.start ?? 0, state.historyView?.end ?? simple.length);
}
export type StateAndAction = {
    state: State;
    action: Action | null;
};

export function simplifyHistory(history: StateAndAction[]): StateAndAction[] {
    // Remove pending guides that end up being cancelled.
    let result: StateAndAction[] = [];
    for (let i = 0; i < history.length; i++) {
        const {action} = history[i];
        if (!action) {
            result.push(history[i]);
            continue;
        }
        if (action.type === 'pending:type' && action.kind === null) {
            const toRemove: number[] = [];
            for (let j = result.length - 1; j >= 0; j--) {
                const {action} = result[j];
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
        if (action.type === 'mirror:active' || action.type === 'pending:extent') {
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
