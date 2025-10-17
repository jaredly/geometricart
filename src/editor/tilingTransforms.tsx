import {Coord, TilingShape} from '../types';
import {closeEnough} from '../rendering/epsilonToZero';
import {
    Matrix,
    angleTo,
    dist,
    rotationMatrix,
    scaleMatrix,
    translationMatrix,
} from '../rendering/getMirrorTransforms';
import {angleBetween} from '../rendering/isAngleBetween';
import {transformLines} from './tilingPoints';

export function replicateStandard(ty: number): Matrix[][][] {
    return [
        [[scaleMatrix(-1, 1), translationMatrix({x: 2, y: 0})]],
        [[scaleMatrix(1, -1), translationMatrix({x: 0, y: ty * 2})]],
        [[scaleMatrix(1, -1)]],
        [[scaleMatrix(-1, 1)]],
    ];
}

export function tilingTransforms(shape: TilingShape, tr: Coord, tpts: Coord[]): Matrix[][][] {
    if (tpts.length === 4) {
        return [
            [[scaleMatrix(-1, 1), translationMatrix({x: tr.x * 2, y: 0})]],
            [[scaleMatrix(-1, 1)]],
            [
                [scaleMatrix(1, -1)],
                [translationMatrix({x: 0, y: -tr.y * 2})],
                [translationMatrix({x: 0, y: -tr.y * 2}), scaleMatrix(1, -1)],
            ],
        ];
    } else if (shape.type === 'right-triangle' && shape.rotateHypotenuse) {
        return [[[rotationMatrix(Math.PI), translationMatrix(tr)]], ...replicateStandard(tr.y)];
    } else if (closeEnough(tr.y, -1 / Math.sqrt(3))) {
        return [
            [[scaleMatrix(1, -1), rotationMatrix(-(Math.PI / 3))]],
            [
                [scaleMatrix(1, -1), rotationMatrix(-(Math.PI / 3) * 2)],
                [scaleMatrix(1, -1), rotationMatrix(-Math.PI)],
            ],
            [[scaleMatrix(1, -1)]],
            [0, 1, 2, 3, 4, 5].map((i) => [
                translationMatrix({x: 2, y: 0}),
                rotationMatrix((Math.PI / 3) * i),
            ]),
        ];
    } else if (shape.type === 'right-triangle') {
        // start == origin
        // corner === on the x axis
        // end === the final whatsit
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

        const mx: Matrix[][][] = [];

        for (let j = 5; j < 10; j++) {
            if (closeEnough(internalAngle, 1 / (j * 2))) {
                mx.push([[scaleMatrix(1, -1)]]);
                mx.push([]);
                for (let i = 1; i < j; i++) {
                    mx[mx.length - 1].push([rotationMatrix((i / 8) * Math.PI * 2)]);
                }
                return mx;
            }
        }

        mx.push([[scaleMatrix(1, -1), rotationMatrix(-Math.PI / 2)]]);
        return [...mx, ...replicateStandard(tr.y)];
    } else {
        const [a, b, c] = tpts;
        const d1 = dist(a, b);
        const d2 = dist(b, c);
        const d3 = dist(a, c);
        // Equilateral triangle
        if (closeEnough(d1, d2) && closeEnough(d2, d3)) {
            if (shape.type === 'isocelese' && shape.flip) {
                return [
                    [
                        [
                            scaleMatrix(-1, 1),
                            rotationMatrix(-Math.PI / 3),
                            translationMatrix({x: tr.x * 3, y: tr.y}),
                        ],
                        [
                            rotationMatrix((Math.PI * 2) / 3),
                            translationMatrix({x: tr.x * 3, y: tr.y}),
                        ],
                        [
                            rotationMatrix((-Math.PI * 2) / 3),
                            translationMatrix({x: tr.x * 3, y: tr.y}),
                        ],
                    ],
                    [
                        [scaleMatrix(-1, 1), rotationMatrix(Math.PI / 3)],
                        [scaleMatrix(-1, 1), rotationMatrix(Math.PI)],
                        [scaleMatrix(-1, 1), rotationMatrix(-Math.PI / 3)],
                        [rotationMatrix((-Math.PI * 2) / 3)],
                        [rotationMatrix((Math.PI * 2) / 3)],
                    ],
                ];
            } else {
                return [
                    [[rotationMatrix(Math.PI), translationMatrix({x: tr.x * 3, y: tr.y})]],
                    [[scaleMatrix(1, -1), translationMatrix({x: 0, y: tr.y * 2})]],
                    [
                        [rotationMatrix((Math.PI / 3) * 2)],
                        [rotationMatrix(Math.PI / 3)],
                        [rotationMatrix(Math.PI)],
                        [rotationMatrix(-(Math.PI / 3))],
                        [rotationMatrix(-(Math.PI / 3) * 2)],
                    ],
                ];
            }
        } else {
            return [
                [[scaleMatrix(1, -1), rotationMatrix(-Math.PI / 2)]],
                ...replicateStandard(tr.y),
            ];
        }
    }
}
