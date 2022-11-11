import { Coord, State } from '../types';
import {
    getHistoriesList,
    simplifyHistory,
    StateAndAction,
} from './HistoryPlayback';
import { canvasRender } from '../rendering/CanvasRender';
import { findBoundingRect, renderTexture } from '../editor/Export';
import { screenToWorld, worldToScreen } from '../editor/Canvas';
import { Action } from '../state/Action';
import React from 'react';
import { followPoint } from './followPoint';
import { animateAction } from './animateAction';
import { drawCursor } from './cursor';

export const nextFrame = () => new Promise(requestAnimationFrame);
export const wait = (time: number) =>
    new Promise((res) => setTimeout(res, time));

export type AnimateState = {
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    i: number;
    cursor: Coord;
    frames: ImageBitmap[];
    fromScreen: (point: Coord, state: State) => Coord;
    toScreen: (point: Coord, state: State) => Coord;
    histories: StateAndAction[];
};

export const animateHistory = async (
    originalState: State,
    canvas: HTMLCanvasElement,
    // interactionCanvas: HTMLCanvasElement,
    stopped: { current: boolean },
    startAt: number,
    preimage: boolean,
    log: React.RefObject<HTMLDivElement>,
    inputRef?: HTMLInputElement | null,
) => {
    const now = Date.now();
    console.log('hup');

    const histories = simplifyHistory(getHistoriesList(originalState));
    const {
        // crop,
        // fps,
        zoom,
        // increment,
        // restrictAspectRatio: lockAspectRatio,
        // backgroundAlpha,
    } = originalState.animations.config;
    const ctx = canvas.getContext('2d')!;

    const bounds = findBoundingRect(originalState);
    const originalSize = 1000;

    // let h = bounds
    //     ? makeEven((bounds.y2 - bounds.y1) * originalState.view.zoom + crop * 2)
    //     : originalSize;
    // let w = bounds
    //     ? makeEven((bounds.x2 - bounds.x1) * originalState.view.zoom + crop * 2)
    //     : originalSize;
    let h = originalSize;
    let w = originalSize;

    const draw = async (current: number) => {
        ctx.save();
        const state = histories[current].state;
        await canvasRender(
            ctx,
            { ...state, overlays: {} },
            w * 2 * zoom,
            h * 2 * zoom,
            2 * zoom,
            {},
            0,
            null,
        );
        ctx.restore();
        if (state.view.texture) {
            const size = Math.max(w * 2 * zoom, h * 2 * zoom);
            renderTexture(state.view.texture, size, size, ctx);
        }
    };

    startAt = startAt < histories.length - 1 ? startAt : 0;

    const state: AnimateState = {
        ctx,
        i: startAt,
        cursor: { x: 0, y: 0 },
        canvas,
        frames: [],
        histories,
        fromScreen: (point: Coord, state: State) =>
            screenToWorld(canvas.width, canvas.height, point, {
                ...state.view,
                zoom: state.view.zoom * 2,
            }),

        toScreen: (point: Coord, state: State) =>
            worldToScreen(canvas.width, canvas.height, point, {
                ...state.view,
                zoom: state.view.zoom * 2,
            }),
    };

    const follow = (
        i: number,
        point: Coord,
        extra?: (pos: Coord) => void | Promise<void>,
    ) => followPoint(state, state.toScreen(point, histories[i].state), extra);

    if (preimage) {
        for (let i = 0; i < histories.length; i++) {
            await draw(i);
            state.frames.push(await createImageBitmap(canvas));
            if (i % 5 === 0) {
                log.current!.textContent = `Frame ${i} of ${histories.length}`;
                await nextFrame();
            }
        }
    }

    if (!preimage && startAt > 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        await draw(startAt - 1);
        state.frames[startAt - 1] = await createImageBitmap(canvas);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (; state.i < histories.length; state.i++) {
        if (stopped.current) {
            break;
        }
        if (inputRef) {
            inputRef.value = state.i + '';
        }
        await animateAction(state, histories, follow);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (preimage) {
            ctx.drawImage(state.frames[state.i], 0, 0);
        } else {
            await draw(state.i);
            state.frames.push(await createImageBitmap(canvas));
        }

        // Draw the cursor
        drawCursor(ctx, state.cursor.x, state.cursor.y);

        await nextFrame();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(state.frames[state.frames.length - 1], 0, 0);

    console.log('ok', Date.now() - now);
};

export const actionPoints = (action: Action) => {
    switch (action.type) {
        case 'pending:point':
            return [action.coord];
        case 'mirror:add':
            return [action.mirror.origin, action.mirror.point];
        case 'path:create':
            return [action.origin, ...action.segments.map((seg) => seg.to)];
    }
    return [];
};
