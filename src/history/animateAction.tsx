import { Coord, State } from '../types';
import { tracePath } from '../rendering/CanvasRender';
import { Action } from '../state/Action';
import { emptyPath } from '../editor/RenderPath';
import { animateGuide } from './animateGuide';
import { followPoints } from './followPoint';
import { animateMirror } from './animateMirror';
import { animatePath } from './animatePath';
import { animateMultiply } from './animateMultiply';
import { wait, actionPoints, AnimateState } from './animateHistory';

export async function animateAction(
    state: AnimateState,
    histories: { state: State; action: Action | null }[],
    follow: (
        i: number,
        point: Coord,
        extra?: ((pos: Coord) => void | Promise<void>) | undefined,
    ) => Promise<unknown>,
) {
    const { i, ctx, canvas } = state;
    const action = histories[i].action;

    if (action && i > 0) {
        const prev = histories[i - 1].state;

        const withScreen = async (
            fn: (
                zoom: number,
                width: number,
                height: number,
            ) => Promise<void> | void,
        ): Promise<void> => {
            ctx.save();
            const zoom = prev.view.zoom * 2;

            const xoff = canvas.width / 2 + prev.view.center.x * zoom;
            const yoff = canvas.height / 2 + prev.view.center.y * zoom;
            ctx.translate(xoff, yoff);
            await fn(zoom, canvas.width, canvas.height);
            ctx.restore();
        };

        if (action.type === 'path:create') {
            await animatePath(follow, i, action, ctx, histories, canvas, prev);
        } else if (action.type === 'path:multiply') {
            await animateMultiply(action, prev, follow, i, ctx, canvas);
        } else if (action.type === 'clip:add') {
            const clip = action.clip;
            await withScreen(async (zoom, width, height) => {
                for (let j = 0; j < clip.length; j++) {
                    ctx.strokeStyle = 'magenta';
                    ctx.lineWidth = 10;
                    ctx.beginPath();
                    tracePath(
                        ctx,
                        {
                            ...emptyPath,
                            origin: clip[clip.length - 1].to,
                            segments: clip.slice(0, j + 1),
                            open: true,
                        },
                        zoom,
                    );
                    ctx.stroke();
                    await wait(1000 / clip.length);
                }
            });
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
                state.fromScreen,
                withScreen,
            );
        } else if (action.type === 'mirror:add') {
            await animateMirror(
                follow,
                i,
                action,
                ctx,
                state.fromScreen,
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
            await followPoints(
                state,
                actionPoints(action).map((point) =>
                    state.toScreen(point, histories[i].state),
                ),
            );
        }
    }
}
