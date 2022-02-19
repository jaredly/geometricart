import { untangleHit, SegmentIntersection } from './untangleHit';

const si = (
    theta: number,
    enter: boolean,
    exit: boolean,
    id: number,
): SegmentIntersection => ({ theta, enter, exit, distance: 0, segment: 0, id });

const N = -Math.PI / 2;
const E = 0;
const W = Math.PI;
const S = Math.PI / 2;
const NE = -Math.PI / 4;
const SE = Math.PI / 4;
const NW = (-Math.PI * 3) / 4;
const SW = (Math.PI * 3) / 4;

describe('untangleHit', () => {
    it.each([
        // very basic
        [[si(N, true, true, 0)], [[0, 0]]],
        // X
        [
            [si(N, true, true, 0), si(E, true, true, 1)],
            [
                [1, 0],
                [0, 1],
            ],
        ],
        // off
        [
            [
                si(E, true, true, 0),
                si(NW, true, false, 1),
                si(SW, false, true, 2),
            ],
            [
                [1, 0],
                [0, 2],
            ],
        ],
        // off
        [
            [
                si(E, true, true, 0),
                si(NE, true, false, 1),
                si(SE, false, true, 2),
            ],
            [
                [0, 0],
                [1, 2],
            ],
        ],
    ])('should work', (entries, pairs) => {
        expect(untangleHit(entries).map(([a, b]) => [a.id, b.id])).toEqual(
            pairs,
        );
    });
});
