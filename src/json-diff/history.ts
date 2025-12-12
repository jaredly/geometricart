/*

I want a way to keep track of history changes.

IF you need to make a non-backwards-compatible change.
make a clean break with history, idk. or figure out how to transmute everything yourself.
or like come up with some way of representing a 'jsondiff migration'.
but I won't concern myself with that right now.

We need:
- root
- nodes have children
- an "active tip"
- nodes can have commentary (title, thumbnail, etc.)


ok but like if I did want to do 'merge commits'. What would that even look like?
yeah I think it would be something like "select this group of changes, show me a summary,
let me modify anything or resolve conflicts, and then commit that as a new separate change onto the current stack".
So we wouldn't actually do a merge. More like a cherry-pick.
And you could have an annotation that's like "where did we get this from" if you wanted.

*/

import {splitPathToDestination} from './findHistoryJump';
import {JsonPatchOp, PendingJsonPatchOp} from './helper2';
import {resolveAndApply} from './make2';
import {ops} from './ops2';

type HistoryNode<T, An> = {
    id: string;
    changes: JsonPatchOp<T>[];
    pid: string;
    children: string[];
};

export type History<T, An> = {
    initial: T;
    nodes: Record<string, HistoryNode<T, An>>;
    annotations: Record<string, An[]>;
    root: string;
    tip: string;
    current: T;
    undoTrail: string[];
};

export function blankHistory<T, An = never>(v: T): History<T, An> {
    return {
        current: v,
        initial: v,
        nodes: {root: {changes: [], children: [], id: 'root', pid: 'root'}},
        annotations: {},
        root: 'root',
        tip: 'root',
        undoTrail: [],
    };
}

type MaybeNested<T> = T | MaybeNested<T>[];

const randId = () => Math.random().toString(36).slice(2);

function undo<T, An>(state: History<T, An>) {
    if (state.tip === state.root) return state;
    const node = state.nodes[state.tip];
    return {
        ...state,
        tip: node.pid,
        undoTrail: [state.tip, ...state.undoTrail],
        current: node.changes.toReversed().map(ops.invert).reduce(ops.apply, state.current),
    };
}

function redo<T, An>(state: History<T, An>) {
    if (!state.undoTrail.length) return state;
    const next = state.undoTrail[0];
    if (!next || !state.nodes[next]) {
        console.log(state);
        throw new Error(`weird state ${next}`);
    }
    return {
        ...state,
        undoTrail: state.undoTrail.slice(1),
        tip: next,
        current: state.nodes[next].changes.reduce(ops.apply, state.current),
    };
}

export const jump = <T, An>(state: History<T, An>, to: string): History<T, An> => {
    const split = splitPathToDestination(state, to);
    let current = split.up
        .flatMap((id) => state.nodes[id].changes.map(ops.invert).toReversed())
        .reduce(ops.apply, state.current);
    current = split.down.flatMap((id) => state.nodes[id].changes).reduce(ops.apply, current);
    return {...state, current, tip: to, undoTrail: []};
};

export const dispatch = <T, An>(
    state: History<T, An>,
    nested: {op: 'undo' | 'redo'} | MaybeNested<PendingJsonPatchOp<T>>,
    genId = randId,
): History<T, An> => {
    if (!Array.isArray(nested)) {
        if (nested.op === 'undo') {
            return undo(state);
        } else if (nested.op === 'redo') {
            return redo(state);
        }
    }

    const id = genId();
    const node = state.nodes[state.tip];

    const {current, changes} = resolveAndApply(
        state.current,
        nested as MaybeNested<PendingJsonPatchOp<T>>,
    );

    return {
        ...state,
        tip: id,
        nodes: {
            ...state.nodes,
            [id]: {id, pid: state.tip, changes, children: []},
            [node.id]: {...node, children: node.children.concat([id])},
        },
        undoTrail: [],
        current,
    };
};
