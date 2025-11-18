import {Coord} from '../types';
import {findHc, findHexPos} from './eigenShapeTransform';

//
const expectedT = [
    // -2 through 10
    [2, 5, 4, 3, 6, 1, 2, 5, 4, 3, 6, 1, 2],
    [3, 6, 1, 2, 5, 4, 3, 6, 1, 2, 5, 4, 3],
    [2, 5, 4, 3, 6, 1, 2, 5, 4, 3, 6, 1, 2],
    [3, 6, 1, 2, 5, 4, 3, 6, 1, 2, 5, 4, 3],
];

const expectedH = [
    //
    [10, 8, 8, 8, 1, 1, 1, 9, 9, 9, 3, 3, 3],
    [10, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3],
    [11, 0, 0, 0, 4, 4, 4, 2, 2, 2, 5, 5, 5],
    [11, 6, 6, 6, 4, 4, 4, 7, 7, 7, 5, 5, 5],
];

const centers = [
    {x: 0, y: 0}, // 0
    {x: 1, y: 0},
    {x: 2, y: 0}, // 2
    {x: 3, y: 0},
    {x: 1, y: 1}, // 4
    {x: 3, y: 1},
    {x: 0, y: 1}, // 6
    {x: 2, y: 1},
    {x: 0, y: -1}, // 8
    {x: 2, y: -1},
    {x: -1, y: 0}, // 10
    {x: -1, y: 1},
];

const cx = [
    {x: 0, y: 0},
    {x: 3, y: -1},
    {x: 6, y: 0},
    {x: 9, y: -1},
    {x: 3, y: 1},
    {x: 9, y: 1},
    {x: 0, y: 2},
    {x: 6, y: 2},
    {x: 0, y: -2},
    {x: 6, y: -2},
    {x: -3, y: -1}, // 10
    {x: -3, y: 1},
];

centers.forEach((c, i) => {
    test(`${c.x},${c.y} c real`, () => {
        expect(findHc(c, {x: 1, y: -1})).toEqual(cx[i]);
    });
});

const findH = (c: Coord) => centers.findIndex((e) => e.x === c.x && e.y === c.y);

for (let x = -2; x <= 10; x++) {
    for (let y = -1; y <= 1; y++) {
        // if (x !== -2 || y !== -1) continue;
        test(`${x},${y} center`, () => {
            const h = expectedH[y + 1][x + 2];
            // expect(findH(findHexPos(x, y).c)).toEqual(h);
            expect(findHexPos(x, y).c).toEqual(centers[h]);
        });

        test(`${x},${y} t`, () => {
            const t = expectedT[y + 1][x + 2];
            expect(findHexPos(x, y).t).toEqual(t);
        });
    }
}
