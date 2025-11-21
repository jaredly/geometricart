import {describe, expect, it} from 'bun:test';
import {inferPatch} from './inferPatch';
import {ops} from './ops';

const applyPatch = <T>(start: T, patch: ReturnType<typeof inferPatch<T>>) =>
    patch.reduce((value, op) => ops.apply(value, op as any), start);

describe('inferPatch', () => {
    it('replaces primitives', () => {
        const patch = inferPatch(1, 2);
        expect(applyPatch(1, patch)).toEqual(2);
    });

    it('adds and removes object properties', () => {
        const pre = {name: 'Ada', age: 10};
        const post = {name: 'Ada', city: 'London'};
        type T = {name: string; age?: number; city?: string};
        const patch = inferPatch<T>(pre, post);
        expect(applyPatch<T>(pre, patch)).toEqual(post);
    });

    it('handles array edits by identity', () => {
        const pre = [1, 2, 2];
        const post = [2, 1, 2, 2];
        const patch = inferPatch(pre, post);
        expect(applyPatch(pre, patch)).toEqual(post);
    });
});
