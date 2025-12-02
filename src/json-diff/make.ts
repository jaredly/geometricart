import {_get, parsePath} from './internal';
import {
    AddOp,
    AddPath,
    AddPathValue,
    JsonPatchOp,
    Path,
    PathValue,
    PendingJsonPatchOp,
    RemovablePath,
    RemoveOp,
} from './types';

function remove<T, P extends RemovablePath<T>>(base: T, at: P) {
    return {
        op: 'remove',
        path: at,
        value: _get(base, parsePath(at)),
    } satisfies RemoveOp<T>;
}

function add<T, P extends AddPath<T>>(_: T, at: P, value: AddPathValue<T, P>) {
    return {
        op: 'add',
        path: at,
        value,
    } satisfies AddOp<T>;
}

function replace<T, P extends Path<T>>(base: T, at: P, value: PathValue<T, P>): JsonPatchOp<T> {
    return {
        op: 'replace',
        path: at,
        value,
        previous: _get(base, parsePath(at)),
    };
}

function update<T, P extends Path<T>>(base: T, path: P, update: Partial<PathValue<T, P>>) {
    const current: PathValue<T, P> = _get(base, parsePath(path));
    return Object.entries(update).map(([key, value]) =>
        value === undefined
            ? {op: 'remove', path: `${path}/${key}`, value: current[key as keyof typeof current]}
            : {
                  op: 'replace',
                  path: `${path}/${key}`,
                  previous: current[key as keyof typeof current],
                  value,
              },
    ) as JsonPatchOp<T>[];
}

function fromPending<T>(base: T, pending: PendingJsonPatchOp<T>): JsonPatchOp<T> {
    switch (pending.op) {
        case 'add':
        case 'move':
        case 'copy':
            return pending;
        case 'replace':
            return {...pending, previous: _get(base, parsePath(pending.path))};
        case 'remove':
            return {...pending, value: _get(base, parsePath(pending.path))};
        case 'push': {
            const arr = _get(base, parsePath(pending.path));
            return {
                op: 'add',
                path: `${pending.path}/${arr.length}`,
                value: pending.value,
            } as JsonPatchOp<T>;
        }
    }
}

export const make = {remove, add, replace, update, fromPending};
