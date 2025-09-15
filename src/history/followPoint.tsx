import {Coord, State} from '../types';
import {wait, nextFrame, AnimateState} from './animateHistory';
import {drawCursor} from './cursor';

export async function followPoints(state: AnimateState, points: Coord[], speed: number) {
    for (let point of points) {
        await followPoint(state, point);
        await wait(100 / speed);
    }
}

export async function followPoint(
    {cursor, ctx, i, canvas, frames, histories}: AnimateState,
    {x, y}: Coord,
    extra?: (v: Coord, state: State) => void | Promise<void>,
) {
    let dx = x - cursor.x;
    let dy = y - cursor.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) {
        drawCursor(ctx, x, y);
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
            await extra(cursor, histories[i].state);
        }

        drawCursor(ctx, cursor.x, cursor.y);

        await nextFrame();
        dx = x - cursor.x;
        dy = y - cursor.y;
        dist = Math.sqrt(dx * dx + dy * dy);
    }
}

export const closerOne = (p1: number, p2: number, amt = 0.1) => p1 + (p2 - p1) * amt;

export const closer = (p1: Coord, p2: Coord, amt = 0.1) => {
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    return {x: p1.x + dx * amt, y: p1.y + dy * amt};
};

export async function tweens<T>(
    {ctx, i, canvas, frames, histories}: AnimateState,
    initial: T,
    next: (v: T) => T,
    dist: (v: T) => number,
    draw: (v: T, state: State) => void | Promise<void>,
) {
    let value = initial;
    let d = dist(value);
    while (d > 2) {
        const prev = value;
        value = next(value);

        if (i > 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(frames[i - 1], 0, 0);
        }

        await draw(value, histories[i].state);

        await nextFrame();
        // await wait(100);
        d = dist(value);
    }
}
