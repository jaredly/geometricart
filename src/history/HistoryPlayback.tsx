import React, { useEffect, useMemo, useRef } from 'react';
import {
    convertDataURIToBinary,
    makeEven,
    tarImages,
} from '../animation/AnimationUI';
import { useCurrent } from '../App';
import { addMetadata, findBoundingRect, renderTexture } from '../editor/Export';
import { undoAction } from '../editor/history';
import { canvasRender } from '../rendering/CanvasRender';
import { epsilon } from '../rendering/intersect';
import { Action } from '../state/Action';
import { undo } from '../state/reducer';
import { History, State } from '../types';
import { animateHistory } from './animateHistory';

const historyItems = (history: History) => {
    let current = history.branches[history.currentBranch];
    let items = current.items.slice();
    while (current.parent) {
        const { branch, idx } = current.parent;
        current = history.branches[branch];
        items = current.items.slice(0, idx).concat(items);
    }
    return items;
};

export const HistoryPlayback = ({ state }: { state: State }) => {
    const canvas = React.useRef<HTMLCanvasElement>(null);
    // const interactionCanvas = React.useRef<HTMLCanvasElement>(null);
    const bounds = React.useMemo(
        () => findBoundingRect(state),
        [state.view, state.paths, state.pathGroups],
    );
    // const [recording, setRecording] = React.useState(false);

    const histories = useMemo(() => {
        return getHistoriesList(state);
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
    let h = bounds
        ? makeEven((bounds.y2 - bounds.y1) * state.view.zoom + crop * 2)
        : originalSize;
    let w = bounds
        ? makeEven((bounds.x2 - bounds.x1) * state.view.zoom + crop * 2)
        : originalSize;

    let dx = bounds ? (bounds.x1 + bounds.x2) / 2 : 0;
    let dy = bounds ? (bounds.y1 + bounds.y2) / 2 : 0;

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
        });
    }, [state, w, h, dx, dy, zoom, backgroundAlpha, current]);

    useEffect(() => {
        // const ctx = interactionCanvas.current!.getContext('2d')!;
        const { state, action } = histories[current];
    }, [state, current]);

    const stopped = useRef(false);

    return (
        <div style={{}}>
            <canvas
                ref={canvas}
                width={makeEven(w * 2 * zoom)}
                height={makeEven(h * 2 * zoom)}
                style={{
                    width: w * zoom,
                    height: h * zoom,
                    outline: '1px solid white',
                    margin: 16,
                }}
            />
            <button
                onClick={() => {
                    animateHistory(state, canvas.current!, stopped);
                }}
            >
                Animate it up
            </button>
            <div>
                {current}

                <input
                    type="range"
                    value={current}
                    max={histories.length - 1}
                    onChange={(e) => setCurrent(parseInt(e.target.value))}
                    style={{ width: '500px' }}
                />
            </div>
            <div style={{ maxWidth: 500 }}>
                {JSON.stringify(histories[current].action)}
            </div>
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
    }
    return states;
}
