import {describe, it, expect} from 'bun:test';
import {_replace} from './internal2';
import equal from 'fast-deep-equal';

describe('_replace', () => {
    it('should work', () => {
        expect(_replace({name: 'one'}, [{type: 'key', key: 'name'}], 'one', 'two', equal)).toEqual({
            name: 'two',
        });
    });
    it('should work deeply', () => {
        expect(
            _replace(
                {a: {name: 'one'}},
                [
                    {type: 'key', key: 'a'},
                    {type: 'key', key: 'name'},
                ],
                'one',
                'two',
                equal,
            ),
        ).toEqual({
            a: {name: 'two'},
        });
    });
});
