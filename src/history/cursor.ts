// ok

export function drawCursor(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
) {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
}

export function drawPastCursor(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
) {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.stroke();
}
