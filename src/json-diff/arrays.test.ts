import {describe, it, expect} from 'bun:test';
import {diffById} from './arrays';
import {apply} from './arrays';

type Item = {id: string; name: string};
const a: Item = {id: 'a', name: 'A'};
const b: Item = {id: 'b', name: 'B'};
const c: Item = {id: 'c', name: 'C'};

describe('diffById', () => {
    it('reorders and keeps duplicates', () => {
        const first = [a, a, b];
        const second = [a, b, a];
        const edits = diffById(first, second);
        expect(apply(first, edits)).toEqual(second);
        expect(edits.some((e) => e.type === 'move')).toBeTrue();
    });

    it('removes extra occurrences', () => {
        const first = [a, a, a];
        const second = [a, a];
        const edits = diffById(first, second);
        expect(apply(first, edits)).toEqual(second);
        expect(edits.filter((e) => e.type === 'delete').length).toBe(1);
    });

    it('inserts missing occurrences', () => {
        const first = [a, b];
        const second = [a, b, a];
        const edits = diffById(first, second);
        expect(apply(first, edits)).toEqual(second);
        expect(edits.some((e) => e.type === 'insert')).toBeTrue();
    });
});
