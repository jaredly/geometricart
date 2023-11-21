import { Coord, State } from '../types';
import { Action, MirrorAdd } from '../state/Action';
import {
    angleTo,
    applyMatrices,
    dist,
    mirrorTransforms,
    push,
    transformsToMatrices,
} from '../rendering/getMirrorTransforms';
import { wait } from './animateHistory';

export async function animateMirror(
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
) {
    await follow(i, action.mirror.origin);

    await follow(i, action.mirror.point, async (pos) => {
        ctx.save();
        const back = fromScreen(pos, prev);
        const state = prev;
        const zoom = state.view.zoom * 2;

        const xoff = ctx.canvas.width / 2 + state.view.center.x * zoom;
        const yoff = ctx.canvas.height / 2 + state.view.center.y * zoom;
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

    await wait(200);
}
