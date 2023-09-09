import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    convertDataURIToBinary,
    makeEven,
    tarImages,
} from '../animation/AnimationUI';
import { useCurrent } from '../App';
import { findBoundingRect } from '../editor/Export';
import { addMetadata, renderTexture } from '../editor/ExportPng';
import { undoAction } from '../editor/history';
import { canvasRender } from '../rendering/CanvasRender';
import { epsilon } from '../rendering/intersect';
import { Action } from '../state/Action';
import { undo } from '../state/reducer';
import { History, State } from '../types';
import { animateHistory } from './animateHistory';

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

export const HistoryPlayback = ({ state }: { state: State }) => {
    const canvas = React.useRef<HTMLCanvasElement>(null);
    // const interactionCanvas = React.useRef<HTMLCanvasElement>(null);
    const bounds = React.useMemo(
        () => findBoundingRect(state),
        [state.view, state.paths, state.pathGroups],
    );
    // const [recording, setRecording] = React.useState(false);

    const [preimage, setPreimage] = useState(false);
    const log = useRef<HTMLDivElement>(null);

    const histories = useMemo(() => {
        return simplifyHistory(getHistoriesList(state));
    }, [state]);

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
        const state = histories[current].state;
        canvasRender(
            ctx,
            { ...state, overlays: {} },
            w * 2 * zoom,
            h * 2 * zoom,
            2 * zoom,
            {},
            0,
            null,
        ).then(() => {
            ctx.restore();
            if (state.view.texture) {
                const size = Math.max(w * 2 * zoom, h * 2 * zoom);
                renderTexture(state.view.texture, size, size, ctx);
            }
        });
    }, [state, w, h, dx, dy, zoom, backgroundAlpha, current]);

    useEffect(() => {
        // const ctx = interactionCanvas.current!.getContext('2d')!;
        const { state, action } = histories[current];
    }, [state, current]);

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
                            );
                        } else {
                            stopped.current = true;
                        }
                    }}
                >
                    Animate it up
                </button>
            </div>
            <div>
                {current}

                <input
                    type="range"
                    ref={inputRef}
                    value={current}
                    max={histories.length - 1}
                    onChange={(e) => setCurrent(parseInt(e.target.value))}
                    style={{ width: '500px' }}
                />
            </div>
            {/* <div style={{ maxWidth: 500 }}>
                {JSON.stringify(histories[current].action)}
            </div> */}
            <button onClick={() => setPreimage(!preimage)}>
                {!preimage
                    ? 'Image everything in advance'
                    : "Don't image everything in advance"}
            </button>
        </div>
    );
};

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
