import {Orderable, OrderItem} from '../export-types';

export const nextOrder = (prev: number, next: number, entries: {order: number}[]) => {
    if (next === 0) {
        return entries[0].order - 10;
    }
    if (next >= entries.length - 1) {
        return entries[entries.length - 1].order + 10;
    }
    const [left, right] = prev < next ? [next, next + 1] : [next - 1, next];
    return (entries[left].order + entries[right].order) / 2;
};

export const maxOrder = <T extends OrderItem>(t: Orderable<T>) =>
    Object.values(t).reduce((a, b) => Math.max(a, b.order), 0);

export const orderedIds = (items: Record<string, number>) =>
    Object.entries(items)
        .sort(([, a], [, b]) => a - b)
        .map((a) => a[0]);

export const orderedItems = <T extends OrderItem>(t: Orderable<T>) =>
    Object.entries(t)
        .sort(([, a], [, b]) => a.order - b.order)
        .map((a) => a[1]);
