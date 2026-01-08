import {_get} from './internal2';
import {diffBuilder, JsonPatchOp, PendingJsonPatchOp} from './helper2';
import {ops, rebase} from './ops2';
import {Extra} from './react';

export function fromPending<T, V, Tag extends PropertyKey, Extra>(
    base: T,
    pending: PendingJsonPatchOp<V, Tag, Extra>,
): JsonPatchOp<V> {
    switch (pending.op) {
        case 'add': {
            const prev = _get(base, pending.path);
            if (prev !== undefined) {
                throw new Error(`cant add whats already there`);
            }
            return pending;
        }
        case 'move':
        case 'copy':
            return pending;
        case 'replace': {
            const prev = _get(base, pending.path);
            if (prev === undefined) {
                return {...pending, op: 'add'};
            }
            return {...pending, previous: prev};
        }
        case 'remove': {
            const prev = _get(base, pending.path);
            if (prev === undefined) {
                throw new Error('nothing to remove');
            }
            return {...pending, value: _get(base, pending.path)};
        }
        case 'push': {
            const arr = _get(base, pending.path);
            if (!Array.isArray(arr)) {
                throw new Error('not an array');
            }
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

export const asFlat = <T>(v: MaybeNested<T>): T[] => asArray(v).flat() as T[];

export function resolveAndApply<T, Extra, Tag extends string = 'type'>(
    current: T,
    pending: MaybeNested<PendingJsonPatchOp<T, Tag, Extra>>,
    extra: Extra,
    tag: Tag,
): {current: T; changes: JsonPatchOp<T>[]} {
    const changes = asFlat(pending).flatMap((op) => {
        if (op.op === 'nested') {
            const value = _get(current, op.path);
            const inner = op.make(value, diffBuilder(tag, extra));
            const next = resolveAndApply<T, Extra, Tag>(
                current,
                asArray(inner).map((i) => rebase(i, op.path) as PendingJsonPatchOp<T, Tag, Extra>),
                extra,
                tag,
            );
            current = next.current;
            return next.changes;
        }
        try {
            const ready = fromPending(current, op);
            current = ops.apply(current, ready);
            return ready;
        } catch (err) {
            console.log('Tried to fromPending, but failed');
            console.log(current, op);
            throw err;
        }
    });
    return {current, changes};
}
