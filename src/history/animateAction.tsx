import { Coord, State, View } from "../types";
import { tracePath } from "../rendering/CanvasRender";
import { Action } from "../state/Action";
import { emptyPath } from "../editor/RenderPath";
import { animateGuide } from "./animateGuide";
import { closer, closerOne, followPoints, tweens } from "./followPoint";
import { animateMirror } from "./animateMirror";
import { animatePath } from "./animatePath";
import { animateMultiply } from "./animateMultiply";
import { wait, actionPoints, AnimateState } from "./animateHistory";
import equal from "fast-deep-equal";
import { CompassRenderState, CompassState } from "../editor/compassAndRuler";
import { isCompass } from "../editor/RenderCompassAndRuler";
import {
	angleTo,
	dist,
	posOffset,
	push,
} from "../rendering/getMirrorTransforms";
import { coordsEqual } from "../rendering/pathsAreIdentical";
import { closeEnough } from "../rendering/epsilonToZero";
import { drawCursor } from "./cursor";

const oneToScreen = (state: AnimateState, ustate: State, value: number) =>
	state.toScreen({ x: value, y: 0 }, ustate).x -
	state.toScreen({ x: 0, y: 0 }, ustate).x;

export async function animateAction(
	state: AnimateState,
	histories: { state: State; action: Action | null }[],
	follow: (
		i: number,
		point: Coord,
		extra?: ((pos: Coord, state: State) => void | Promise<void>) | undefined,
	) => Promise<unknown>,
	speed: number,
) {
	const { i, ctx, canvas } = state;
	const action = histories[i].action;

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

		if (action.type !== "path:multiply" && action.type !== "path:update:many") {
			state.lastSelection = undefined;
		}

		if (action.type === "guide:add") {
			if (!state.compassState) return;
			if (!state.lastDrawnCompassState) {
				state.lastDrawnCompassState = offscreenCompassState(
					state,
					histories[i].state,
				);
			}
			const lastDrawn = state.lastDrawnCompassState;

			const cs = state.compassState;
			if (action.guide.geom.type === "Line") {
				if (
					!coordsEqual(lastDrawn.ruler.p1, state.compassState.rulerP1) ||
					!coordsEqual(lastDrawn.ruler.p2, state.compassState.rulerP2)
				) {
					const ustate = histories[i].state;
					const cp1 = state.toScreen(cs.rulerP1, ustate);
					const cp2 = state.toScreen(cs.rulerP2, ustate);
					await tweens(
						state,
						{
							p1: state.toScreen(lastDrawn.ruler.p1, ustate),
							p2: state.toScreen(lastDrawn.ruler.p2, ustate),
						},
						({ p1, p2 }) => ({
							p1: closer(p1, cp1),
							p2: closer(p2, cp2),
						}),
						({ p1, p2 }) => Math.max(dist(p1, cp1), dist(p2, cp2)),
						({ p1, p2 }, ustate) => {
							drawRuler(p1, p2, ctx);
						},
					);
					lastDrawn.ruler.p1 = state.compassState.rulerP1;
					lastDrawn.ruler.p2 = state.compassState.rulerP2;
				}

				await follow(i, action.guide.geom.p1, (_, ustate) => {
					drawRuler(
						state.toScreen(lastDrawn.ruler.p1, ustate),
						state.toScreen(lastDrawn.ruler.p2, ustate),
						ctx,
					);
				});
				const p1 = action.guide.geom.p1;
				await follow(i, action.guide.geom.p2, (cursor, ustate) => {
					drawRuler(
						state.toScreen(lastDrawn.ruler.p1, ustate),
						state.toScreen(lastDrawn.ruler.p2, ustate),
						ctx,
					);
					ctx.strokeStyle = "white";
					ctx.lineWidth = 1;
					ctx.beginPath();
					ctx.moveTo(cursor.x, cursor.y);
					const p = state.toScreen(p1, ustate);
					ctx.lineTo(p.x, p.y);
					ctx.stroke();
				});
			} else if (
				action.guide.geom.type === "CloneCircle" ||
				action.guide.geom.type === "CircleMark"
			) {
				// if (
				// 	!coordsEqual(
				// 		lastDrawn.compassRadius.p1,
				// 		state.compassState.compassRadius.p1,
				// 	) ||
				// 	!coordsEqual(
				// 		lastDrawn.compassRadius.p2,
				// 		state.compassState.compassRadius.p2,
				// 	)
				// ) {
				// 	const ustate = histories[i].state;
				// 	const cp1 = state.toScreen(cs.compassRadius.p1, ustate);
				// 	const cp2 = state.toScreen(cs.compassRadius.p2, ustate);
				// 	await tweens(
				// 		state,
				// 		{
				// 			p1: state.toScreen(lastDrawn.compassRadius.p1, ustate),
				// 			p2: state.toScreen(lastDrawn.compassRadius.p2, ustate),
				// 		},
				// 		({ p1, p2 }) => ({
				// 			p1: closer(p1, cp1),
				// 			p2: closer(p2, cp2),
				// 		}),
				// 		({ p1, p2 }) => Math.max(dist(p1, cp1), dist(p2, cp2)),
				// 		({ p1, p2 }, ustate) => {
				// 			drawCompassTemplate(p1, angleTo(p1, p2), dist(p1, p2), ctx);
				// 		},
				// 	);
				// }
				// if (
				// 	!coordsEqual(
				// 		lastDrawn.compassOrigin,
				// 		state.compassState.compassOrigin,
				// 	)
				// ) {
				// 	const ustate = histories[i].state;
				// 	const cp1 = state.toScreen(cs.compassRadius.p1, ustate);
				// 	const cp2 = state.toScreen(cs.compassRadius.p2, ustate);
				// 	await tweens(
				// 		state,
				// 		{
				// 			p1: state.toScreen(lastDrawn.compassRadius.p1, ustate),
				// 			p2: state.toScreen(lastDrawn.compassRadius.p2, ustate),
				// 		},
				// 		({ p1, p2 }) => ({
				// 			p1: closer(p1, cp1),
				// 			p2: closer(p2, cp2),
				// 		}),
				// 		({ p1, p2 }) => Math.max(dist(p1, cp1), dist(p2, cp2)),
				// 		({ p1, p2 }, ustate) => {
				// 			drawCompassTemplate(p1, angleTo(p1, p2), dist(p1, p2), ctx);
				// 		},
				// 	);
				// }
				// const [t1, t2] =
				// 	action.guide.geom.type === "CloneCircle"
				// 		? [0, Math.PI * 2]
				// 		: [action.guide.geom.angle, action.guide.geom.angle2!];
				// const p1 = push(cs.compassOrigin, cs.compassRadius.radius, t1);
				// await follow(i, p1);
				// const ustate = histories[i].state;
				// const radScreen = oneToScreen(state, ustate, cs.compassRadius.radius);
				// const origin = state.toScreen(cs.compassOrigin, ustate);
				// await tweens(
				// 	state,
				// 	t1,
				// 	(theta) => closerOne(theta, t2),
				// 	(theta) => Math.abs((t2 - theta) * radScreen),
				// 	(theta, ustate) => {
				// 		const cptheta = angleTo(cs.compassRadius.p1, cs.compassRadius.p2);
				// 		drawCompassTemplate(
				// 			state.toScreen(cs.compassRadius.p1, ustate),
				// 			cptheta,
				// 			radScreen,
				// 			ctx,
				// 		);
				// 		drawCompass(origin, theta, radScreen, ctx);
				// 		ctx.strokeStyle = "white";
				// 		ctx.lineWidth = 1;
				// 		ctx.beginPath();
				// 		ctx.arc(origin.x, origin.y, radScreen, t1, theta);
				// 		ctx.stroke();
				// 	},
				// );
			}
		}

		if (action.type === "pending:compass&ruler") {
			// const prev = state.compassState;
			state.compassState = action.state;
			// 	if (!prev) return;

			// 	// I need a comprehensive approach:
			// 	// Render the compass & ruler
			// 	// Animate moving it (from/to) when moving it
			// 	// Animate drawing marks with it.

			// 	if (prev.compassOrigin !== action.state.compassOrigin) {
			// 		// const angle = angleTo(
			// 		// 	state.compassState.compassRadius.p1,
			// 		// 	state.compassState.compassRadius.p2,
			// 		// );
			// 		// await follow(i, state.compassState.compassOrigin, (pos, ustate) => {
			// 		// 	const radius = oneToScreen(
			// 		// 		state,
			// 		// 		ustate,
			// 		// 		state.compassState!.compassRadius.radius,
			// 		// 	);
			// 		// 	drawCompass(pos, angle, radius, ctx);
			// 		// });
			// 	}
			// 	if (prev.compassRadius.p1 !== action.state.compassRadius.p1) {
			// 		// const angle = angleTo(prev.compassRadius.p1, prev.compassRadius.p2);
			// 		// await follow(i, state.compassState.compassRadius.p1, (pos, ustate) => {
			// 		// 	const radius = oneToScreen(state, ustate, prev.compassRadius.radius);
			// 		// 	drawCompass(pos, angle, radius, ctx);
			// 		// });
			// 	}
			// 	if (prev.compassRadius.p2 !== action.state.compassRadius.p2) {
			// 		// await follow(i, state.compassState.compassRadius.p2, (pos, ustate) => {
			// 		//     const angle = angleTo(prev.compassRadius.p1, prev.compassRadius.p2);
			// 		// 	const radius = oneToScreen(state, ustate, prev.compassRadius.radius);
			// 		// 	drawCompass(pos, angle, radius, ctx);
			// 		// });
			// 	}
			// 	if (prev.rulerP1 !== action.state.rulerP1) {
			// 		await follow(i, state.compassState.rulerP1);
			// 	}
			// 	if (prev.rulerP2 !== action.state.rulerP2) {
			// 		await follow(i, state.compassState.rulerP2);
			// 	}
			// 	// action.state
			// 	// TODO start here! Yes please.
		}

		if (action.type === "path:create" || action.type === "path:create:many") {
			await animatePath(state, follow, action, prev, speed);
		} else if (action.type === "path:multiply") {
			await animateMultiply(state, action, prev, follow, speed);
		} else if (action.type === "clip:add") {
			const clip = action.clip;
			await withScreen(async (zoom, width, height) => {
				for (let j = 0; j < clip.length; j++) {
					ctx.strokeStyle = "magenta";
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
			action.type === "pending:point" &&
			prev.pending &&
			prev.pending.type === "Guide"
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
		} else if (action.type === "mirror:add") {
			await animateMirror(
				follow,
				i,
				action,
				ctx,
				state.fromScreen,
				prev,
				speed,
			);
		} else if (
			action.type === "path:update" ||
			action.type === "path:update:many" ||
			action.type === "pathGroup:update:many"
		) {
			await wait(100 / speed);
		} else if (action.type === "view:update") {
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
				actionPoints(action).map((point) =>
					state.toScreen(point, histories[i].state),
				),
				speed,
			);
		}
	}
}

const circle = (ctx: CanvasRenderingContext2D, p: Coord, r: number) => {
	ctx.strokeStyle = "rgb(0,100,255)";
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

	ctx.strokeStyle = "rgba(0,100,255,0.2)";
	ctx.beginPath();
	ctx.moveTo(p1.x - dx * 2, p1.y - dy * 2);
	ctx.lineTo(p2.x + dx * 2, p2.y + dy * 2);
	ctx.lineWidth = 40;
	ctx.stroke();
};

const drawCompassTemplate = (
	origin: Coord,
	pd: Coord,
	ctx: CanvasRenderingContext2D,
) => {
	circle(ctx, origin, 20);
	circle(ctx, pd, 20);

	const angle = angleTo(origin, pd);
	const radius = dist(origin, pd);

	ctx.strokeStyle = "white";
	ctx.lineWidth = 5;

	ctx.beginPath();
	ctx.moveTo(origin.x, origin.y);

	const half = push(origin, angle, radius / 2);

	const p1 = push(half, angle + Math.PI / 2, radius / 20);
	const p2 = push(half, angle + Math.PI / 2, -radius / 20);

	ctx.lineTo(p1.x, p1.y);
	ctx.lineTo(pd.x, pd.y);
	ctx.lineTo(p2.x, p2.y);
	ctx.lineTo(origin.x, origin.y);
	ctx.setLineDash([5, 5]);
	ctx.stroke();
	ctx.setLineDash([]);
};

const drawCompass = (p0: Coord, pd: Coord, ctx: CanvasRenderingContext2D) => {
	circle(ctx, p0, 20);

	ctx.fillStyle = "rgba(0, 100, 255, 0.1)";
	ctx.lineWidth = 5;

	ctx.beginPath();
	ctx.moveTo(p0.x, p0.y);
	const angle = angleTo(p0, pd);
	const radius = dist(p0, pd);

	const half = push(p0, angle, radius / 2);

	const p1 = push(half, angle + Math.PI / 2, radius / 20);
	const p2 = push(half, angle + Math.PI / 2, -radius / 20);

	ctx.lineTo(p1.x, p1.y);
	ctx.lineTo(pd.x, pd.y);
	ctx.lineTo(p2.x, p2.y);
	ctx.fill();

	drawCursor(ctx, pd.x, pd.y);
};

export const drawCompassAndRuler = (
	ctx: CanvasRenderingContext2D,
	{ ruler, compass }: CompassRenderState,
	state: AnimateState,
	ustate: State,
) => {
	drawRuler(
		state.toScreen(ruler.p1, ustate),
		state.toScreen(ruler.p2, ustate),
		ctx,
	);

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
};

const offscreenCompassState = (
	state: AnimateState,
	ustate: State,
): CompassRenderState => {
	const tl = state.fromScreen(
		{ x: -state.canvas.width / 10, y: -state.canvas.height / 10 },
		ustate,
	);
	const br = state.fromScreen(
		{ x: state.canvas.width * 1.1, y: state.canvas.height * 1.1 },
		ustate,
	);

	return {
		ruler: { p1: br, p2: posOffset(br, { x: 1, y: 0 }) },
		compass: {
			source: { p1: tl, p2: posOffset(tl, { x: 1, y: 0 }) },
			mark: { p1: tl, p2: posOffset(tl, { x: 1, y: 0 }) },
		},
	};
};
