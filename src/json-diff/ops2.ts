import equal from 'fast-deep-equal';
import {_add, _get, _remove, _replace} from './internal2';
import {AddOp, JsonPatchOp, MoveOp, RemoveOp, ReplaceOp} from './helper2';

function add<T, V>(base: T, op: AddOp<V>) {
    return _add(base, op.path, op.value);
}
function remove<T, V>(base: T, op: RemoveOp<V>) {
    return _remove(base, op.path, op.value, equal);
}
function replace<T, V>(base: T, op: ReplaceOp<V>) {
    return _replace(base, op.path, op.previous, op.value, equal);
}
function move<T>(base: T, op: MoveOp<T>) {
    const value = _get(base, op.from);
    const removed = _remove(base, op.from, value, equal);
    return _add(removed, op.path, value);
}

function invert<T>(op: JsonPatchOp<T>): JsonPatchOp<T> {
    switch (op.op) {
        case 'add':
            return {op: 'remove', path: op.path, value: op.value} as JsonPatchOp<T>;
        case 'replace':
            return {...op, value: op.previous, previous: op.value};
        case 'remove':
            return {op: 'add', path: op.path, value: op.value} as JsonPatchOp<T>;
        case 'move':
            return {op: 'move', from: op.path, path: op.from} as JsonPatchOp<T>;
        case 'copy':
            throw new Error('not supporting these');
    }
}

function apply<T>(base: T, op: JsonPatchOp<T>) {
    switch (op.op) {
        case 'add':
            return add(base, op);
        case 'replace':
            return replace(base, op);
        case 'remove':
            return remove(base, op);
        case 'move':
            return move(base, op);
        case 'copy':
            throw new Error('not supporting these either');
    }
}

export const ops = {apply, invert};
