import { Coord, PendingGuide, State } from '../types';
import { PendingPoint } from '../state/Action';
import {
    applyMatrices,
    dist,
    mirrorTransforms,
    transformsToMatrices,
} from '../rendering/getMirrorTransforms';

export async function animateGuide(
    prev: State,
    pending: PendingGuide,
    toScreen: (point: Coord, state: State) => { x: number; y: number },
    follow: (
        i: number,
        point: Coord,
        extra?: ((pos: Coord) => void | Promise<void>) | undefined,
    ) => Promise<unknown>,
    i: number,
    action: PendingPoint,
    ctx: CanvasRenderingContext2D,
    fromScreen: (point: Coord, state: State) => { x: number; y: number },
) {
    if (pending.kind === 'Line') {
        if (pending.points.length === 1) {
            await lineGuide(
                pending,
                toScreen,
                prev,
                follow,
                i,
                action,
                ctx,
                fromScreen,
            );
        } else {
            await follow(i, action.coord);
        }
    } else if (pending.kind === 'Circle') {
        if (pending.points.length === 1) {
            await circleGuide(
                pending,
                toScreen,
                prev,
                follow,
                i,
                action,
                ctx,
                fromScreen,
            );
        } else {
            await follow(i, action.coord);
        }
    } else if (pending.kind === 'CircumCircle') {
        if (pending.points.length < 1) {
            await follow(i, action.coord);
        } else {
        }
    } else {
        await follow(i, action.coord);
    }
}

async function circleGuide(
    pending: PendingGuide,
    toScreen: (point: Coord, state: State) => { x: number; y: number },
    prev: State,
    follow: (
        i: number,
        point: Coord,
        extra?: ((pos: Coord) => void | Promise<void>) | undefined,
    ) => Promise<unknown>,
    i: number,
    action: PendingPoint,
    ctx: CanvasRenderingContext2D,
    fromScreen: (point: Coord, state: State) => { x: number; y: number },
) {
    const og = pending.points[0];
    await follow(i, action.coord, (pos) => {
        drawWithMirror(
            prev,
            fromScreen,
            toScreen,
            og,
            pos,
            (origin, pos, isMirrored) => {
                ctx.strokeStyle = isMirrored ? '#666' : 'yellow';
                ctx.lineWidth = 1;
                ctx.beginPath();
                const radius = dist(origin, pos);
                ctx.arc(origin.x, origin.y, radius, 0, Math.PI * 2, false);
                ctx.stroke();
            },
        );
    });
}

async function lineGuide(
    pending: PendingGuide,
    toScreen: (point: Coord, state: State) => { x: number; y: number },
    prev: State,
    follow: (
        i: number,
        point: Coord,
        extra?: ((pos: Coord) => void | Promise<void>) | undefined,
    ) => Promise<unknown>,
    i: number,
    action: PendingPoint,
    ctx: CanvasRenderingContext2D,
    fromScreen: (point: Coord, state: State) => { x: number; y: number },
) {
    const og = pending.points[0];
    await follow(i, action.coord, (pos) => {
        drawWithMirror(
            prev,
            fromScreen,
            toScreen,
            og,
            pos,
            (origin, pos, isMirrored) => {
                ctx.strokeStyle = isMirrored ? '#666' : 'yellow';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(origin.x, origin.y);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
            },
        );
    });
}

function drawWithMirror(
    state: State,
    fromScreen: (point: Coord, state: State) => { x: number; y: number },
    toScreen: (point: Coord, state: State) => { x: number; y: number },
    origin: Coord,
    posScreen: Coord,
    draw: (origin: Coord, pos: Coord, isMirrored: boolean) => void,
) {
    if (state.activeMirror) {
        const back = fromScreen(posScreen, state);
        const transforms = mirrorTransforms(state.mirrors[state.activeMirror]);
        transforms.forEach((mirror) => {
            const mx = transformsToMatrices(mirror);
            const mirrorOrigin = applyMatrices(origin, mx);
            const mirrorPos = applyMatrices(back, mx);
            const oScreen = toScreen(mirrorOrigin, state);
            const pScreen = toScreen(mirrorPos, state);
            draw(oScreen, pScreen, true);
        });
    }

    draw(toScreen(origin, state), posScreen, false);
}
