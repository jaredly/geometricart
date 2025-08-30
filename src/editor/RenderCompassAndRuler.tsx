import React from "react";
import { posOffset, push } from "../rendering/getMirrorTransforms";
import { Circle, lineToSlope, Primitive } from "../rendering/intersect";
import { Coord, GuideGeom, View } from "../types";
import { EditorState } from "./Canvas";
import { CompassState, PendingMark, previewPos } from "./compassAndRuler";
import { RenderPrimitive } from "./RenderPrimitive";
import { Bounds } from "./GuideElement";

type Dot = { type: "dot"; pos: Coord; active: boolean };

type Shapes = (
	| { type: "prim"; prim: Primitive; dashed: boolean }
	| Dot
	| null
)[];

const compassShapes = (state: CompassState): Shapes => {
	if (["PO", "PA1", "PA2", "DC"].includes(state.state)) {
		const shapes: Shapes = [
			{
				type: "dot",
				pos: state.compassOrigin,
				active: state.state === "PO" || state.state === "PA1",
			},
			{
				type: "dot",
				pos: state.compassRadius.p2,
				active: state.state === "PA2",
			},
			{
				type: "prim",
				prim: {
					type: "circle",
					center: state.compassOrigin,
					radius: state.compassRadius.radius,
				},
				dashed: true,
			},
		];
		if (state.pendingMark?.type === "circle") {
			shapes.push({
				type: "prim",
				prim: {
					type: "circle",
					center: state.compassOrigin,
					radius: state.compassRadius.radius,
					limit: [state.pendingMark.t1, state.pendingMark.t2],
				},
				dashed: false,
			});
			shapes.push({
				type: "dot",
				pos: push(
					state.compassOrigin,
					state.pendingMark.t1,
					state.compassRadius.radius,
				),
				active: state.pendingMark.t1 === state.pendingMark.t2,
			});
			if (state.pendingMark.t1 !== state.pendingMark.t2) {
				shapes.push({
					type: "dot",
					pos: push(
						state.compassOrigin,
						state.pendingMark.t2,
						state.compassRadius.radius,
					),
					active: true,
				});
			}
		}
		return shapes;
	} else {
		const shapes: Shapes = [
			{
				type: "dot",
				pos: state.rulerP1,
				active: state.state === "R1",
			},
			{
				type: "dot",
				pos: state.rulerP2,
				active: state.state === "R2",
			},
			{
				type: "prim",
				prim: lineToSlope(state.rulerP1, state.rulerP2),
				dashed: true,
			},
		];

		if (state.pendingMark?.type === "line") {
			shapes.push({
				type: "dot",
				pos: state.pendingMark.p1,
				active: state.pendingMark.p1 === state.pendingMark.p2,
			});
			if (state.pendingMark.p1 !== state.pendingMark.p2) {
				shapes.push({
					type: "prim",
					prim: lineToSlope(state.pendingMark.p1, state.pendingMark.p2, true),
					dashed: false,
				});
				shapes.push({ type: "dot", pos: state.pendingMark.p2, active: true });
			}
		}

		return shapes;
	}
};

export const RenderCompassAndRuler = ({
	state,
	editorState,
	bounds,
	view,
	pendingMark,
}: {
	pendingMark: PendingMark | undefined;
	state?: CompassState;
	editorState: EditorState;
	view: View;
	bounds: Bounds;
}) => {
	const withPos = previewPos(state, editorState.pos);
	const shapes = compassShapes({ ...withPos, pendingMark });
	return (
		<>
			{shapes.map((shape, i) =>
				shape?.type === "dot" ? (
					<circle
						cx={shape.pos.x * view.zoom}
						cy={shape.pos.y * view.zoom}
						r={5}
						pointerEvents={"none"}
						style={{ pointerEvents: "none" }}
						stroke="red"
						fill="none"
						strokeWidth={shape.active ? 3 : 1}
						key={i}
					/>
				) : shape?.type === "prim" ? (
					<RenderPrimitive
						key={i}
						prim={shape.prim}
						isImplied={shape.dashed}
						ignoreMouse
						bounds={bounds}
						zoom={view.zoom}
					/>
				) : null,
			)}
		</>
	);
};
