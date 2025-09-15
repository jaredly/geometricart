import {Coord, State, View} from '../types';
import {tracePath} from '../rendering/CanvasRender';
import {Action} from '../state/Action';
import {emptyPath} from '../editor/RenderPath';
import {animateGuide} from './animateGuide';
import {closer, closerOne, followPoints, tweens} from './followPoint';
import {animateMirror} from './animateMirror';
import {animatePath} from './animatePath';
import {animateMultiply} from './animateMultiply';
import {wait, actionPoints, AnimateState} from './animateHistory';
import equal from 'fast-deep-equal';
import {CompassRenderState, CompassState} from '../editor/compassAndRuler';
import {isCompass} from '../editor/RenderCompassAndRuler';
import {angleTo, dist, posOffset, push} from '../rendering/getMirrorTransforms';
import {coordsEqual} from '../rendering/pathsAreIdentical';
import {closeEnough} from '../rendering/epsilonToZero';
import {drawCursor} from './cursor';
import {angleBetween} from '../rendering/findNextSegments';

const oneToScreen = (state: AnimateState, ustate: State, value: number) =>
    state.toScreen({x: value, y: 0}, ustate).x - state.toScreen({x: 0, y: 0}, ustate).x;

export async function animateAction(
    state: AnimateState,
    histories: {state: State; action: Action | null}[],
    follow: (
        i: number,
        point: Coord,
        extra?: ((pos: Coord, state: State) => void | Promise<void>) | undefined,
    ) => Promise<unknown>,
    speed: number,
) {
    const {i, ctx, canvas} = state;
    const action = histories[i].action;

    if (action?.type === 'history-view:update') {
        return;
    }

    if (action && i > 0) {
        const prev = histories[i - 1].state;

        const withScreen = async (
            fn: (zoom: number, width: number, height: number) => Promise<void> | void,
        ): Promise<void> => {
            ctx.save();
            const zoom = prev.view.zoom * 2;

            const xoff = canvas.width / 2 + prev.view.center.x * zoom;
            const yoff = canvas.height / 2 + prev.view.center.y * zoom;
            ctx.translate(xoff, yoff);
            await fn(zoom, canvas.width, canvas.height);
            ctx.restore();
        };

        if (action.type !== 'path:multiply' && action.type !== 'path:update:many') {
            state.lastSelection = undefined;
        }

        if (action.type === 'guide:add') {
            if (!state.compassState) return;
            if (!state.lastDrawnCompassState) {
                state.lastDrawnCompassState = offscreenCompassState(state, histories[i].state);
            }
            const lastDrawn = state.lastDrawnCompassState;

            const cs = state.compassState;
            if (action.guide.geom.type === 'Line') {
                if (
                    !coordsEqual(lastDrawn.ruler.p1, state.compassState.rulerP1) ||
                    !coordsEqual(lastDrawn.ruler.p2, state.compassState.rulerP2)
                ) {
                    const ustate = histories[i].state;
                    let cp1 = state.toScreen(cs.rulerP1, ustate);
                    let cp2 = state.toScreen(cs.rulerP2, ustate);

                    const cd1 =
                        dist(cs.rulerP1, lastDrawn.ruler.p1) + dist(cs.rulerP2, lastDrawn.ruler.p2);
                    const cd2 =
                        dist(cs.rulerP1, lastDrawn.ruler.p2) + dist(cs.rulerP2, lastDrawn.ruler.p1);

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
                            p1: closer(p1, cp1),
                            p2: closer(p2, cp2),
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

                    lastDrawn.ruler.p1 = state.compassState.rulerP1;
                    lastDrawn.ruler.p2 = state.compassState.rulerP2;
                }

                await follow(i, action.guide.geom.p1, (_, ustate) => {
                    drawCompassAndRuler(ctx, lastDrawn, state, ustate);
                });
                const p1 = action.guide.geom.p1;
                await follow(i, action.guide.geom.p2, (cursor, ustate) => {
                    drawCompassAndRuler(ctx, lastDrawn, state, ustate);

                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(cursor.x, cursor.y);
                    const p = state.toScreen(p1, ustate);
                    ctx.lineTo(p.x, p.y);
                    ctx.stroke();
                });
            } else if (
                action.guide.geom.type === 'CloneCircle' ||
                action.guide.geom.type === 'CircleMark'
            ) {
                if (
                    !coordsEqual(
                        lastDrawn.compass.source.p1,
                        state.compassState.compassRadius.p1,
                    ) ||
                    !coordsEqual(lastDrawn.compass.source.p2, state.compassState.compassRadius.p2)
                ) {
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
                        (polar) => polarCloser(polar, mid),
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
                        (polar) => polarCloser(polar, cpp),
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
                const fullCircle = action.guide.geom.type === 'CloneCircle';

                const [t1, t2] =
                    action.guide.geom.type === 'CloneCircle'
                        ? [0, Math.PI * 2]
                        : [action.guide.geom.angle, action.guide.geom.angle2!];
                // angleBetween(action.guide.geom.angle, action.guide.geom.angle2!, true) >
                //   Math.PI
                // ? [action.guide.geom.angle2!, action.guide.geom.angle]
                // : [action.guide.geom.angle, action.guide.geom.angle2!];

                const ustate = histories[i].state;
                const cp1 = state.toScreen(cs.compassOrigin, ustate);
                const cp2 = state.toScreen(
                    push(cs.compassOrigin, t1, cs.compassRadius.radius),
                    ustate,
                );
                const cpp = pointsToPolar(cp1, cp2);
                const currentp = pointsToPolar(
                    state.toScreen(lastDrawn.compass.mark.p1, ustate),
                    state.toScreen(lastDrawn.compass.mark.p2, ustate),
                );

                await tweens(
                    state,
                    currentp,
                    (polar) => polarCloser(polar, cpp),
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

                const p1 = push(cs.compassOrigin, t1, cs.compassRadius.radius);
                await follow(i, p1, (_, ustate) => {
                    drawCompassAndRuler(ctx, lastDrawn, state, ustate);
                });
                const radScreen = oneToScreen(state, ustate, cs.compassRadius.radius);
                const origin = state.toScreen(cs.compassOrigin, ustate);
                await tweens(
                    state,
                    t1,
                    (theta) => (fullCircle ? closerOne(theta, t2) : closerAngle(theta, t2)),
                    (theta) =>
                        fullCircle
                            ? Math.abs((t2 - theta) * radScreen)
                            : dist(
                                  push({x: 0, y: 0}, theta, radScreen),
                                  push({x: 0, y: 0}, t2, radScreen),
                              ),
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
                        ctx.arc(origin.x, origin.y, radScreen, t1, theta);
                        ctx.stroke();

                        state.cursor.x = p2.x;
                        state.cursor.y = p2.y;
                        drawCursor(ctx, p2.x, p2.y);
                    },
                );

                lastDrawn.compass.mark.p2 = push(cs.compassOrigin, t2, cs.compassRadius.radius);
            }
        }

        if (action.type === 'pending:compass&ruler') {
            state.compassState = action.state;
        }

        if (action.type === 'path:create' || action.type === 'path:create:many') {
            await animatePath(state, follow, action, prev, speed);
        } else if (action.type === 'path:multiply') {
            await animateMultiply(state, action, prev, follow, speed);
        } else if (action.type === 'clip:add') {
            const clip = action.clip;
            await withScreen(async (zoom, width, height) => {
                for (let j = 0; j < clip.length; j++) {
                    ctx.strokeStyle = 'magenta';
                    ctx.lineWidth = 5;
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
                    await wait(1000 / clip.length / speed);
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
                speed,
            );
        } else if (action.type === 'mirror:add') {
            await animateMirror(follow, i, action, ctx, state.fromScreen, prev, speed);
        } else if (
            action.type === 'path:update' ||
            action.type === 'path:update:many' ||
            action.type === 'pathGroup:update:many'
        ) {
            await wait(100 / speed);
        } else if (action.type === 'view:update') {
            // if (
            //     action.view.zoom > prev.view.zoom &&
            //     action.view.center.x === prev.view.center.x &&
            //     action.view.center.y === prev.view.center.y
            // ) {
            //     // The zoom was overridden
            //     if (!equal(action.view, histories[state.i].state.view)) {
            //         return;
            //     }
            //     const frame = state.frames[state.i - 1];
            //     const num = 60 / speed;
            //     const bz = action.view.zoom - prev.view.zoom; // / num;
            //     for (let i = num; i >= 0; i--) {
            //         const perc = (Math.sin((i / num - 0.5) * Math.PI) + 1) / 2;
            //         const az = (prev.view.zoom + bz * perc) / prev.view.zoom;
            //         ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            //         const nw = frame.width * az;
            //         const nh = frame.height * az;
            //         ctx.drawImage(
            //             frame,
            //             (frame.width - nw) / 2,
            //             (frame.height - nh) / 2,
            //             nw,
            //             nh,
            //         );
            //         await new Promise((res) => requestAnimationFrame(res));
            //     }
            //     /*
            //     const zoomLevel = Math.max(action.view.zoom, prev.view.zoom);
            //     const ptl = fromScreen({ x: 0, y: 0 }, prev);
            //     const pbr = fromScreen(
            //         { x: canvas.width, y: canvas.height },
            //         prev,
            //     );
            //     const ntl = fromScreen(
            //         { x: 0, y: 0 },
            //         { ...prev, view: action.view },
            //     );
            //     const nbr = fromScreen(
            //         { x: canvas.width, y: canvas.height },
            //         { ...prev, view: action.view },
            //     );
            //     const x0 = Math.min(ptl.x, pbr.x);
            //     const x1 = Math.max(ptl.x, pbr.x);
            //     const y0 = Math.min(ptl.y, pbr.y);
            //     const y1 = Math.max(ptl.y, pbr.y);
            //     const dx = x1 - x0;
            //     const dy = y1 - y0;
            //     const width = dx * zoomLevel;
            //     const height = dy * zoomLevel;
            //     console.log(`desired`, width, height, dx, dy, zoomLevel);
            //     const c2 = document.createElement('canvas');
            //     c2.width = width;
            //     c2.height = height;
            //     const ct2 = c2.getContext('2d')!;
            //     await canvasRender(
            //         ct2,
            //         // prev,
            //         {
            //             ...prev,
            //             overlays: {},
            //             view: {
            //                 ...action.view,
            //                 zoom: zoomLevel,
            //                 center: { x: x0 + dx / 2, y: y0 + dy / 2 },
            //             },
            //         },
            //         width,
            //         width,
            //         1,
            //         {},
            //         0,
            //         null,
            //     );
            //     document.body.appendChild(c2);
            //     */
            // } else if (
            //     action.view.zoom !== prev.view.zoom ||
            //     action.view.center.x !== prev.view.center.x ||
            //     action.view.center.y !== prev.view.center.y
            // ) {
            //     await wait(500 / speed);
            // }
        } else {
            await followPoints(
                state,
                actionPoints(action).map((point) => state.toScreen(point, histories[i].state)),
                speed,
            );
        }
    }
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

export const drawCompassCircle = (p0: Coord, pd: Coord, ctx: CanvasRenderingContext2D) => {
    const radius = dist(p0, pd);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(p0.x, p0.y, radius, radius, 0, 0, Math.PI * 2);
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
};

const drawCompass = (p0: Coord, pd: Coord, ctx: CanvasRenderingContext2D, destCircle = false) => {
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

const offscreenCompassState = (state: AnimateState, ustate: State): CompassRenderState => {
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

export type Polar = {origin: Coord; angle: number; dist: number};

export const pointsToPolar = (p1: Coord, p2: Coord) => ({
    origin: p1,
    angle: angleTo(p1, p2),
    dist: dist(p1, p2),
});

export const polarPoint = (polar: Polar) => push(polar.origin, polar.angle, polar.dist);

export const closerAngle = (one: number, two: number, amt = 0.1) => {
    let diff = angleBetween(one, two, true);
    if (diff > Math.PI) diff -= Math.PI * 2;
    return one + diff * amt;
};

export const polarCloser = (p1: Polar, p2: Polar, amt?: number): Polar => ({
    origin: closer(p1.origin, p2.origin, amt),
    angle: closerAngle(p1.angle, p2.angle, amt),
    dist: closerOne(p1.dist, p2.dist, amt),
});

export const polarDist = (p1: Polar, p2: Polar) =>
    Math.max(dist(p1.origin, p2.origin), dist(polarPoint(p1), polarPoint(p2)));
