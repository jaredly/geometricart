import { Coord, State } from "../types";
import {
	applyHistoryView,
	cacheOverlays,
	findViewPoints,
	getHistoriesList,
	mergeViewPoints,
	simplifyHistory,
	StateAndAction,
} from "./HistoryPlayback";
import {
	canvasRender,
	makeImage,
	paletteImages,
} from "../rendering/CanvasRender";
import { findBoundingRect } from "../editor/Export";
import { renderTexture } from "../editor/ExportPng";
import { screenToWorld, worldToScreen } from "../editor/Canvas";
import { Action } from "../state/Action";
import React from "react";
import { followPoint } from "./followPoint";
import { animateAction } from "./animateAction";
import { drawCursor } from "./cursor";
import { coordsEqual } from "../rendering/pathsAreIdentical";
import { closeEnough } from "../rendering/epsilonToZero";
import { CompassState } from "../editor/compassAndRuler";

export const nextFrame = () => new Promise(requestAnimationFrame);
export const wait = (time: number) =>
	new Promise((res) => setTimeout(res, time));

export type AnimateState = {
	ctx: CanvasRenderingContext2D;
	canvas: HTMLCanvasElement;
	compassState?: CompassState;
	lastDrawnCompassState?: CompassState;
	i: number;
	cursor: Coord;
	frames: ImageBitmap[];
	fromScreen: (point: Coord, state: State) => Coord;
	toScreen: (point: Coord, state: State) => Coord;
	histories: StateAndAction[];
	lastSelection?: { type: "Path" | "PathGroup"; ids: string[] };
};

export const animateHistory = async (
	originalState: State,
	canvas: HTMLCanvasElement,
	stopped: { current: boolean },
	startAt: number,
	preimage: boolean,
	log: React.RefObject<HTMLDivElement>,
	inputRef?: HTMLInputElement | null,
	animateTitle?: boolean,
) => {
	const now = Date.now();

	const speed = 1;

	let histories = getHistoriesList(originalState);
	const { zoom } = originalState.animations.config;
	const ctx = canvas.getContext("2d")!;
	ctx.lineWidth = 1;

	const offcan = document.createElement("canvas");
	offcan.width = canvas.width;
	offcan.height = canvas.height;
	const offctx = offcan.getContext("2d")!;

	const bounds = findBoundingRect(originalState);
	const originalSize = 1000;

	// let h = bounds
	//     ? makeEven((bounds.y2 - bounds.y1) * originalState.view.zoom + crop * 2)
	//     : originalSize;
	// let w = bounds
	//     ? makeEven((bounds.x2 - bounds.x1) * originalState.view.zoom + crop * 2)
	//     : originalSize;
	let h = originalSize;
	let w = originalSize;

	const viewPoints = findViewPoints(histories);
	const mergedVP = mergeViewPoints(
		viewPoints,
		originalState.historyView?.zooms,
	);

	for (let i = 0; i < histories.length; i++) {
		histories[i].state = applyHistoryView(
			mergedVP,
			i,
			// originalState.historyView?.zooms ?? [],
			histories[i].state,
		);
	}
	histories = histories.filter(
		(_, i) => !originalState.historyView?.skips.includes(i),
	);

	const overlays = await cacheOverlays(originalState);
	const cachedPaletteImages = await paletteImages(originalState.palette);

	const draw = (current: number, context = ctx) => {
		context.save();
		const state = histories[current].state;
		canvasRender(
			context,
			state,
			w * 2 * zoom,
			h * 2 * zoom,
			2 * zoom,
			{},
			0,
			overlays,
			cachedPaletteImages,
			true,
		);
		context.restore();
		if (state.view.texture) {
			const size = Math.max(w * 2 * zoom, h * 2 * zoom);
			renderTexture(state.view.texture, size, size, context);
		}
	};

	startAt = startAt < histories.length - 1 ? startAt : 0;

	const state: AnimateState = {
		ctx,
		i: startAt,
		cursor: { x: 0, y: 0 },
		compassState: undefined,
		canvas,
		frames: [],
		histories,
		fromScreen: (point: Coord, state: State) =>
			screenToWorld(canvas.width, canvas.height, point, {
				...state.view,
				zoom: state.view.zoom * 2,
			}),

		toScreen: (point: Coord, state: State) =>
			worldToScreen(canvas.width, canvas.height, point, {
				...state.view,
				zoom: state.view.zoom * 2,
			}),
	};

	const follow = (
		i: number,
		point: Coord,
		extra?: (pos: Coord) => void | Promise<void>,
	) => followPoint(state, state.toScreen(point, histories[i].state), extra);

	if (preimage) {
		for (let i = 0; i < histories.length; i++) {
			draw(i);
			state.frames.push(await createImageBitmap(canvas));
			if (i % 5 === 0) {
				log.current!.textContent = `Frame ${i} of ${histories.length}`;
				await nextFrame();
			}
		}
	}

	if (!preimage && startAt > 0) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		draw(startAt - 1, offctx);
		state.frames[startAt - 1] = await createImageBitmap(offcan);
	}
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	if (animateTitle) {
		draw(state.i);
		const first = await createImageBitmap(canvas);

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		draw(histories.length - 1);

		await wait(500);

		const final = await createImageBitmap(canvas);
		const text = "Pattern walk-through";

		ctx.font = "100px sans-serif";
		ctx.fillStyle = "white";
		ctx.textAlign = "left";
		// ctx.textAlign = 'center';
		ctx.strokeStyle = "rgba(0,0,0,1)";
		ctx.lineJoin = "round";
		ctx.lineCap = "round";
		ctx.lineWidth = 30;

		const fw = ctx.measureText(text).width;
		const widths = [0];
		for (let i = 1; i <= text.length; i++) {
			widths.push(ctx.measureText(text.slice(0, i)).width);
		}

		const frames = 240; // / speed;
		for (let i = 0; i < frames; i++) {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(final, 0, 0);
			const w = (fw / frames) * i;
			const at = widths.findIndex((m) => m > w);

			const t = text.slice(0, at);
			ctx.strokeText(t, ctx.canvas.width / 2 - w / 2, ctx.canvas.height * 0.9);
			ctx.fillText(t, ctx.canvas.width / 2 - w / 2, ctx.canvas.height * 0.9);

			await nextFrame();
		}
		ctx.lineWidth = 1;

		await wait(400 / speed);

		await crossFade(ctx, canvas, first, final, 30 / speed);
	}

	for (; state.i < histories.length; state.i++) {
		if (stopped.current) {
			break;
		}
		// if (originalState.historyView?.skips.includes(state.i)) {
		//     continue;
		// }
		if (inputRef) {
			inputRef.value = state.i + "";
		}

		await animateAction(state, histories, follow, speed);

		if (state.i > 0) {
			const st = histories[state.i].state;
			const ps = histories[state.i - 1].state;
			if (
				!coordsEqual(st.view.center, ps.view.center) ||
				!closeEnough(st.view.zoom, ps.view.zoom)
			) {
				let next: ImageBitmap;
				if (preimage) {
					next = state.frames[state.i];
				} else {
					draw(state.i, offctx);
					next = await createImageBitmap(offcan);
					// ctx.clearRect(0, 0, canvas.width, canvas.height);
					// ctx.drawImage(state.frames[state.i - 1], 0, 0);
				}
				await crossFade(ctx, canvas, next, state.frames[state.i - 1], 30);
			}
			// continue;
		}

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		if (preimage) {
			ctx.drawImage(state.frames[state.i], 0, 0);
		} else {
			draw(state.i);
			state.frames.push(await createImageBitmap(canvas));
		}

		if (histories[state.i].action?.type === "path:update:many") {
		} else {
			// Draw the cursor
			drawCursor(ctx, state.cursor.x, state.cursor.y);
		}

		await nextFrame();
	}

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(state.frames[state.frames.length - 1], 0, 0);

	console.log("ok", Date.now() - now);
};

export const actionPoints = (action: Action) => {
	switch (action.type) {
		case "pending:point":
			return [action.coord];
		case "mirror:add":
			return [action.mirror.origin, action.mirror.point];
		case "path:create":
			return [action.origin, ...action.segments.map((seg) => seg.to)];
	}
	return [];
};

async function crossFade(
	ctx: CanvasRenderingContext2D,
	canvas: HTMLCanvasElement,
	first: ImageBitmap,
	final: ImageBitmap,
	frames: number,
) {
	for (let i = 0; i <= frames; i++) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(first, 0, 0);
		ctx.globalAlpha = (frames - i) / frames;
		ctx.drawImage(final, 0, 0);
		ctx.globalAlpha = 1;
		await nextFrame();
	}
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(first, 0, 0);
}
