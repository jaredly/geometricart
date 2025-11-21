import {describe, it, expect} from 'bun:test';
import {diffByIdentity, apply} from './arrays';

type Item = {name: string};
const a: Item = {name: 'A'};
const b: Item = {name: 'B'};
const c: Item = {name: 'C'};

describe('diffByIdentity', () => {
    it('reorders and keeps duplicates', () => {
        const first = [a, a, b];
        const second = [a, b, a];
        const edits = diffByIdentity(first, second);
        expect(apply(first, edits)).toEqual(second);
        expect(edits.some((e) => e.type === 'move')).toBeTrue();
    });

    it('removes extra occurrences', () => {
        const first = [a, a, a];
        const second = [a, a];
        const edits = diffByIdentity(first, second);
        expect(apply(first, edits)).toEqual(second);
        expect(edits.filter((e) => e.type === 'delete').length).toBe(1);
    });

    it('inserts missing occurrences', () => {
        const first = [a, b];
        const second = [a, b, a];
        const edits = diffByIdentity(first, second);
        expect(apply(first, edits)).toEqual(second);
        expect(edits.some((e) => e.type === 'insert')).toBeTrue();
    });
});
