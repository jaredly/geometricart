import { useMemo, useRef } from "react";
import { State, View } from "../types";
import { EditorState, screenToWorld } from "./Canvas";
import {
	canFreeClick,
	dragPos,
	handleClick,
	markToGeom,
	previewPos,
} from "./compassAndRuler";
import { Action } from "../state/Action";

export const genId = () => Math.random().toString(36).slice(2);

export const useCompassAndRulerHandlers = (
	ref: React.RefObject<SVGSVGElement>,
	view: View,
	width: number,
	height: number,
	currentState: React.MutableRefObject<State>,
	dispatch: (action: Action) => unknown,
	setEditorState: React.Dispatch<React.SetStateAction<EditorState>>,
) => {
	const currentView = useRef(view);
	currentView.current = view;

	return useMemo(
		() => ({
			onMouseDown(evt: React.MouseEvent) {
				const rect = ref.current!.getBoundingClientRect();
				const view = currentView.current;
				// evt.
				const pos = screenToWorld(
					width,
					height,
					{ x: evt.clientX - rect.left, y: evt.clientY - rect.top },
					view,
				);

				const state = currentState.current;
				console.log("holla", canFreeClick(state.compassState?.state));
				if (canFreeClick(state.compassState?.state)) {
					dispatch({
						type: "pending:compass&ruler",
						state: handleClick(previewPos(state.compassState, pos)),
					});
				}
			},
			onMouseUp: (evt: React.MouseEvent) => {
				const rect = evt.currentTarget.getBoundingClientRect();

				const pos = screenToWorld(
					width,
					height,
					{
						x: evt.clientX - rect.left,
						y: evt.clientY - rect.top,
					},
					view,
				);
				const state = currentState.current;
				if (!state.compassState?.pendingMark) return;

				const geom = markToGeom(dragPos(state.compassState, pos));
				if (geom) {
					const id = genId();
					dispatch({
						type: "guide:add",
						id,
						guide: {
							id,
							active: true,
							basedOn: [],
							geom,
							mirror: state.activeMirror
								? state.mirrors[state.activeMirror]
								: null,
						},
					});
				}

				dispatch({
					type: "pending:compass&ruler",
					state: { ...state.compassState, pendingMark: undefined },
				});
			},
			onMouseMove: (evt: React.MouseEvent) => {
				const state = currentState.current;
				const view = currentView.current;
				// if (state.compassState?.pendingMark)

				const rect = evt.currentTarget.getBoundingClientRect();

				const pos = screenToWorld(
					width,
					height,
					{
						x: evt.clientX - rect.left,
						y: evt.clientY - rect.top,
					},
					view,
				);

				// const pos = {
				// 	x: (evt.clientX - rect.left - x) / view.zoom,
				// 	y: (evt.clientY - rect.top - y) / view.zoom,
				// };
				setEditorState((state) => ({ ...state, pos }));

				// if (dragPos) {
				// 	const rect = evt.currentTarget.getBoundingClientRect();
				// 	const clientX = evt.clientX;
				// 	const clientY = evt.clientY;
				// 	evt.preventDefault();

				// 	setEditorState((prev) => {
				// 		return {
				// 			...prev,
				// 			tmpView: dragView(
				// 				prev.tmpView,
				// 				dragPos,
				// 				clientX,
				// 				rect,
				// 				clientY,
				// 				width,
				// 				height,
				// 			),
				// 		};
				// 	});
				// } else {
				// 	// setPos(pos);
				// }
			},
		}),
		[],
	);
};
