import { Coord } from '../types';
import { wait, nextFrame, AnimateState } from './animateHistory';

export async function followPoints(state: AnimateState, points: Coord[]) {
    for (let point of points) {
        await followPoint(state, point);
        await wait(100);
    }
}

export async function followPoint(
    { cursor, ctx, i, canvas, frames }: AnimateState,
    { x, y }: Coord,
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
