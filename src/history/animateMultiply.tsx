import { Coord, Mirror, State } from '../types';
import { tracePath } from '../rendering/CanvasRender';
import { PathMultiply } from '../state/Action';
import { wait } from './animateHistory';

export async function animateMultiply(
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
