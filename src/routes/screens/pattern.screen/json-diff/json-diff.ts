// biome-ignore-all lint/suspicious/noExplicitAny : not doing it
import equal from 'fast-deep-equal';
import {
    AddOp,
    AddPath,
    AddPathValue,
    JsonPatch,
    JsonPatchOp,
    Path,
    PathValue,
    RemovablePath,
    RemoveOp,
    ReplaceOp,
} from './json-diff.typed';

export function add<T>(base: T, op: AddOp<T>) {
    return _add(base, parsePath(op.path), op.value);
}
export function remove<T>(base: T, op: RemoveOp<T>) {
    return _remove(base, parsePath(op.path), op.value, equal);
}
export function replace<T>(base: T, op: ReplaceOp<T>) {
    return _replace(base, parsePath(op.path), op.previous, op.value, equal);
}

export function get<T, P extends Path<T>>(value: T, at: P): PathValue<T, P> {
    return _get(value, parsePath(at));
}

export function makeRemove<T, P extends RemovablePath<T>>(base: T, at: P, value: PathValue<T, P>) {
    return {
        op: 'remove',
        path: at,
        value,
    } satisfies RemoveOp<T>;
}

export function makeAdd<T, P extends AddPath<T>>(base: T, at: P, value: AddPathValue<T, P>) {
    return {
        op: 'add',
        path: at,
        value,
    } satisfies AddOp<T>;
}

export function makeReplace<T, P extends Path<T>>(
    base: T,
    at: P,
    value: PathValue<T, P>,
): JsonPatchOp<T> {
    return {
        op: 'replace',
        path: at,
        value,
        previous: get(base, at),
    };
}

const parsePath = (at: string) =>
    at
        .split('/')
        .filter(Boolean)
        .map((p) => (Number.isInteger(+p) ? +p : p));

function _get(base: any, at: (number | string)[]) {
    for (let i = 0; i < at.length; i++) {
        const key = at[i];
        if (!base) {
            throw new Error(`missing base`);
        }
        if (Array.isArray(base)) {
            if (typeof key !== 'number') {
                throw new Error(`invalid key for array`);
            }
        } else if (typeof base !== 'object') {
            throw new Error(`base is not object`);
        }
        base = base[key];
    }
    return base;
}

function _getCloned(root: any, at: (number | string)[]) {
    root = Array.isArray(root) ? root.slice() : {...root};
    let base = root;
    for (let i = 0; i < at.length; i++) {
        const key = at[i];
        if (!base) {
            throw new Error(`missing base`);
        }
        if (Array.isArray(base)) {
            if (typeof key !== 'number') {
                throw new Error(`invalid key for array`);
            }
        } else if (typeof base !== 'object') {
            throw new Error(`base is not object`);
        }
        base[key] = Array.isArray(base[key]) ? base[key].slice() : {...base};
        base = base[key];
    }
    return {root, base};
}

function _replace(
    base: any,
    at: (number | string)[],
    previous: any,
    value: any,
    equal: (a: any, b: any) => boolean,
) {
    let root: any;
    ({root, base} = _getCloned(base, at.slice(0, -1)));
    const key = at[at.length - 1];
    if (Array.isArray(base)) {
        if (typeof key !== 'number') {
            throw new Error(`invalid key for array`);
        }
    } else if (typeof base !== 'object') {
        throw new Error(`base is not object`);
    }
    if (!equal(previous, base[key])) {
        throw new Error(`cannot apply, previous is different`);
    }
    base[key] = value;
    return root;
}

function _add(base: any, at: (number | string)[], value: any) {
    let root: any;
    ({root, base} = _getCloned(base, at.slice(0, -1)));
    const key = at[at.length - 1];
    if (Array.isArray(base)) {
        if (typeof key !== 'number') {
            throw new Error(`invalid key for array`);
        }
        base.splice(key, 0, value);
    } else if (typeof base !== 'object') {
        throw new Error(`base is not object`);
    } else if (key in base) {
        throw new Error(`key already exists, cannot add, must replace`);
    } else {
        base[key] = value;
    }
    return root;
}

function _remove(
    base: any,
    at: (number | string)[],
    value: any,
    equal: (a: any, b: any) => boolean,
) {
    let root: any;
    ({root, base} = _getCloned(base, at.slice(0, -1)));
    const key = at[at.length - 1];
    if (!equal(value, base[key])) {
        throw new Error(`remove, value not equal what's there`);
    }
    if (Array.isArray(base)) {
        if (typeof key !== 'number') {
            throw new Error(`invalid key for array`);
        }
        base.splice(key, 1);
    } else if (typeof base !== 'object') {
        throw new Error(`base is not object`);
    } else if (key in base) {
        throw new Error(`key already exists, cannot add, must replace`);
    } else {
        delete base[key];
    }
    return root;
}
