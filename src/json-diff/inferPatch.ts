import {diffByIdentity} from './arrays';
import {JsonPatch, JsonPatchOp, Path} from './types';

/**
 * Deeply compares two objects, finding the minimal patch to go from
 * one to the other.
 * For objects, it compares each key, creating add/remove for missing or new keys.
 * For keys that match but have values that !==, it recurses into them.
 * For arrays, use the `diffByIdentity` algorithm to determine the easiest
 * way to get from one to the other.
 */
export function inferPatch<T>(pre: T, post: T): JsonPatchOp<T>[] {
    const ops: JsonPatchOp<T>[] = [];

    const walk = (a: any, b: any, path: string) => {
        if (a === b) return;

        // Arrays: diff by identity to find deletes/inserts/moves.
        if (Array.isArray(a) && Array.isArray(b)) {
            const edits = diffByIdentity(a, b);
            edits.forEach((edit) => {
                if (edit.type === 'delete') {
                    ops.push({
                        op: 'remove',
                        path: `${path}/${edit.from}` as Path<T>,
                        value: edit.value,
                    } as JsonPatchOp<T>);
                } else if (edit.type === 'insert') {
                    ops.push({
                        op: 'add',
                        path: `${path}/${edit.at}` as Path<T>,
                        value: edit.value,
                    } as JsonPatchOp<T>);
                } else {
                    // move -> remove + insert at target
                    ops.push({
                        op: 'remove',
                        path: `${path}/${edit.from}` as Path<T>,
                        value: a[edit.from],
                    } as JsonPatchOp<T>);
                    ops.push({
                        op: 'add',
                        path: `${path}/${edit.to}` as Path<T>,
                        value: b[edit.to],
                    } as JsonPatchOp<T>);
                }
            });
            return;
        }

        // Objects: compare keys
        if (a && b && typeof a === 'object' && typeof b === 'object') {
            const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
            keys.forEach((key) => {
                const aHas = Object.hasOwn(a, key);
                const bHas = Object.hasOwn(b, key);
                const nextPath = `${path}/${key}`;
                if (aHas && !bHas) {
                    ops.push({
                        op: 'remove',
                        path: nextPath as Path<T>,
                        value: a[key],
                    } as JsonPatchOp<T>);
                } else if (!aHas && bHas) {
                    ops.push({
                        op: 'add',
                        path: nextPath as Path<T>,
                        value: b[key],
                    } as JsonPatchOp<T>);
                } else if (aHas && bHas) {
                    walk(a[key], b[key], nextPath);
                }
            });
            return;
        }

        // Fallback: replace
        ops.push({
            op: 'replace',
            path: path as Path<T>,
            previous: a,
            value: b,
        });
    };

    walk(pre, post, '');
    return ops;
}
