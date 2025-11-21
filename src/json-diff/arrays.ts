export type ArrayDelete<T> = {
    type: 'delete';
    from: number;
    value: T;
};

export type ArrayInsert<T> = {
    type: 'insert';
    at: number;
    value: T;
};

export type ArrayMove<T> = {
    type: 'move';
    from: number;
    to: number;
    value: T;
};

export type ArrayEdit<T> = ArrayDelete<T> | ArrayInsert<T> | ArrayMove<T>;

/**
 * Diff two arrays by identity (===) of their elements.
 *
 * Produces a sequence of deletes, inserts, and moves that turn `first` into `second`.
 * Indexes are relative to the in-progress working array if ops are applied in order.
 */
export function diffByIdentity<T>(first: T[], second: T[]): ArrayEdit<T>[] {
    const neededCount = new Map<T, number>();
    second.forEach((item) => neededCount.set(item, (neededCount.get(item) ?? 0) + 1));
    const working = [...first];
    const ops: ArrayEdit<T>[] = [];

    // Remove extra occurrences while keeping the earliest ones.
    const seenCount = new Map<T, number>();
    const deleteIndices: number[] = [];
    for (let i = 0; i < working.length; i++) {
        const item = working[i];
        const needed = neededCount.get(item) ?? 0;
        const seen = (seenCount.get(item) ?? 0) + 1;
        seenCount.set(item, seen);
        if (seen > needed) deleteIndices.push(i);
    }
    for (let i = deleteIndices.length - 1; i >= 0; i--) {
        const idx = deleteIndices[i];
        const item = working[idx];
        working.splice(idx, 1);
        ops.push({type: 'delete', from: idx, value: item});
    }

    // Walk target order, moving or inserting as needed.
    for (let target = 0; target < second.length; target++) {
        const desired = second[target];
        const current = working[target];

        if (current === desired) continue;

        const found = working.findIndex((item, idx) => idx > target && item === desired);

        if (found !== -1) {
            const [item] = working.splice(found, 1);
            working.splice(target, 0, item);
            ops.push({type: 'move', from: found, to: target, value: item});
        } else {
            working.splice(target, 0, desired);
            ops.push({type: 'insert', at: target, value: desired});
        }
    }

    return ops;
}

export const apply = <T extends object>(source: T[], edits: ArrayEdit<T>[]) => {
    const arr = [...source];
    edits.forEach((op) => {
        switch (op.type) {
            case 'delete':
                arr.splice(op.from, 1);
                break;
            case 'move': {
                const [item] = arr.splice(op.from, 1);
                arr.splice(op.to, 0, item);
                break;
            }
            case 'insert':
                arr.splice(op.at, 0, op.value);
                break;
        }
    });
    return arr;
};
