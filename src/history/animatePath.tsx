import {Coord, State} from '../types';
import {tracePath} from '../rendering/CanvasRender';
import {PathCreate, PathCreateMany} from '../state/Action';
import {emptyPath} from '../editor/emptyPath';
import {
    applyMatrices,
    mirrorTransforms,
    transformsToMatrices,
} from '../rendering/getMirrorTransforms';
import {transformSegment} from '../rendering/points';
import {AnimateState, wait} from './animateHistory';
import {segmentsCenter} from '../editor/Bounds';
import {segmentKey} from '../rendering/segmentKey';
import {reverseSegment} from '../rendering/pathsAreIdentical';
import {ensureClockwise} from '../rendering/pathToPoints';
import {simplifyPath} from '../rendering/simplifyPath';

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

    const ustate = state.histories[state.i - 1].state;
    const populatedKeys = new Set();
    Object.values(ustate.paths).forEach((path) => {
        path.segments.forEach((seg, i) => {
            const prev = i === 0 ? path.origin : path.segments[i - 1].to;
            populatedKeys.add(segmentKey(prev, seg));
            populatedKeys.add(segmentKey(seg.to, reverseSegment(prev, seg)));
        });
    });
    // console.group('popkeys');
    // populatedKeys.keys().forEach((key) => {
    //     console.log(key);
    // });
    // console.groupEnd();

    for (let action of group.paths) {
        const segments = simplifyPath(
            action.open ? action.segments : ensureClockwise(action.segments),
        );

        // console.log('make a path', action);
        // console.group('check keys');
        const quick = segments.every((seg, i) => {
            const prev = i === 0 ? action.origin : segments[i - 1].to;
            const key = segmentKey(prev, seg);
            // console.log('check key', key);
            return populatedKeys.has(key);
        });
        // console.groupEnd();

        // console.log({quick});

        if (quick) {
            await wait(100);
        } else if (showIndividualSegments && !quick) {
            await animateSegments(state, follow, group, prev, speed, action);
        } else {
            const center = segmentsCenter(segments);
            await follow(state.i, center);
            await wait(100);
        }
    }
}
