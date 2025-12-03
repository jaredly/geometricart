import {_get} from './internal2';
import {JsonPatchOp, PendingJsonPatchOp} from './helper2';

export function fromPending<T, V>(base: T, pending: PendingJsonPatchOp<V>): JsonPatchOp<V> {
    switch (pending.op) {
        case 'add':
        case 'move':
        case 'copy':
            return pending;
        case 'replace':
            return {...pending, previous: _get(base, pending.path)};
        case 'remove':
            return {...pending, value: _get(base, pending.path)};
        case 'push': {
            const arr = _get(base, pending.path);
            return {
                op: 'add',
                path: [...pending.path, {type: 'key', key: arr.length}],
                value: pending.value,
            } as JsonPatchOp<V>;
        }
    }
}
