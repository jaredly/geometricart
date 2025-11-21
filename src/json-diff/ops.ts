import equal from 'fast-deep-equal';
import {_add, _get, _remove, _replace, parsePath} from './internal';
import {AddOp, JsonPatchOp, Path, PathValue, RemoveOp, ReplaceOp} from './types';

function add<T>(base: T, op: AddOp<T>) {
    return _add(base, parsePath(op.path), op.value);
}
function remove<T>(base: T, op: RemoveOp<T>) {
    return _remove(base, parsePath(op.path), op.value, equal);
}
function replace<T>(base: T, op: ReplaceOp<T>) {
    return _replace(base, parsePath(op.path), op.previous, op.value, equal);
}
function get<T, P extends Path<T>>(value: T, at: P): PathValue<T, P> {
    return _get(value, parsePath(at));
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
        case 'copy':
            throw new Error('not supporting these');
        case 'test':
            return op as JsonPatchOp<T>;
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
        case 'copy':
            throw new Error('not supporting these either');
        case 'test':
            return base;
    }
}

export const ops = {add, remove, replace, get, invert, apply};
