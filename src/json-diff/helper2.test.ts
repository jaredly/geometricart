import {describe, expect, it} from 'bun:test';
import {diffBuilder} from './helper2';
import {resolveAndApply} from './make2';

type Item = {name: string};
type OneOrMany = Item | Item[];

const builder = diffBuilder<OneOrMany>('type');

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
        expect(result.current).toEqual([
            {name: 'one'},
            {name: 'two'},
        ]);
        expect(result.changes[0].path).toEqual([
            {type: 'single', isSingle: false},
            {type: 'key', key: 1},
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

    it('throws when the refinement does not match the actual shape', () => {
        const op = builder.single(true).name.replace('two');
        expect(() => resolveAndApply<OneOrMany>([{name: 'one'}], op)).toThrow(
            'Expected a single value',
        );
    });
});
