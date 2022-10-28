import { State } from '../types';
import { getHistoriesList } from './HistoryPlayback';
import { canvasRender } from '../rendering/CanvasRender';
import { findBoundingRect } from '../editor/Export';
import { makeEven } from '../animation/AnimationUI';
import { screenToWorld, worldToScreen } from '../editor/Canvas';
import { Action } from '../state/Action';

export const nextFrame = () => new Promise(requestAnimationFrame);
export const wait = (time: number) =>
    new Promise((res) => setTimeout(res, time));

export const animateHistory = async (
    originalState: State,
    canvas: HTMLCanvasElement,
    // interactionCanvas: HTMLCanvasElement,
    stopped: { current: boolean },
) => {
    const now = Date.now();
    console.log('hup');

    const histories = getHistoriesList(originalState);
    const {
        crop,
        fps,
        zoom,
        increment,
        restrictAspectRatio: lockAspectRatio,
        backgroundAlpha,
    } = originalState.animations.config;
    const ctx = canvas.getContext('2d')!;

    let current = 0;
    const bounds = findBoundingRect(originalState);
    const originalSize = 1000;

    let h = bounds
        ? makeEven((bounds.y2 - bounds.y1) * originalState.view.zoom + crop * 2)
        : originalSize;
    let w = bounds
        ? makeEven((bounds.x2 - bounds.x1) * originalState.view.zoom + crop * 2)
        : originalSize;

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

    const frames: ImageBitmap[] = [];
    for (let i = 0; i < histories.length; i++) {
        const action = histories[i].action;
        const points = (action ? actionPoints(action) : []).map((point) =>
            worldToScreen(canvas.width, canvas.height, point, {
                ...histories[i].state.view,
                zoom: histories[i].state.view.zoom * 2,
            }),
        );
        let speed = 5;
        // cursor = points[0];
        for (let point of points) {
            const { x, y } = point;
            let dx = x - cursor.x;
            let dy = y - cursor.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
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

                ctx.fillStyle = 'red';
                ctx.beginPath();
                ctx.arc(cursor.x, cursor.y, 10, 0, Math.PI * 2);
                ctx.fill();
                await nextFrame();
                dx = x - cursor.x;
                dy = y - cursor.y;
                dist = Math.sqrt(dx * dx + dy * dy);
            }
            await wait(100);
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        await draw(i);
        frames.push(await createImageBitmap(canvas));
        await nextFrame();
    }

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
