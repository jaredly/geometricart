import {_get} from './internal2';
import {diffBuilder, JsonPatchOp, PendingJsonPatchOp} from './helper2';
import {ops, rebase} from './ops2';

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
        case 'nested': {
            throw new Error(`Nested needs to be resolved before calling fromPending`);
        }
    }
}

const asArray = <V>(v: V | V[]): V[] => (Array.isArray(v) ? v : [v]);
export type MaybeNested<T> = T | MaybeNested<T>[];

const asFlat = <T>(v: MaybeNested<T>): T[] => asArray(v).flat() as T[];

export function resolveAndApply<T>(
    current: T,
    pending: MaybeNested<PendingJsonPatchOp<T>>,
    tag = 'type',
): {current: T; changes: JsonPatchOp<T>[]} {
    const changes = asFlat(pending).flatMap((op) => {
        if (op.op === 'nested') {
            const value = _get(current, op.path);
            const inner = op.make(value, diffBuilder(tag));
            const next = resolveAndApply<T>(
                current,
                asArray(inner).map((i) => rebase(i, op.path) as PendingJsonPatchOp<T>),
                tag,
            );
            current = next.current;
            return next.changes;
        }
        const ready = fromPending(current, op);
        current = ops.apply(current, ready);
        return ready;
    });
    return {current, changes};
}
