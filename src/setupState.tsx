import { Mirror, State } from "./types";
import { initialState } from "./state/initialState";
import { reducer, reifyMirror } from "./state/reducer";
import { Action } from "./state/Action";

export function setupState(mirror: Mirror | null) {
	let state = initialState;

	const actions: (((state: State) => Action) | Action)[] = [];

	actions.push({
		type: "guide:add",
		id: "base",
		guide: {
			id: "base",
			geom: {
				type: "Circle",
				center: { x: 0, y: 0 },
				radius: { x: 0, y: -1 },
				line: true,
				half: false,
				multiples: 0,
			},
			active: true,
			basedOn: [],
			mirror: null,
		},
	});

	if (mirror) {
		actions.push({
			type: "mirror:add",
			mirror,
			activate: true,
		});
	}

	actions.push((state) => ({
		type: "guide:add",
		id: "line",
		guide: {
			id: "line",
			geom: {
				type: "Line",
				p1: { x: 0, y: 0 },
				p2: { x: 0, y: -1 },
				limit: false,
			},
			active: true,
			basedOn: [],
			mirror: state.activeMirror
				? reifyMirror(state.mirrors, state.activeMirror)
				: null,
		},
	}));

	actions.forEach(
		(action) =>
			(state = reducer(
				state,
				typeof action === "function" ? action(state) : action,
			)),
	);

	return state;
}
