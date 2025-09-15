// ok

import {push} from '../rendering/getMirrorTransforms';

const rad = (x: number) => (x * Math.PI) / 180;

const size = 20;
const p0 = {x: 0, y: 0};
const p1 = push(p0, rad(20), size);
const p2 = push(p0, rad(45), size * 0.75);
const p3 = push(p0, rad(70), size);

export function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const size = 20;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(p1.x + x, p1.y + y);
    ctx.lineTo(p2.x + x, p2.y + y);
    ctx.lineTo(p3.x + x, p3.y + y);
    ctx.closePath();
    ctx.fill();
}

export function drawPastCursor(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.stroke();
}
