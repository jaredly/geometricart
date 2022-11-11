import { Coord, State } from '../types';
import { tracePath } from '../rendering/CanvasRender';
import { Action, PathCreate } from '../state/Action';
import { emptyPath } from '../editor/RenderPath';
import {
    applyMatrices,
    mirrorTransforms,
    transformsToMatrices,
} from '../rendering/getMirrorTransforms';
import { transformSegment } from '../rendering/points';
import { wait } from './animateHistory';

export async function animatePath(
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
