import { History } from "../types";
import { UndoableAction, UndoAction } from "../state/Action";

/** Returns the things to undo to get to a common parent, and then the things to do to get up to the new branch. */
export const switchBranches = (
	history: History,
	newBranch: number,
): { undo: Array<UndoableAction>; do: Array<UndoableAction> } => {
	// - get array ofancestor ids for current and new branches
	// - find the longest shared prefix
	// - undo to the smaller idx of that shared parent
	// - then redo to the new branch.
	// - success!
	// return { undo: [], do: [] };
	throw new Error("not impl");
};

export const getHistoricalAction = (
	history: History,
	at: number,
): { action: UndoAction; idx: number; branch: number } | null => {
	if (at === 0) {
		console.error(`AT cannot be zero!`);
		return null;
	}
	let branch = history.branches[history.currentBranch];
	while (at > branch.items.length) {
		at -= branch.items.length;
		// Exhausted undos
		if (!branch.parent) {
			return null;
		}
		let idx = branch.parent.idx;
		branch = history.branches[branch.parent.branch];
		at += branch.items.length - idx;
	}

	const idx = branch.items.length - at;
	return { idx, branch: branch.id, action: branch.items[idx] };
};

export const undoAction = (history: History): [History, UndoAction | null] => {
	let undo = history.undo + 1;
	const action = getHistoricalAction(history, undo);
	if (!action) {
		return [history, null];
	}
	return [{ ...history, undo }, action.action];
};

export const redoAction = (
	history: History,
): [History, UndoableAction | null] => {
	if (history.undo === 0) {
		return [history, null];
	}

	const action = getHistoricalAction(history, history.undo);
	if (!action) {
		console.warn(
			`This isn't supposed to happen. trying to redu, but we cant find the action to redo.`,
		);
		return [history, null];
	}

	return [{ ...history, undo: history.undo - 1 }, action.action.action];
};

export const addAction = (history: History, action: UndoAction): History => {
	if (history.undo > 0) {
		const found = getHistoricalAction(history, history.undo);
		if (!found) {
			throw new Error(`weird undo state, sorry`);
		}
		// Make a new branch folks!
		history = {
			...history,
			undo: 0,
			nextId: history.nextId + 1,
			currentBranch: history.nextId,
			branches: {
				...history.branches,
				[history.nextId]: {
					parent: { branch: found.branch, idx: found.idx },
					items: [],
					snapshot: null,
					id: history.nextId,
				},
			},
		};
	}

	return {
		...history,
		branches: {
			...history.branches,
			[history.currentBranch]: {
				...history.branches[history.currentBranch],
				items: history.branches[history.currentBranch].items.concat([action]),
			},
		},
	};
};
