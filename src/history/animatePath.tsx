import {Coord, State} from '../types';
import {tracePath} from '../rendering/CanvasRender';
import {Action, PathCreate, PathCreateMany} from '../state/Action';
import {emptyPath} from '../editor/RenderPath';
import {
    applyMatrices,
    mirrorTransforms,
    transformsToMatrices,
} from '../rendering/getMirrorTransforms';
import {transformSegment} from '../rendering/points';
import {AnimateState, wait} from './animateHistory';
import {segmentsCenter} from '../editor/Bounds';

const animateSegments = async (
    {i, ctx, histories, canvas, frames}: AnimateState,
    follow: (
        i: number,
        point: Coord,
        extra?: ((pos: Coord) => void | Promise<void>) | undefined,
    ) => Promise<unknown>,
    group: PathCreateMany,
    prev: State,
    speed: number,
    action: PathCreateMany['paths'][0],
) => {
    await follow(i, action.origin);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(frames[i - 1], 0, 0);

    ctx.save();
    const state = histories[i - 1].state;
    const zoom = state.view.zoom * 2;

    const xoff = canvas.width / 2 + state.view.center.x * zoom;
    const yoff = canvas.height / 2 + state.view.center.y * zoom;
    ctx.translate(xoff, yoff);

    for (let j = 0; j < action.segments.length; j++) {
        if (prev.activeMirror && group.withMirror) {
            const transforms = mirrorTransforms(prev.mirrors[prev.activeMirror]);
            transforms.forEach((transform) => {
                const mx = transformsToMatrices(transform);
                ctx.strokeStyle = 'orange';
                ctx.lineWidth = 10;
                // ctx.setLineDash([5, 15]);
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
        ctx.strokeStyle = 'white';
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
        await wait(500 / action.segments.length / speed);
    }

    ctx.restore();
};

export async function animatePath(
    state: AnimateState,
    follow: (
        i: number,
        point: Coord,
        extra?: ((pos: Coord) => void | Promise<void>) | undefined,
    ) => Promise<unknown>,
    origGroup: PathCreateMany | PathCreate,
    prev: State,
    speed: number,
) {
    const group: PathCreateMany =
        origGroup.type === 'path:create:many'
            ? origGroup
            : {
                  type: 'path:create:many',
                  paths: [
                      {
                          origin: origGroup.origin,
                          segments: origGroup.segments,
                      },
                  ],
                  withMirror: true,
              };

    const showIndividualSegments = false;

    for (let action of group.paths) {
        if (showIndividualSegments) {
            await animateSegments(state, follow, group, prev, speed, action);
        } else {
            const center = segmentsCenter(action.segments);
            await follow(state.i, center);
            await wait(100);
        }
    }
}
