import { Coord, PendingGuide, State } from '../types';
import { PendingPoint } from '../state/Action';
import {
    applyMatrices,
    dist,
    mirrorTransforms,
    push,
    transformsToMatrices,
} from '../rendering/getMirrorTransforms';
import { pendingGuide } from '../editor/RenderPendingGuide';
import { geomToPrimitives } from '../rendering/points';
import { renderPrimitive } from '../rendering/CanvasRender';
import { transformGuideGeom } from '../rendering/calculateGuideElements';

export async function animateGuide(
    prev: State,
    pending: PendingGuide,
    follow: (
        i: number,
        point: Coord,
        extra?: ((pos: Coord) => void | Promise<void>) | undefined,
    ) => Promise<unknown>,
    i: number,
    action: PendingPoint,
    ctx: CanvasRenderingContext2D,
    fromScreen: (point: Coord, state: State) => { x: number; y: number },
    withScreen: (
        fn: (zoom: number, width: number, height: number) => void,
    ) => void,
) {
    if (pending.points.length === 0) {
        await follow(i, action.coord);
        return;
    }
    let offsets = [
        { x: -1, y: 1 },
        { x: 2, y: 1 },
    ];

    const transforms = prev.activeMirror
        ? mirrorTransforms(prev.mirrors[prev.activeMirror])
        : null;

    await follow(i, action.coord, (pos) => {
        withScreen((zoom, width, height) => {
            const points = pending.points.concat([fromScreen(pos, prev)]);

            if (points.length === 2) {
                const dx = points[1].x - points[0].x;
                const dy = points[1].y - points[0].y;
                const theta = Math.atan2(dy, dx);
                const mag = dist(points[0], points[1]);
                const p3 = push(
                    points[0],
                    theta + Math.PI / 4,
                    mag / Math.sqrt(2),
                );
                points.push(p3);
            }

            offsets.slice(pending.points.length).forEach((off) => {
                points.push({ x: pos.x + off.x, y: pos.y + off.y });
            });

            const geom = pendingGuide(
                pending.kind,
                points,
                false,
                pending.extent,
            );
            const guidePrimitives = geomToPrimitives(geom, true);

            if (transforms) {
                ctx.strokeStyle = '#666';
                transforms.forEach((mirror) => {
                    const mx = transformsToMatrices(mirror);
                    const gx = transformGuideGeom(geom, (pos) =>
                        applyMatrices(pos, mx),
                    );
                    geomToPrimitives(gx, true).forEach((prim) => {
                        renderPrimitive(ctx, prim, zoom, width, height);
                    });
                });
            }

            ctx.strokeStyle = 'yellow';
            guidePrimitives.forEach((prim) => {
                renderPrimitive(ctx, prim, zoom, width, height);
            });

            pending.points.forEach((poing) => {
                ctx.fillStyle = 'red';
                ctx.beginPath();
                ctx.arc(poing.x * zoom, poing.y * zoom, 10, 0, 2 * Math.PI);
                ctx.fill();
            });
        });
    });

    return;
}
