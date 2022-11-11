import { Coord, State } from '../types';
import { getHistoriesList, simplifyHistory } from './HistoryPlayback';
import { canvasRender } from '../rendering/CanvasRender';
import { findBoundingRect } from '../editor/Export';
import { screenToWorld, worldToScreen } from '../editor/Canvas';
import { Action } from '../state/Action';
import React from 'react';
import { followPoint } from './followPoint';
import { animateAction } from './animateAction';

export const nextFrame = () => new Promise(requestAnimationFrame);
export const wait = (time: number) =>
    new Promise((res) => setTimeout(res, time));

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
    };

    let cursor = { x: 0, y: 0 };

    const fromScreen = (point: Coord, state: State) =>
        screenToWorld(canvas.width, canvas.height, point, {
            ...state.view,
            zoom: state.view.zoom * 2,
        });

    const toScreen = (point: Coord, state: State) =>
        worldToScreen(canvas.width, canvas.height, point, {
            ...state.view,
            zoom: state.view.zoom * 2,
        });

    const follow = (
        i: number,
        point: Coord,
        extra?: (pos: Coord) => void | Promise<void>,
    ) =>
        followPoint(
            cursor,
            toScreen(point, histories[i].state),
            i,
            ctx,
            canvas,
            frames,
            extra,
        );

    const frames: ImageBitmap[] = [];
    if (preimage) {
        for (let i = 0; i < histories.length; i++) {
            await draw(i);
            frames.push(await createImageBitmap(canvas));
            if (i % 5 === 0) {
                log.current!.textContent = `Frame ${i} of ${histories.length}`;
                await nextFrame();
            }
        }
    }

    if (!preimage && startAt > 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        await draw(startAt - 1);
        frames[startAt - 1] = await createImageBitmap(canvas);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = startAt; i < histories.length; i++) {
        if (stopped.current) {
            break;
        }
        if (inputRef) {
            inputRef.value = i + '';
        }
        await animateAction(
            histories,
            i,
            follow,
            ctx,
            canvas,
            toScreen,
            fromScreen,
            cursor,
            frames,
        );

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (preimage) {
            ctx.drawImage(frames[i], 0, 0);
        } else {
            await draw(i);
            frames.push(await createImageBitmap(canvas));
        }

        // Draw the cursor
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, 10, 0, Math.PI * 2);
        ctx.fill();

        await nextFrame();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(frames[frames.length - 1], 0, 0);

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
