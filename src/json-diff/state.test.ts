import {test, expect, describe, it} from 'bun:test';
import {AddPath, AddPathValue, Path, PathValue, RemovablePath} from './types';
import {fromPending} from './make2';
import {ops} from './ops2';
import {initialState, redo, State, undo, update} from './state';

type T = {name: string; pets: Record<string, number>; age?: number; stars: number[]};

const v = (v: T) => ({type: 'expect' as const, v});
const m = (p: RemovablePath<T>) => (v: T) => {
    // make.remove(v, p);
    throw new Error('no');
};
const a =
    <P extends AddPath<T>>(p: AddPath<T>, n: AddPathValue<T, P>) =>
    (v: T) => {
        throw new Error('no');

        // make.add(v, p, n);
    };
const r =
    <P extends AddPath<T>>(p: Path<T>, n: PathValue<T, P>) =>
    (v: T) => {
        throw new Error('no');

        // make.replace(v, p, n);
    };

const ud = {type: 'undo' as const};
const rd = {type: 'redo' as const};
const initial: T = {name: 'Jo', pets: {}, stars: []};
const fx = [
    v(initial),
    r('/age', 5),
    v({...initial, age: 5}),
    a('/pets/scot', 3),
    a('/pets/bla', 1),
    v({...initial, age: 5, pets: {scot: 3, bla: 1}}),
    m('/pets/bla'),
    v({...initial, age: 5, pets: {scot: 3}}),
    a('/stars/0', 1),
    a('/stars/1', 2),
    a('/stars/2', 3),
    v({...initial, age: 5, pets: {scot: 3}, stars: [1, 2, 3]}),
    m('/stars/1'),
    v({...initial, age: 5, pets: {scot: 3}, stars: [1, 3]}),
];
const fxu = [
    ...fx,
    ud,
    v({...initial, age: 5, pets: {scot: 3}, stars: [1, 2, 3]}),
    ud,
    v({...initial, age: 5, pets: {scot: 3}, stars: [1, 2]}),
    ud,
    v({...initial, age: 5, pets: {scot: 3}, stars: [1]}),
    rd,
    rd,
    v({...initial, age: 5, pets: {scot: 3}, stars: [1, 2, 3]}),
    rd,
    v({...initial, age: 5, pets: {scot: 3}, stars: [1, 3]}),
    rd,
    rd,
    v({...initial, age: 5, pets: {scot: 3}, stars: [1, 3]}),
];

describe('the whole shebang', () => {
    it('should work (basic)', () => {
        let value = initial;
        for (let f of fx) {
            if (typeof f === 'function') {
                const op = f(value);
                value = ops.apply<T>(value, op);
            } else {
                expect(value).toEqual(f.v);
            }
        }
    });

    it('should work (state)', () => {
        let state: State<T> = initialState(initial);
        for (let f of fxu) {
            if (typeof f === 'function') {
                const op = f(state.value);
                state = update<T>(state, [op]);
            } else if (f.type === 'undo') {
                state = undo<T>(state);
            } else if (f.type === 'redo') {
                state = redo<T>(state);
            } else {
                expect(state.value).toEqual(f.v);
            }
        }
    });
});
