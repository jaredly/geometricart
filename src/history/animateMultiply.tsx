import { Coord, Mirror, State } from '../types';
import { tracePath } from '../rendering/CanvasRender';
import { PathMultiply } from '../state/Action';
import { AnimateState, wait } from './animateHistory';

export async function animateMultiply(
    state: AnimateState,
    action: PathMultiply,
    prev: State,
    follow: (
        i: number,
        point: Coord,
        extra?: ((pos: Coord) => void | Promise<void>) | undefined,
    ) => Promise<unknown>,
) {
    const { i, ctx, canvas } = state;
    const zoom = prev.view.zoom * 2;
    const noWait =
        state.lastSelection &&
        state.lastSelection.type === action.selection.type &&
        state.lastSelection.ids.every(
            (id, j) => id === action.selection.ids[j],
        );
    const pathIds =
        action.selection.type === 'Path'
            ? action.selection.ids
            : Object.keys(prev.paths).filter((id) =>
                  action.selection.ids.includes(prev.paths[id].group!),
              );

    if (noWait) {
        await highlightPaths(pathIds, ctx, prev, zoom, noWait, canvas);
    }

    const mirror: Mirror =
        typeof action.mirror === 'string'
            ? prev.mirrors[action.mirror]
            : action.mirror;
    await follow(i, mirror.origin, () => {
        if (noWait) {
            highlightPaths(pathIds, ctx, prev, zoom, noWait, canvas);
        }
    });

    if (!noWait) {
        await highlightPaths(pathIds, ctx, prev, zoom, noWait, canvas);
    }
    state.lastSelection = action.selection;
}

async function highlightPaths(
    pathIds: string[],
    ctx: CanvasRenderingContext2D,
    prev: State,
    zoom: number,
    noWait: boolean | undefined,
    canvas: HTMLCanvasElement,
) {
    ctx.save();

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
        if (noWait) {
            continue;
        }

        // if (by < minWait) {
        //     const skip = Math.floor(minWait / by);
        //     if (j++ % skip === 0) {
        //         await wait(minWait);
        //     }
        // } else {
        //     await wait(by);
        // }
    }
    if (!noWait) {
        await wait(300);
    }
    ctx.restore();
}
