import {CompassRenderState, CompassState} from '../editor/compassAndRuler';
import {push, dist, angleTo, posOffset} from '../rendering/getMirrorTransforms';
import {coordsEqual} from '../rendering/pathsAreIdentical';
import {Action, GuideAdd} from '../state/Action';
import {State, Coord} from '../types';
import {
    pointsToPolar,
    Polar,
    polarCloser,
    polarDist,
    polarPoint,
    oneToScreen,
    closerAngle,
    leastAngleDiff,
} from './animateAction';
import {AnimateState} from './animateHistory';
import {drawCursor} from './cursor';
import {tweens, closerOne, closer} from './followPoint';

export async function animateCompass(
    lastDrawn: CompassRenderState,
    state: AnimateState,
    histories: {state: State; action: Action | null}[],
    i: number,
    cs: CompassState,
    ctx: CanvasRenderingContext2D,
    action: GuideAdd,
    follow: (
        i: number,
        point: Coord,
        extra?: ((pos: Coord, state: State) => void | Promise<void>) | undefined,
        speed?: number,
    ) => Promise<unknown>,
    speed: number,
) {
    if (action.guide.geom.type !== 'CloneCircle' && action.guide.geom.type !== 'CircleMark') return;
    if (!state.compassState) return;
    if (
        !coordsEqual(lastDrawn.compass.source.p1, state.compassState.compassRadius.p1) ||
        !coordsEqual(lastDrawn.compass.source.p2, state.compassState.compassRadius.p2)
    ) {
        await updateCompassSource(histories, i, state, cs, lastDrawn, ctx, speed);
    }
    const fullCircle = action.guide.geom.type === 'CloneCircle';

    let [t1, t2] =
        action.guide.geom.type === 'CloneCircle'
            ? [0, Math.PI * 2]
            : [action.guide.geom.angle, action.guide.geom.angle2!];

    const currentTheta = angleTo(lastDrawn.compass.mark.p1, lastDrawn.compass.mark.p2);
    const d1 = leastAngleDiff(t1, currentTheta);
    const d2 = leastAngleDiff(t2, currentTheta);
    let clockwise = true;
    if (Math.abs(d2) < Math.abs(d1)) {
        [t1, t2] = [t2, t1];
        clockwise = false;
    }

    const ustate = histories[i].state;
    await updateCompassPosition(state, cs, ustate, t1, lastDrawn, ctx, speed);

    const p1 = push(cs.compassOrigin, t1, cs.compassRadius.radius);
    await follow(
        i,
        p1,
        (_, ustate) => {
            drawCompassAndRuler(ctx, lastDrawn, state, ustate);
        },
        speed,
    );
    const radScreen = oneToScreen(state, ustate, cs.compassRadius.radius);
    const origin = state.toScreen(cs.compassOrigin, ustate);
    await tweens(
        state,
        t1,
        (theta) =>
            fullCircle ? closerOne(theta, t2, 0.1 * speed) : closerAngle(theta, t2, 0.1 * speed),
        (theta) =>
            fullCircle
                ? Math.abs((t2 - theta) * radScreen)
                : dist(push({x: 0, y: 0}, theta, radScreen), push({x: 0, y: 0}, t2, radScreen)),
        (theta, ustate) => {
            drawRuler(
                state.toScreen(lastDrawn.ruler.p1, ustate),
                state.toScreen(lastDrawn.ruler.p2, ustate),
                ctx,
            );

            drawCompassTemplate(
                state.toScreen(lastDrawn.compass.source.p1, ustate),
                state.toScreen(lastDrawn.compass.source.p2, ustate),
                ctx,
            );

            const p2 = push(origin, theta, radScreen);
            drawCompass(origin, p2, ctx);
            drawCompassCircle(origin, p2, ctx);

            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (clockwise) {
                ctx.arc(origin.x, origin.y, radScreen, t1, theta);
            } else {
                ctx.arc(origin.x, origin.y, radScreen, theta, t1);
            }
            ctx.stroke();

            state.cursor.x = p2.x;
            state.cursor.y = p2.y;
            drawCursor(ctx, p2.x, p2.y);
        },
    );

    lastDrawn.compass.mark.p2 = push(cs.compassOrigin, t2, cs.compassRadius.radius);
}

async function updateCompassPosition(
    state: AnimateState,
    cs: CompassState,
    ustate: State,
    t1: number,
    lastDrawn: CompassRenderState,
    ctx: CanvasRenderingContext2D,
    speed: number,
) {
    const cp1 = state.toScreen(cs.compassOrigin, ustate);
    const cp2 = state.toScreen(push(cs.compassOrigin, t1, cs.compassRadius.radius), ustate);
    const cpp = pointsToPolar(cp1, cp2);
    const currentp = pointsToPolar(
        state.toScreen(lastDrawn.compass.mark.p1, ustate),
        state.toScreen(lastDrawn.compass.mark.p2, ustate),
    );

    await tweens(
        state,
        currentp,
        (polar) => polarCloser(polar, cpp, 0.1 * speed),
        (polar) => polarDist(polar, cpp),
        (polar, ustate) => {
            drawRuler(
                state.toScreen(lastDrawn.ruler.p1, ustate),
                state.toScreen(lastDrawn.ruler.p2, ustate),
                ctx,
            );

            drawCompassTemplate(
                state.toScreen(lastDrawn.compass.source.p1, ustate),
                state.toScreen(lastDrawn.compass.source.p2, ustate),
                ctx,
            );

            drawCompass(polar.origin, polarPoint(polar), ctx);
            drawCompassCircle(polar.origin, polarPoint(polar), ctx);
            drawCursor(ctx, state.cursor.x, state.cursor.y);
        },
    );
    lastDrawn.compass.mark.p1 = cs.compassOrigin;
    lastDrawn.compass.mark.p2 = push(cs.compassOrigin, t1, cs.compassRadius.radius);
}

async function updateCompassSource(
    histories: {state: State; action: Action | null}[],
    i: number,
    state: AnimateState,
    cs: CompassState,
    lastDrawn: CompassRenderState,
    ctx: CanvasRenderingContext2D,
    speed: number,
) {
    if (!state.compassState) return;
    const ustate = histories[i].state;
    const cp1 = state.toScreen(cs.compassRadius.p1, ustate);
    const cp2 = state.toScreen(cs.compassRadius.p2, ustate);
    const cpp = pointsToPolar(cp1, cp2);
    const currentp = pointsToPolar(
        state.toScreen(lastDrawn.compass.mark.p1, ustate),
        state.toScreen(lastDrawn.compass.mark.p2, ustate),
    );

    const mid: Polar = {...cpp, dist: currentp.dist};
    await tweens(
        state,
        currentp,
        (polar) => polarCloser(polar, mid, 0.1 * speed),
        (polar) => polarDist(polar, mid),
        (polar, ustate) => {
            drawRuler(
                state.toScreen(lastDrawn.ruler.p1, ustate),
                state.toScreen(lastDrawn.ruler.p2, ustate),
                ctx,
            );
            drawCompassTemplate(
                state.toScreen(lastDrawn.compass.source.p1, ustate),
                state.toScreen(lastDrawn.compass.source.p2, ustate),
                ctx,
            );
            drawCompass(polar.origin, polarPoint(polar), ctx, true);
            drawCompassCircle(polar.origin, polarPoint(polar), ctx);
            drawCursor(ctx, state.cursor.x, state.cursor.y);
        },
    );

    await tweens(
        state,
        mid,
        (polar) => polarCloser(polar, cpp, 0.1 * speed),
        (polar) => polarDist(polar, cpp),
        (polar, ustate) => {
            drawRuler(
                state.toScreen(lastDrawn.ruler.p1, ustate),
                state.toScreen(lastDrawn.ruler.p2, ustate),
                ctx,
            );
            drawCompassTemplate(
                state.toScreen(lastDrawn.compass.source.p1, ustate),
                state.toScreen(lastDrawn.compass.source.p2, ustate),
                ctx,
            );
            drawCompass(polar.origin, polarPoint(polar), ctx, true);
            drawCompassCircle(polar.origin, polarPoint(polar), ctx);
            drawCursor(ctx, state.cursor.x, state.cursor.y);
        },
    );

    lastDrawn.compass.source.p1 = state.compassState.compassRadius.p1;
    lastDrawn.compass.source.p2 = state.compassState.compassRadius.p2;
    lastDrawn.compass.mark.p1 = state.compassState.compassRadius.p1;
    lastDrawn.compass.mark.p2 = state.compassState.compassRadius.p2;
}

export const skipRuler = (lastDrawn: CompassRenderState, state: AnimateState, action: GuideAdd) => {
    if (action.guide.geom.type !== 'Line') return;
    if (
        !coordsEqual(lastDrawn.ruler.p1, state.compassState!.rulerP1) ||
        !coordsEqual(lastDrawn.ruler.p2, state.compassState!.rulerP2)
    ) {
        lastDrawn.ruler.p1 = state.compassState!.rulerP1;
        lastDrawn.ruler.p2 = state.compassState!.rulerP2;
    }
};

export const skipCompass = (
    lastDrawn: CompassRenderState,
    state: AnimateState,
    cs: CompassState,
    action: GuideAdd,
) => {
    if (action.guide.geom.type !== 'CloneCircle' && action.guide.geom.type !== 'CircleMark') return;
    if (!state.compassState) return;
    if (
        !coordsEqual(lastDrawn.compass.source.p1, state.compassState.compassRadius.p1) ||
        !coordsEqual(lastDrawn.compass.source.p2, state.compassState.compassRadius.p2)
    ) {
        lastDrawn.compass.source.p1 = state.compassState.compassRadius.p1;
        lastDrawn.compass.source.p2 = state.compassState.compassRadius.p2;
        lastDrawn.compass.mark.p1 = state.compassState.compassRadius.p1;
        lastDrawn.compass.mark.p2 = state.compassState.compassRadius.p2;
    }

    let [t1, t2] =
        action.guide.geom.type === 'CloneCircle'
            ? [0, Math.PI * 2]
            : [action.guide.geom.angle, action.guide.geom.angle2!];

    const currentTheta = angleTo(lastDrawn.compass.mark.p1, lastDrawn.compass.mark.p2);
    const d1 = leastAngleDiff(t1, currentTheta);
    const d2 = leastAngleDiff(t2, currentTheta);
    let clockwise = true;
    if (Math.abs(d2) < Math.abs(d1)) {
        [t1, t2] = [t2, t1];
        clockwise = false;
    }

    lastDrawn.compass.mark.p1 = cs.compassOrigin;
    // lastDrawn.compass.mark.p2 = push(cs.compassOrigin, t1, cs.compassRadius.radius);
    lastDrawn.compass.mark.p2 = push(cs.compassOrigin, t2, cs.compassRadius.radius);
};

export async function animateRuler(
    lastDrawn: CompassRenderState,
    state: AnimateState,
    histories: {state: State; action: Action | null}[],
    i: number,
    cs: CompassState,
    ctx: CanvasRenderingContext2D,
    follow: (
        i: number,
        point: Coord,
        extra?: ((pos: Coord, state: State) => void | Promise<void>) | undefined,
        speed?: number,
    ) => Promise<unknown>,
    action: GuideAdd,
    speed: number,
) {
    if (action.guide.geom.type !== 'Line') return;
    if (
        !coordsEqual(lastDrawn.ruler.p1, state.compassState!.rulerP1) ||
        !coordsEqual(lastDrawn.ruler.p2, state.compassState!.rulerP2)
    ) {
        const ustate = histories[i].state;
        let cp1 = state.toScreen(cs.rulerP1, ustate);
        let cp2 = state.toScreen(cs.rulerP2, ustate);

        const cd1 = dist(cs.rulerP1, lastDrawn.ruler.p1) + dist(cs.rulerP2, lastDrawn.ruler.p2);
        const cd2 = dist(cs.rulerP1, lastDrawn.ruler.p2) + dist(cs.rulerP2, lastDrawn.ruler.p1);

        if (cd2 < cd1) {
            // flip them
            [cp1, cp2] = [cp2, cp1];
        }

        await tweens(
            state,
            {
                p1: state.toScreen(lastDrawn.ruler.p1, ustate),
                p2: state.toScreen(lastDrawn.ruler.p2, ustate),
            },
            ({p1, p2}) => ({
                p1: closer(p1, cp1, 0.1 * speed),
                p2: closer(p2, cp2, 0.1 * speed),
            }),
            ({p1, p2}) => Math.max(dist(p1, cp1), dist(p2, cp2)),
            ({p1, p2}, ustate) => {
                drawRuler(p1, p2, ctx);

                drawCompassTemplate(
                    state.toScreen(lastDrawn.compass.source.p1, ustate),
                    state.toScreen(lastDrawn.compass.source.p2, ustate),
                    ctx,
                );

                drawCompass(
                    state.toScreen(lastDrawn.compass.mark.p1, ustate),
                    state.toScreen(lastDrawn.compass.mark.p2, ustate),
                    ctx,
                );
                drawCompassCircle(
                    state.toScreen(lastDrawn.compass.mark.p1, ustate),
                    state.toScreen(lastDrawn.compass.mark.p2, ustate),
                    ctx,
                );
                drawCursor(ctx, state.cursor.x, state.cursor.y);
            },
        );

        lastDrawn.ruler.p1 = state.compassState!.rulerP1;
        lastDrawn.ruler.p2 = state.compassState!.rulerP2;
    }

    await follow(
        i,
        action.guide.geom.p1,
        (_, ustate) => {
            drawCompassAndRuler(ctx, lastDrawn, state, ustate);
        },
        speed,
    );
    const p1 = action.guide.geom.p1;
    await follow(
        i,
        action.guide.geom.p2,
        (cursor, ustate) => {
            drawCompassAndRuler(ctx, lastDrawn, state, ustate);

            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cursor.x, cursor.y);
            const p = state.toScreen(p1, ustate);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        },
        speed,
    );
}

const circle = (ctx: CanvasRenderingContext2D, p: Coord, r: number, color = 'rgb(0,100,255)') => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r, 0, 0, Math.PI * 2);
    ctx.stroke();
};

const drawRuler = (p1: Coord, p2: Coord, ctx: CanvasRenderingContext2D) => {
    circle(ctx, p1, 20);
    circle(ctx, p2, 20);

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    ctx.strokeStyle = 'rgba(0,100,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(p1.x - dx * 2, p1.y - dy * 2);
    ctx.lineTo(p2.x + dx * 2, p2.y + dy * 2);
    ctx.lineWidth = 40;
    ctx.stroke();
};

const drawCompassTemplate = (origin: Coord, pd: Coord, ctx: CanvasRenderingContext2D) => {
    // circle(ctx, origin, 20);
    // circle(ctx, pd, 20);
    const angle = angleTo(origin, pd);
    const radius = dist(origin, pd);

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;

    const half = push(origin, angle, radius / 2);

    const p1 = push(half, angle + Math.PI / 2, radius / 20);
    const p2 = push(half, angle + Math.PI / 2, -radius / 20);

    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(pd.x, pd.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(origin.x, origin.y);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(pd.x, pd.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(origin.x, origin.y);
    ctx.stroke();

    // ctx.setLineDash([5, 5]);
    // ctx.stroke();
    // ctx.setLineDash([]);
};

const drawCompassCircle = (p0: Coord, pd: Coord, ctx: CanvasRenderingContext2D) => {
    const radius = dist(p0, pd);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(p0.x, p0.y, radius, radius, 0, 0, Math.PI * 2);
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
};

const drawCompass = (
    p0: Coord,
    pd: Coord,
    ctx: CanvasRenderingContext2D,
    destCircle = false,
) => {
    circle(ctx, p0, 20);

    const angle = angleTo(p0, pd);
    const radius = dist(p0, pd);

    const half = push(p0, angle, radius / 2);

    const p1 = push(half, angle + Math.PI / 2, radius / 20);
    const p2 = push(half, angle + Math.PI / 2, -radius / 20);

    ctx.fillStyle = 'rgba(0, 100, 255, 0.1)';
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(pd.x, pd.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 100, 255)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(pd.x, pd.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p0.x, p0.y);
    ctx.stroke();

    if (destCircle) circle(ctx, pd, 20);
    // circle(ctx, pd, 10, "rgba(0,255,100,0.5)");
    // drawCursor(ctx, pd.x, pd.y);
};

export const drawCompassAndRuler = (
    ctx: CanvasRenderingContext2D,
    {ruler, compass}: CompassRenderState,
    state: Pick<AnimateState, 'toScreen'>,
    ustate: State,
) => {
    drawRuler(state.toScreen(ruler.p1, ustate), state.toScreen(ruler.p2, ustate), ctx);

    drawCompassTemplate(
        state.toScreen(compass.source.p1, ustate),
        state.toScreen(compass.source.p2, ustate),
        ctx,
    );

    drawCompass(
        state.toScreen(compass.mark.p1, ustate),
        state.toScreen(compass.mark.p2, ustate),
        ctx,
    );
    drawCompassCircle(
        state.toScreen(compass.mark.p1, ustate),
        state.toScreen(compass.mark.p2, ustate),
        ctx,
    );
};

export const offscreenCompassState = (state: AnimateState, ustate: State): CompassRenderState => {
    const tl = state.fromScreen(
        {x: -state.canvas.width / 10, y: -state.canvas.height / 10},
        ustate,
    );
    const br = state.fromScreen(
        {x: state.canvas.width * 1.1, y: state.canvas.height * 1.1},
        ustate,
    );

    return {
        ruler: {p1: br, p2: posOffset(br, {x: 1, y: 0})},
        compass: {
            source: {p1: tl, p2: posOffset(tl, {x: 1, y: 0})},
            mark: {p1: tl, p2: posOffset(tl, {x: 1, y: 0})},
        },
    };
};
