import {describe, expect, it} from 'bun:test';
import {diffBuilder, getExtra, getPath} from './helper2';
import {resolveAndApply} from './make2';

type Item = {name: string};
type OneOrMany = Item | Item[];

const builder = diffBuilder<OneOrMany, null>('type', null);
const moveBuilder = diffBuilder<{items: string[]; map: Record<string, number>}, string>(
    'type',
    'hello',
);

describe('helper2 path', () => {
    it('gets the path out', () => {
        expect(getPath(moveBuilder.items[2])).toEqual([
            {type: 'key', key: 'items'},
            {type: 'key', key: 2},
        ]);
    });
});

describe('helper2 extr', () => {
    it('gets the extra', () => {
        expect(getExtra(moveBuilder.items[2])).toEqual('hello');
    });
});

describe('helper2 single()', () => {
    it('refines to the single branch and updates nested keys', () => {
        const op = builder.single(true).name.replace('two');

        expect(op.path).toEqual([
            {type: 'single', isSingle: true},
            {type: 'key', key: 'name'},
        ]);

        const result = resolveAndApply<OneOrMany>({name: 'one'}, op);
        expect(result.current).toEqual({name: 'two'});
        expect(result.changes[0].path).toEqual(op.path);
    });

    it('refines to the array branch and pushes a new element', () => {
        const op = builder.single(false).push({name: 'two'});

        const result = resolveAndApply<OneOrMany>([{name: 'one'}], op);
        expect(result.current).toEqual([{name: 'one'}, {name: 'two'}]);
        expect(result.changes[0].path).toEqual([
            {type: 'single', isSingle: false},
            {type: 'key', key: 1},
        ]);
    });

    it('wraps a single value when accessing the array branch', () => {
        const op = builder.single(false).push({name: 'two'});

        const result = resolveAndApply<OneOrMany>({name: 'one'}, op);
        expect(result.current).toEqual([{name: 'one'}, {name: 'two'}]);
        expect(result.changes[0].path).toEqual([
            {type: 'single', isSingle: false},
            {type: 'key', key: 1},
        ]);
    });

    it('treats array access via single(true) as the first element', () => {
        const op = builder.single(true).name.replace('two');

        const result = resolveAndApply<OneOrMany>([{name: 'one'}, {name: 'three'}], op);
        expect(result.current).toEqual([{name: 'two'}, {name: 'three'}]);
        expect(result.changes[0].path).toEqual([
            {type: 'single', isSingle: true},
            {type: 'key', key: 'name'},
        ]);
    });

    it('updates an existing element inside the array branch', () => {
        const op = builder.single(false)[0].name.replace('two');

        const result = resolveAndApply<OneOrMany>([{name: 'one'}], op);
        expect(result.current).toEqual([{name: 'two'}]);
        expect(result.changes[0].path).toEqual([
            {type: 'single', isSingle: false},
            {type: 'key', key: 0},
            {type: 'key', key: 'name'},
        ]);
    });
});

describe('helper2 move()', () => {
    it('reorders array items', () => {
        const op = moveBuilder.items.move(0, 2);

        expect(op).toMatchObject({
            from: [
                {type: 'key', key: 'items'},
                {type: 'key', key: 0},
            ],
        });
        expect(op.path).toEqual([
            {type: 'key', key: 'items'},
            {type: 'key', key: 2},
        ]);

        const result = resolveAndApply<{items: string[]; map: Record<string, number>}>(
            {items: ['a', 'b', 'c'], map: {a: 1, b: 2}},
            op,
        );
        expect(result.current.items).toEqual(['b', 'c', 'a']);
    });

    it('moves object keys', () => {
        const op = moveBuilder.map.move('a', 'c');

        const result = resolveAndApply<{items: string[]; map: Record<string, number>}>(
            {items: [], map: {a: 1, b: 2}},
            op,
        );
        expect(result.current.map).toEqual({b: 2, c: 1});
        expect(result.changes[0]).toMatchObject({
            op: 'move',
            from: [
                {type: 'key', key: 'map'},
                {type: 'key', key: 'a'},
            ],
            path: [
                {type: 'key', key: 'map'},
                {type: 'key', key: 'c'},
            ],
        });
    });
});
