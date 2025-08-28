import { Hover } from "./editor/Sidebar";
import { GuideGeom, Id, State } from "./types";
import { Action, GroupRegroup } from "./state/Action";
import { PendingDuplication } from "./editor/Guides";
import { PendingMirror } from "./useUIState";

export const toType: { [key: string]: GuideGeom["type"] } = {
	l: "Line",
	s: "Split",
	c: "Circle",
	a: "AngleBisector",
	b: "PerpendicularBisector",
	p: "Perpendicular",
	i: "InCircle",
	y: "Polygon",
	o: "CircumCircle",
	e: "CloneCircle",
	k: "CircleMark",
	K: "CircleMark",
};

export const toTypeRev: { [key: string]: string } = {};
Object.keys(toType).forEach((k) => (toTypeRev[toType[k]] = k));

export const handleKeyboard = (
	latestState: { current: State },
	dispatch: (action: Action) => void,
	setHover: (hover: Hover | null) => void,
	setPendingMirror: (pending: PendingMirror | null) => void,
	pendingDuplication: { current: null | PendingDuplication },
	setPendingDuplication: (d: null | PendingDuplication) => void,
) => {
	let tid: null | NodeJS.Timeout = null;
	const hoverMirror = (id: Id, quick: boolean) => {
		setHover({ kind: "Mirror", id, type: "element" });
		if (tid) {
			clearTimeout(tid);
		}
		tid = setTimeout(
			() => {
				setHover(null);
			},
			quick ? 100 : 1000,
		);
	};

	let prevMirror = latestState.current.activeMirror;

	return (evt: KeyboardEvent) => {
		if (
			evt.target !== document.body &&
			(evt.target instanceof HTMLInputElement ||
				evt.target instanceof HTMLTextAreaElement)
		) {
			return;
		}
		if ((evt.metaKey || evt.ctrlKey) && evt.key === "d") {
			// duplicates
			evt.preventDefault();
			evt.stopPropagation();

			const { selection } = latestState.current;
			if (selection?.type !== "PathGroup" && selection?.type !== "Path") {
				return;
			}
			return dispatch({
				type: "group:duplicate",
				selection: latestState.current.selection as GroupRegroup["selection"],
			});
		}
		// Duplicate selected shapes across 1 point
		if (evt.key === "d") {
			// uhm
			setPendingDuplication({ reflect: false, p0: null });
			return;
		}
		// Duplicate selected shapes across 2 points
		if (evt.key === "D") {
			setPendingDuplication({ reflect: true, p0: null });
			return;
		}
		// Cycle through mirrors
		if (evt.key === "M") {
			const ids = Object.keys(latestState.current.mirrors);
			let id = ids[0];
			if (latestState.current.activeMirror) {
				const idx = ids.indexOf(latestState.current.activeMirror);
				id = ids[(idx + 1) % ids.length];
			}
			dispatch({ type: "mirror:active", id });
			hoverMirror(id, false);
			return;
		}
		// Toggle current mirror on / off
		if ((evt.key === "m" || evt.key === "µ") && evt.altKey) {
			console.log("ok");
			if (latestState.current.activeMirror) {
				prevMirror = latestState.current.activeMirror;
				hoverMirror(prevMirror, true);
				dispatch({ type: "mirror:active", id: null });
			} else if (prevMirror) {
				dispatch({ type: "mirror:active", id: prevMirror });
				hoverMirror(prevMirror, false);
			} else {
				const id = Object.keys(latestState.current.mirrors)[0];
				dispatch({
					type: "mirror:active",
					id: id,
				});
				hoverMirror(id, false);
			}
			return;
		}
		// Make a new mirror
		if (evt.key === "m") {
			setPendingMirror({
				parent: latestState.current.activeMirror,
				rotations: 3,
				reflect: true,
				center: null,
			});
		}
		// Select all
		if (evt.key === "a" && (evt.ctrlKey || evt.metaKey)) {
			evt.preventDefault();
			evt.stopPropagation();
			return dispatch({
				type: "selection:set",
				selection: {
					type: "PathGroup",
					ids: Object.keys(latestState.current.pathGroups),
				},
			});
		}
		// Delete selected items
		if (evt.key === "Delete" || evt.key === "Backspace") {
			console.log("ok", latestState.current.selection?.type);
			if (latestState.current.selection?.type === "Guide") {
				// TODO: make a group:deletee:many
				latestState.current.selection.ids.forEach((id) => {
					dispatch({
						type: "guide:delete",
						id,
					});
				});
				return;
			}
			if (latestState.current.selection?.type === "Path") {
				return dispatch({
					type: "path:delete:many",
					ids: latestState.current.selection.ids,
				});
			}
			if (latestState.current.selection?.type === "PathGroup") {
				return latestState.current.selection.ids.forEach((id) =>
					dispatch({
						type: "group:delete",
						id,
					}),
				);
			}
		}
		if (evt.key === "g") {
			if (evt.metaKey || evt.ctrlKey) {
				evt.preventDefault();
				evt.stopPropagation();
				const { selection } = latestState.current;
				if (selection?.type !== "PathGroup" && selection?.type !== "Path") {
					return;
				}
				return dispatch({
					type: "group:regroup",
					selection: latestState.current.selection as GroupRegroup["selection"],
				});
			}
			return dispatch({
				type: "view:update",
				view: {
					...latestState.current.view,
					guides: !latestState.current.view.guides,
				},
			});
		}
		if (evt.key === "Escape") {
			if (pendingDuplication.current) {
				return setPendingDuplication(null);
			}
			if (latestState.current.pending) {
				return dispatch({ type: "pending:type", kind: null });
			}
			if (latestState.current.selection) {
				return dispatch({ type: "selection:set", selection: null });
			}
		}
		if (evt.key === "z" && (evt.ctrlKey || evt.metaKey)) {
			evt.preventDefault();
			evt.stopPropagation();
			return dispatch({ type: evt.shiftKey ? "redo" : "undo" });
		}
		if (evt.key === "y" && (evt.ctrlKey || evt.metaKey)) {
			evt.stopPropagation();
			evt.preventDefault();
			return dispatch({ type: "redo" });
		}
		if (toType[evt.key]) {
			dispatch({
				type: "pending:type",
				kind: toType[evt.key],
				shiftKey: evt.shiftKey,
			});
		}
	};
};
