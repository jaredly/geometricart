import {Coord, State} from '../types';
import {
    applyHistoryView,
    cacheOverlays,
    findViewPoints,
    getHistoriesList,
    mergeViewPoints,
    StateAndAction,
} from './HistoryPlayback';
import {canvasRender, paletteImages} from '../rendering/CanvasRender';
import {findBoundingRect} from '../editor/Export';
import {renderTexture} from '../editor/ExportPng';
import {screenToWorld, worldToScreen} from '../editor/Canvas';
import {Action} from '../state/Action';
import React from 'react';
import {followPoint} from './followPoint';
import {animateAction, skipAction} from './animateAction';
import {drawCompassAndRuler} from './animateCompassAndRuler';
import {drawCursor} from './cursor';
import {coordsEqual} from '../rendering/pathsAreIdentical';
import {closeEnough} from '../rendering/epsilonToZero';
import {CompassRenderState, CompassState} from '../editor/compassAndRuler';

export const nextFrame = () => new Promise(requestAnimationFrame);
export const wait = (time: number) => new Promise((res) => setTimeout(res, time));

export type AnimateState = {
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    compassState?: CompassState;
    lastDrawnCompassState?: CompassRenderState;
    i: number;
    cursor: Coord;
    frames: ImageBitmap[];
    fromScreen: (point: Coord, state: State) => Coord;
    toScreen: (point: Coord, state: State) => Coord;
    histories: StateAndAction[];
    lastSelection?: {type: 'Path' | 'PathGroup'; ids: string[]};
};

type PreviewT = 'corner' | number | null;

export const animateHistory = async (
    originalState: State,
    canvas: HTMLCanvasElement,
    stopped: {current: boolean},
    startAt: number,
    preimage: boolean,
    log: React.RefObject<HTMLDivElement | null>,
    onStep?: (i: number) => void,
    // inputRef?: HTMLInputElement | null,
    animateTitle?: boolean,
    preview?: PreviewT,
) => {
    const now = Date.now();

    const speed = 1;

    let histories = getHistoriesList(originalState);
    const {zoom} = originalState.animations.config;
    const ctx = canvas.getContext('2d')!;
    ctx.lineWidth = 1;

    const offcan = document.createElement('canvas');
    offcan.width = canvas.width;
    offcan.height = canvas.height;
    const offctx = offcan.getContext('2d')!;

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

    const viewPoints = findViewPoints(histories);
    const mergedVP = mergeViewPoints(viewPoints, originalState.historyView?.zooms);

    for (let i = 0; i < histories.length; i++) {
        histories[i].state = applyHistoryView(
            mergedVP,
            i,
            // originalState.historyView?.zooms ?? [],
            histories[i].state,
        );
    }
    histories = histories.filter((_, i) => !originalState.historyView?.skips.includes(i));

    const overlays = await cacheOverlays(originalState);
    const cachedPaletteImages = await paletteImages(originalState.palette);

    const draw = (current: number, context = ctx) => {
        context.save();
        const state = histories[current].state;
        canvasRender(
            context,
            state,
            w * 2 * zoom,
            h * 2 * zoom,
            2 * zoom,
            {},
            0,
            overlays,
            cachedPaletteImages,
            false,
            null,
            true,
        );
        context.restore();
        if (state.view.texture) {
            const size = Math.max(w * 2 * zoom, h * 2 * zoom);
            renderTexture(state.view.texture, size, size, context);
        }
    };

    startAt = startAt < histories.length - 1 ? startAt : 0;

    const state: AnimateState = {
        ctx,
        i: startAt,
        cursor: {x: 0, y: 0},
        compassState: undefined,
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
        extra?: (pos: Coord, state: State) => void | Promise<void>,
        speed = 1,
    ) => followPoint(state, state.toScreen(point, histories[i].state), extra, speed);

    if (preimage) {
        for (let i = 0; i < histories.length; i++) {
            draw(i);
            state.frames.push(await createImageBitmap(canvas));
            if (i % 5 === 0) {
                log.current!.textContent = `Frame ${i} of ${histories.length}`;
                await nextFrame();
            }
        }
    }

    if (!preimage && startAt > 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        draw(startAt - 1, offctx);
        state.frames[startAt - 1] = await createImageBitmap(offcan);
    }

    let lastScene = null;
    if (preview != null) {
        offctx.clearRect(0, 0, canvas.width, canvas.height);
        console.log('the view', state.histories[state.histories.length - 1].state.view);
        draw(state.histories.length - 1, offctx);
        lastScene = await createImageBitmap(offcan);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (animateTitle) {
        draw(state.i);
        const first = await createImageBitmap(canvas);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        draw(histories.length - 1);

        await wait(500);

        const final = await createImageBitmap(canvas);
        const text = 'Pattern walk-through';

        ctx.font = '200 100px Lexend';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        // ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 20;

        const fw = ctx.measureText(text).width;
        const widths = [0];
        for (let i = 1; i <= text.length; i++) {
            widths.push(ctx.measureText(text.slice(0, i)).width);
        }

        const frames = 140; // / speed;
        for (let i = 0; i < frames; i++) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(final, 0, 0);
            const w = (fw / frames) * i;
            const at = widths.findIndex((m) => m > w);

            const t = text.slice(0, at);
            ctx.strokeText(t, ctx.canvas.width / 2 - w / 2, ctx.canvas.height * 0.9);
            ctx.fillText(t, ctx.canvas.width / 2 - w / 2, ctx.canvas.height * 0.9);

            await nextFrame();
        }
        ctx.lineWidth = 1;

        await wait(800 / speed);

        await crossFade(ctx, canvas, final, first, 30 / speed);
    }

    for (; state.i < histories.length; state.i++) {
        if (stopped.current) {
            return; // break;
        }
        onStep?.(state.i);

        const title = originalState.historyView?.titles?.find(
            (title) => title.idx <= state.i && state.i <= title.idx + title.duration,
        );
        let speed = title?.speed ?? 1;
        let skip = 0;
        if (speed >= 5) {
            skip = speed - 4;
            speed = 4;
        }

        if (skip) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            underlay(ctx, state, lastScene!, preview);
            draw(state.i);
            overlay(ctx, state, originalState.historyView);
            state.frames.push(await createImageBitmap(canvas));

            const action = histories[state.i].action;
            if (action?.type === 'path:update:many') {
            } else {
                // Draw the cursor
                if (
                    state.lastDrawnCompassState &&
                    !['path:create', 'path:create:many', 'history-view:update'].includes(
                        action?.type!,
                    ) &&
                    !(action?.type === 'view:update' && !action.view.guides)
                ) {
                    drawCompassAndRuler(
                        ctx,
                        state.lastDrawnCompassState,
                        state,
                        histories[state.i].state,
                    );
                }
                drawCursor(ctx, state.cursor.x, state.cursor.y);
            }

            // await wait(100);
            await nextFrame();
            // await nextFrame();
            // await nextFrame();

            for (let i = 0; i < skip; i++) {
                state.i++;
                skipAction(state, histories);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                underlay(ctx, state, lastScene!, preview);
                draw(state.i);
                overlay(ctx, state, originalState.historyView);
                state.frames.push(await createImageBitmap(canvas));
            }
            continue;
        }

        await animateAction(state, histories, follow, speed);

        if (state.i > 0) {
            const st = histories[state.i].state;
            const ps = histories[state.i - 1].state;
            if (
                !coordsEqual(st.view.center, ps.view.center) ||
                !closeEnough(st.view.zoom, ps.view.zoom)
            ) {
                let next: ImageBitmap;
                if (preimage) {
                    next = state.frames[state.i];
                } else {
                    offctx.clearRect(0, 0, offcan.width, offcan.height);

                    underlay(offctx, state, lastScene!, preview);
                    draw(state.i, offctx);
                    overlay(ctx, state, originalState.historyView);
                    next = await createImageBitmap(offcan);

                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(state.frames[state.i - 1], 0, 0);
                }
                await crossFade(ctx, canvas, state.frames[state.i - 1], next, 50);
            }
            // continue;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (preimage) {
            ctx.drawImage(state.frames[state.i], 0, 0);
        } else {
            underlay(ctx, state, lastScene!, preview);
            draw(state.i);
            overlay(ctx, state, originalState.historyView);
            state.frames.push(await createImageBitmap(canvas));
        }

        const action = histories[state.i].action;

        if (action?.type === 'path:update:many') {
        } else {
            // Draw the cursor
            if (
                state.lastDrawnCompassState &&
                !['path:create', 'path:create:many', 'history-view:update'].includes(
                    action?.type!,
                ) &&
                !(action?.type === 'view:update' && !action.view.guides)
            ) {
                drawCompassAndRuler(
                    ctx,
                    state.lastDrawnCompassState,
                    state,
                    histories[state.i].state,
                );
            }
            drawCursor(ctx, state.cursor.x, state.cursor.y);
        }

        await nextFrame();

        if (skip) {
            for (let i = 0; i < skip; i++) {
                state.i++;
                skipAction(state, histories);
                if (!preimage) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    underlay(ctx, state, lastScene!, preview);
                    draw(state.i);
                    overlay(ctx, state, originalState.historyView);
                    state.frames.push(await createImageBitmap(canvas));
                }
            }
        }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(state.frames[state.frames.length - 1], 0, 0);

    console.log('ok', Date.now() - now);
};

const overlay = (
    ctx: CanvasRenderingContext2D,
    state: AnimateState,
    historyView: State['historyView'],
) => {
    const title = historyView?.titles?.find(
        (title) => title.idx <= state.i && state.i <= title.idx + title.duration,
    );
    if (title) {
        ctx.font = '200 60px Lexend';
        ctx.fontStretch = 'expanded';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        // ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 10;
        const text = title.title;

        const fw = ctx.measureText(text).width;
        ctx.strokeText(text, ctx.canvas.width / 2 - fw / 2, ctx.canvas.height * 0.94);
        ctx.fillText(text, ctx.canvas.width / 2 - fw / 2, ctx.canvas.height * 0.94);

        ctx.lineWidth = 1;
    }
};

const underlay = (
    ctx: CanvasRenderingContext2D,
    state: AnimateState,
    lastScene: ImageBitmap,
    preview?: PreviewT,
) => {
    if (preview === 'corner') {
        ctx.drawImage(lastScene!, 0, 0, ctx.canvas.width / 5, ctx.canvas.height / 5);
    } else if (preview != null) {
        const lastView = state.histories[state.histories.length - 1].state.view;
        const view = state.histories[state.i].state.view;
        ctx.globalAlpha = preview;
        if (
            lastView.center.x !== view.center.x ||
            lastView.center.y !== view.center.y ||
            lastView.zoom !== view.zoom
        ) {
            const wp = screenToWorld(ctx.canvas.width, ctx.canvas.height, {x: 0, y: 0}, lastView);
            const tl = worldToScreen(ctx.canvas.width, ctx.canvas.height, wp, view);
            const wp2 = screenToWorld(
                ctx.canvas.width,
                ctx.canvas.height,
                {x: ctx.canvas.width, y: ctx.canvas.height},
                lastView,
            );
            const br = worldToScreen(ctx.canvas.width, ctx.canvas.height, wp2, view);
            ctx.drawImage(lastScene!, tl.x, tl.y, br.x - tl.x, br.y - tl.y);
        } else {
            ctx.drawImage(lastScene!, 0, 0);
        }
        ctx.globalAlpha = 1;
    }
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

async function crossFade(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    first: ImageBitmap,
    final: ImageBitmap,
    frames: number,
) {
    const ww = canvas.width / 5;
    const wh = canvas.height / 5;
    for (let i = 0; i <= frames; i++) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // ctx.strokeStyle = 'black';
        // ctx.lineWidth = 1;
        // ctx.strokeRect(ww, wh, ww, wh);
        // ctx.strokeRect(ww * 2, wh * 2, ww, wh);

        ctx.globalAlpha = 1 - i / frames;
        ctx.drawImage(first, 0, 0);

        ctx.globalAlpha = i / frames;
        ctx.drawImage(final, 0, 0);

        await nextFrame();
    }
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(first, 0, 0);
}
