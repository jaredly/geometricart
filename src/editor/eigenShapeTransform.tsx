import {closeEnough} from '../rendering/epsilonToZero';
import {
    Matrix,
    scaleMatrix,
    angleTo,
    rotationMatrix,
    translationMatrix,
    dist,
} from '../rendering/getMirrorTransforms';
import {angleBetween} from '../rendering/isAngleBetween';
import {TilingShape, Coord} from '../types';
import {boxShapeTransform, calcHexTransform} from './tilingTransforms';

export const findHc = ({x, y}: Coord, tr: Coord) => {
    return {
        x: x * tr.x * 3,
        y: -tr.y * (y - (x % 2 === 0 ? 0 : 0.5)) * 2,
    };
};

export function xyratio(shape: TilingShape, tr: Coord) {
    if (shape.type === 'parallellogram') {
        return tr.x / tr.y;
    }
    if (closeEnough(tr.y, -1 / Math.sqrt(3))) {
        return tr.x / tr.y;
    }

    if (shape.type === 'right-triangle') {
        let internalAngle =
            angleBetween(
                angleTo(shape.start, shape.corner),
                angleTo(shape.start, shape.end),
                true,
            ) /
            Math.PI /
            2;

        if (internalAngle > 0.5) {
            internalAngle = 1 - internalAngle;
        }

        if (closeEnough(internalAngle, 1 / 16)) {
            return 1;
        }

        if (!shape.rotateHypotenuse) {
            for (let j = 5; j < 10; j++) {
                if (closeEnough(internalAngle, 1 / (j * 2))) {
                    return 1;
                }
            }
        }
    }
    return tr.x / tr.y;
}

export function eigenShapeTransform(
    shape: TilingShape,
    tr: Coord,
    tpts: Coord[],
    size: Coord,
): Matrix[][][] {
    if (shape.type === 'parallellogram') {
        return boxShapeTransform(tr, size);
    } else if (closeEnough(tr.y, -1 / Math.sqrt(3))) {
        // HEX
        const next: Matrix[][] = calcHexTransform(size, tr);
        return [[[scaleMatrix(1, -1)]], next, [[scaleMatrix(-1, 1)]], [[scaleMatrix(1, -1)]]];
    } else if (shape.type === 'right-triangle') {
        let internalAngle =
            angleBetween(
                angleTo(shape.start, shape.corner),
                angleTo(shape.start, shape.end),
                true,
            ) /
            Math.PI /
            2;

        if (internalAngle > 0.5) {
            internalAngle = 1 - internalAngle;
        }

        if (closeEnough(internalAngle, 1 / 16)) {
            return [
                [
                    [rotationMatrix(-Math.PI / 4)],
                    //
                    [scaleMatrix(1, -1), rotationMatrix(-Math.PI / 4)],
                    [scaleMatrix(1, -1), rotationMatrix(-Math.PI / 2)],
                ],
                ...boxShapeTransform({x: tr.x, y: -tr.x}, size),
            ];
        }

        if (!shape.rotateHypotenuse) {
            for (let j = 5; j < 10; j++) {
                if (closeEnough(internalAngle, 1 / (j * 2))) {
                    const mx: Matrix[][][] = [];
                    mx.push([[scaleMatrix(1, -1)]]);
                    mx.push([]);
                    for (let i = 1; i < j; i++) {
                        mx[mx.length - 1].push([rotationMatrix((i / j) * Math.PI * 2)]);
                    }
                    mx.push([[scaleMatrix(-1, 1), translationMatrix({x: tr.x * 2, y: 0})]]);
                    mx.push([[translationMatrix({y: -tr.x * 2, x: 0})]]);
                    mx.push(
                        ...boxShapeTransform({x: tr.x, y: tr.x}, {x: size.x - 2, y: size.y - 2}),
                    );
                    return mx;
                }
            }
        }

        if (closeEnough(internalAngle, 0.125) && !shape.rotateHypotenuse) {
            return [
                [[scaleMatrix(-1, 1), rotationMatrix(Math.PI / 2)]],
                ...boxShapeTransform(tr, size),
            ];
        }

        const mx: Matrix[][][] = [[[rotationMatrix(-Math.PI), translationMatrix(tr)]]];
        return [...mx, ...boxShapeTransform(tr, size)];
    } else {
        const [a, b, c] = tpts;
        const d1 = dist(a, b);
        const d2 = dist(b, c);
        const d3 = dist(a, c);
        // Equilateral triangle
        if (closeEnough(d1, d2) && closeEnough(d2, d3)) {
            const res: Matrix[][] = [];
            const x0 = size.x * 2;
            const y0 = size.y * 2;
            for (let x = -x0; x <= x0; x++) {
                for (let y = -y0; y <= y0 + 1; y++) {
                    const at = findHexPos(x, y);
                    const flip = at.t % 2 === 1;
                    const hc = findHc(at.c, tr);
                    if (flip) {
                        res.push([
                            scaleMatrix(1, -1),
                            rotationMatrix(((at.t - 3) * Math.PI) / 3),
                            translationMatrix(hc),
                        ]);
                    } else {
                        res.push([
                            rotationMatrix(((at.t - 2) * Math.PI) / 3),
                            translationMatrix(hc),
                        ]);
                    }
                }
            }

            return [res];
        }
    }

    return [];
}
const pod = (a: number, b: number) => {
    const res = a % b;
    return res < 0 ? res + b : res;
};
const even = (a: number) => a % 2 === 0;

export const findHexPos = (x: number, y: number): {c: Coord; t: number} => {
    /*
-1 0 1  2 3 4  5 6 7  8 9 0
 6 1 2  5 4 3  6 1 2  5 4 3
 5 4 3  6 1 2  5 4 3  6 1 2
    */
    // 6, 0
    const cx = Math.floor((x + 1) / 3); // 2
    const up = even(cx) === even(y); // UP
    const t = (up ? [6, 1, 2] : [5, 4, 3])[pod(x + 1, 3)];

    // const t = [1, 2, 5, 4, 3, 6][(x + (y % 2 === 0 ? 0 : 3)) % 6];
    const c = {x: cx, y: Math.floor(y / 2) + (up && cx % 2 !== 0 ? 1 : 0)};
    // console.log({cx, up, c});

    // if (x === 0 && y === 0) {
    //     return {c: {x:0,y:0}, t: 0}
    // }
    // if (x === 1 && y === 0) {
    //     return {c: {x:0,y:0}, t: 1}
    // }
    return {c, t};
};
