import { Coord, Mirror, State } from '../types';
import { getHistoriesList, simplifyHistory } from './HistoryPlayback';
import { canvasRender, tracePath } from '../rendering/CanvasRender';
import { findBoundingRect } from '../editor/Export';
import { makeEven } from '../animation/AnimationUI';
import { screenToWorld, worldToScreen } from '../editor/Canvas';
import { Action, MirrorAdd, PathCreate, PathMultiply } from '../state/Action';
import { emptyPath, pathSegs } from '../editor/RenderPath';
import {
    angleTo,
    applyMatrices,
    dist,
    getMirrorTransforms,
    mirrorTransforms,
    push,
    transformsToMatrices,
} from '../rendering/getMirrorTransforms';
import { transformSegment } from '../rendering/points';
import React from 'react';
import { animateGuide } from './animateGuide';

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

const actionPoints = (action: Action) => {
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

async function animateAction(
    histories: { state: State; action: Action | null }[],
    i: number,
    follow: (
        i: number,
        point: Coord,
        extra?: ((pos: Coord) => void | Promise<void>) | undefined,
    ) => Promise<unknown>,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    toScreen: (point: Coord, state: State) => { x: number; y: number },
    fromScreen: (point: Coord, state: State) => { x: number; y: number },
    cursor: { x: number; y: number },
    frames: ImageBitmap[],
) {
    const action = histories[i].action;

    if (action && i > 0) {
        const prev = histories[i - 1].state;

        if (action.type === 'path:create') {
            await animatePath(follow, i, action, ctx, histories, canvas, prev);
        } else if (action.type === 'path:multiply') {
            await animateMultiply(action, prev, follow, i, ctx, canvas);
        } else if (
            action.type === 'pending:point' &&
            prev.pending &&
            prev.pending.type === 'Guide'
        ) {
            await animateGuide(
                prev,
                prev.pending,
                follow,
                i,
                action,
                ctx,
                fromScreen,
                (fn) => {
                    ctx.save();
                    const zoom = prev.view.zoom * 2;

                    const xoff = canvas.width / 2 + prev.view.center.x * zoom;
                    const yoff = canvas.height / 2 + prev.view.center.y * zoom;
                    ctx.translate(xoff, yoff);
                    fn(zoom, canvas.width, canvas.height);
                    ctx.restore();
                },
            );
        } else if (action.type === 'mirror:add') {
            await animateMirror(
                follow,
                i,
                action,
                ctx,
                fromScreen,
                prev,
                histories,
                canvas,
            );
        } else if (
            action.type === 'path:update' ||
            action.type === 'path:update:many' ||
            action.type === 'pathGroup:update:many'
        ) {
            await wait(500);
        } else if (action.type === 'view:update') {
            if (
                action.view.zoom !== prev.view.zoom ||
                action.view.center.x !== prev.view.center.x ||
                action.view.center.y !== prev.view.center.y
            ) {
                /*
                const zoomLevel = Math.max(action.view.zoom, prev.view.zoom);
                const ptl = fromScreen({ x: 0, y: 0 }, prev);
                const pbr = fromScreen(
                    { x: canvas.width, y: canvas.height },
                    prev,
                );
                const ntl = fromScreen(
                    { x: 0, y: 0 },
                    { ...prev, view: action.view },
                );
                const nbr = fromScreen(
                    { x: canvas.width, y: canvas.height },
                    { ...prev, view: action.view },
                );

                const x0 = Math.min(ptl.x, pbr.x);
                const x1 = Math.max(ptl.x, pbr.x);
                const y0 = Math.min(ptl.y, pbr.y);
                const y1 = Math.max(ptl.y, pbr.y);
                const dx = x1 - x0;
                const dy = y1 - y0;

                const width = dx * zoomLevel;
                const height = dy * zoomLevel;
                console.log(`desired`, width, height, dx, dy, zoomLevel);

                const c2 = document.createElement('canvas');
                c2.width = width;
                c2.height = height;
                const ct2 = c2.getContext('2d')!;
                await canvasRender(
                    ct2,
                    // prev,
                    {
                        ...prev,
                        overlays: {},
                        view: {
                            ...action.view,
                            zoom: zoomLevel,
                            center: { x: x0 + dx / 2, y: y0 + dy / 2 },
                        },
                    },
                    width,
                    width,
                    1,
                    {},
                    0,
                    null,
                );
                document.body.appendChild(c2);
				*/

                await wait(500);
            }
        } else {
            const points = actionPoints(action).map((point) =>
                toScreen(point, histories[i].state),
            );
            await followPoints(points, cursor, i, ctx, canvas, frames);
        }
    }
}

async function animateMultiply(
    action: PathMultiply,
    prev: State,
    follow: (
        i: number,
        point: Coord,
        extra?: ((pos: Coord) => void | Promise<void>) | undefined,
    ) => Promise<unknown>,
    i: number,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
) {
    const mirror: Mirror =
        typeof action.mirror === 'string'
            ? prev.mirrors[action.mirror]
            : action.mirror;
    await follow(i, mirror.origin);
    const pathIds =
        action.selection.type === 'Path'
            ? action.selection.ids
            : Object.keys(prev.paths).filter((id) =>
                  action.selection.ids.includes(prev.paths[id].group!),
              );

    ctx.save();
    const zoom = prev.view.zoom * 2;

    const xoff = canvas.width / 2 + prev.view.center.x * zoom;
    const yoff = canvas.height / 2 + prev.view.center.y * zoom;
    ctx.translate(xoff, yoff);

    let j = 0;
    const minWait = 20;
    const by = Math.min(100, 500 / pathIds.length);
    for (let id of pathIds) {
        ctx.beginPath();
        tracePath(ctx, prev.paths[id], zoom);
        ctx.strokeStyle = 'magenta';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        if (by < minWait) {
            const skip = Math.floor(minWait / by);
            if (j++ % skip === 0) {
                await wait(minWait);
            }
        } else {
            await wait(by);
        }
    }

    ctx.restore();
}

async function animatePath(
    follow: (
        i: number,
        point: Coord,
        extra?: ((pos: Coord) => void | Promise<void>) | undefined,
    ) => Promise<unknown>,
    i: number,
    action: PathCreate,
    ctx: CanvasRenderingContext2D,
    histories: { state: State; action: Action | null }[],
    canvas: HTMLCanvasElement,
    prev: State,
) {
    await follow(i, action.origin);

    ctx.save();
    const state = histories[i - 1].state;
    const zoom = state.view.zoom * 2;

    const xoff = canvas.width / 2 + state.view.center.x * zoom;
    const yoff = canvas.height / 2 + state.view.center.y * zoom;
    ctx.translate(xoff, yoff);

    for (let j = 0; j < action.segments.length; j++) {
        if (prev.activeMirror) {
            const transforms = mirrorTransforms(
                prev.mirrors[prev.activeMirror],
            );
            transforms.forEach((transform) => {
                const mx = transformsToMatrices(transform);
                ctx.strokeStyle = 'orange';
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 15]);
                ctx.beginPath();
                tracePath(
                    ctx,
                    {
                        ...emptyPath,
                        origin: applyMatrices(action.origin, mx),
                        segments: action.segments
                            .slice(0, j + 1)
                            .map((seg) => transformSegment(seg, mx)),
                        open: true,
                    },
                    state.view.zoom * 2,
                );
                ctx.stroke();
            });
        }

        ctx.setLineDash([]);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 10;
        ctx.beginPath();
        tracePath(
            ctx,
            {
                ...emptyPath,
                origin: action.origin,
                segments: action.segments.slice(0, j + 1),
                open: true,
            },
            state.view.zoom * 2,
        );
        ctx.stroke();
        await wait(1000 / action.segments.length);
    }

    ctx.restore();
}

async function animateMirror(
    follow: (
        i: number,
        point: Coord,
        extra?: ((pos: Coord) => void | Promise<void>) | undefined,
    ) => Promise<unknown>,
    i: number,
    action: MirrorAdd,
    ctx: CanvasRenderingContext2D,
    fromScreen: (point: Coord, state: State) => { x: number; y: number },
    prev: State,
    histories: { state: State; action: Action | null }[],
    canvas: HTMLCanvasElement,
) {
    await follow(i, action.mirror.origin);

    await follow(i, action.mirror.point, async (pos) => {
        ctx.save();
        const back = fromScreen(pos, prev);
        const state = histories[i - 1].state;
        const zoom = state.view.zoom * 2;

        const xoff = canvas.width / 2 + state.view.center.x * zoom;
        const yoff = canvas.height / 2 + state.view.center.y * zoom;
        ctx.translate(xoff, yoff);

        // const dx = back.x - action.mirror.origin.x;
        // const dy = back.y - action.mirror.origin.y;
        const theta = angleTo(back, action.mirror.origin);
        const d = dist(action.mirror.origin, back);
        const o2 = push(
            back,
            theta + (action.mirror.reflect ? Math.PI / 6 : 0),
            d / 2,
        );

        ctx.setLineDash([5, 15]);
        ctx.lineWidth = 5;

        ctx.strokeStyle = 'magenta';
        const tx = mirrorTransforms(action.mirror);
        tx.forEach((mirror) => {
            const mx = transformsToMatrices(mirror);
            const origin = applyMatrices(o2, mx);
            const point = applyMatrices(back, mx);
            ctx.beginPath();
            ctx.moveTo(origin.x * zoom, origin.y * zoom);
            ctx.lineTo(point.x * zoom, point.y * zoom);
            ctx.stroke();
        });

        ctx.beginPath();
        ctx.moveTo(back.x * zoom, back.y * zoom);
        ctx.lineTo(o2.x * zoom, o2.y * zoom);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.restore();
    });
}

async function followPoints(
    points: Coord[],
    cursor: Coord,
    i: number,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    frames: ImageBitmap[],
) {
    for (let point of points) {
        await followPoint(cursor, point, i, ctx, canvas, frames);
        await wait(100);
    }
}

async function followPoint(
    cursor: Coord,
    { x, y }: Coord,
    i: number,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    frames: ImageBitmap[],
    extra?: (v: Coord) => void | Promise<void>,
) {
    let dx = x - cursor.x;
    let dy = y - cursor.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) {
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
        return await wait(300);
    }
    while (dist > 2) {
        // console.log(dist, cursor, point);
        // const amt = Math.min(1, speed / dist);
        // const amt = Math.max(1, dist / 10);
        const amt = 0.2;

        cursor.x += dx * amt;
        cursor.y += dy * amt;

        if (i > 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(frames[i - 1], 0, 0);
        }

        if (extra) {
            await extra(cursor);
        }

        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, 10, 0, Math.PI * 2);
        ctx.fill();
        await nextFrame();
        dx = x - cursor.x;
        dy = y - cursor.y;
        dist = Math.sqrt(dx * dx + dy * dy);
    }
}
