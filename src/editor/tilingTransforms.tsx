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
import {tilingPoints} from './tilingPoints';

export const getShapeSize = (tr: Coord, width: number) => {
    // ok really what we want is ... which duplication gets us as close as possible to an even aspect ratio.
    const y = Math.min(10, Math.round((tr.x / tr.y) * width));
    // if (closeEnough(Math.abs(tr.x), Math.abs(tr.y))) {
    //     return {x: width, y: width};
    // }
    // const y = Math.floor(Math.min(10, Math.abs(tr.x / tr.y)) * width);
    return {x: width, y: Math.abs(y)};
};

function replicateStandard(tx: number, ty: number, mx: number, my: number): Matrix[][][] {
    const duplicates = [];
    // const count = closeEnough(Math.abs(tx), Math.abs(ty)) ? scale : Math.abs(tx / ty) + 3;
    // const w = 4;
    for (let i = 0; i <= my; i++) {
        const y = ty * (i * 2);
        if (i > 0) {
            duplicates.push([0, -y], [0, y]);
        }
        for (let x = 1; x <= mx; x++) {
            duplicates.push([-tx * 2 * x, y], [tx * 2 * x, y]);
            if (y !== 0) {
                duplicates.push([-tx * 2 * x, -y], [tx * 2 * x, -y]);
            }
        }
    }
    return [
        [[scaleMatrix(-1, 1)]],
        [[scaleMatrix(1, -1)]],
        duplicates.map(([x, y]) => [translationMatrix({x, y})]),
    ];
}

export const getTilingTransforms = (shape: TilingShape, pts = tilingPoints(shape), size = 3) => {
    return tilingTransforms(shape, pts[2], pts, getShapeSize(pts[2], size));
};

export function tilingTransforms(
    shape: TilingShape,
    tr: Coord,
    tpts: Coord[],
    size: {x: number; y: number},
): Matrix[][][] {
    if (tpts.length === 4) {
        return replicateStandard(tr.x, tr.y, size.x, size.y);
    } else if (shape.type === 'right-triangle' && shape.rotateHypotenuse) {
        // Triangle -> Rectangle
        return [
            [[rotationMatrix(Math.PI), translationMatrix(tr)]],
            ...replicateStandard(tr.x, tr.y, size.x, size.y),
        ];
    } else if (closeEnough(tr.y, -1 / Math.sqrt(3))) {
        // HEX
        return [
            [[scaleMatrix(1, -1)]],
            [
                [scaleMatrix(-1, 1), translationMatrix({x: tr.x * 2, y: 0})],
                [rotationMatrix((Math.PI * 2) / 3), translationMatrix({x: tr.x * 2, y: 0})],
                [rotationMatrix(-(Math.PI * 2) / 3), translationMatrix({x: tr.x * 2, y: 0})],
            ],
            [
                [scaleMatrix(-1, 1), translationMatrix({x: tr.x * 4, y: 0})],
                [rotationMatrix((Math.PI * 2) / 3), translationMatrix({x: tr.x * 4, y: 0})],
                [rotationMatrix(-(Math.PI * 2) / 3), translationMatrix({x: tr.x * 4, y: 0})],
            ],
            [1, 2, 3, 4, 5].map((i) => [rotationMatrix((Math.PI / 3) * i)]),
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

        for (let j = 5; j < 10; j++) {
            if (closeEnough(internalAngle, 1 / (j * 2))) {
                const mx: Matrix[][][] = [];
                mx.push([[scaleMatrix(1, -1)]]);
                mx.push([]);
                for (let i = 1; i < j; i++) {
                    mx[mx.length - 1].push([rotationMatrix((i / 8) * Math.PI * 2)]);
                }
                return mx;
            }
        }

        const mx: Matrix[][][] = [[[scaleMatrix(1, -1), rotationMatrix(-Math.PI / 2)]]];
        return [...mx, ...replicateStandard(tr.x, tr.y, size.x, size.y)];
    } else {
        const [a, b, c] = tpts;
        const d1 = dist(a, b);
        const d2 = dist(b, c);
        const d3 = dist(a, c);
        // Equilateral triangle
        if (closeEnough(d1, d2) && closeEnough(d2, d3)) {
            if (shape.type === 'isocelese' && shape.flip) {
                const res: Matrix[][][] = [];

                if (size.x > 1) {
                    res.push([
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
                    ]);
                }
                if (size.x > 2) {
                    res.push([
                        [
                            scaleMatrix(-1, 1),
                            rotationMatrix(-Math.PI / 3),
                            translationMatrix({x: tr.x * 6, y: tr.y * 2}),
                        ],
                        [translationMatrix({x: tr.x * 4, y: 0})],
                        [translationMatrix({x: tr.x * 2, y: tr.y * 2})],
                    ]);
                }

                return [
                    ...res,
                    // [
                    //     [scaleMatrix(-1, 1), rotationMatrix(Math.PI / 3)],
                    //     [scaleMatrix(-1, 1), rotationMatrix(Math.PI)],
                    //     [scaleMatrix(-1, 1), rotationMatrix(-Math.PI / 3)],
                    //     [rotationMatrix((-Math.PI * 2) / 3)],
                    //     [rotationMatrix((Math.PI * 2) / 3)],
                    // ],
                ];

                // return [
                //     [
                //         [
                //             scaleMatrix(-1, 1),
                //             rotationMatrix(-Math.PI / 3),
                //             translationMatrix({x: tr.x * 3, y: tr.y}),
                //         ],
                //         [
                //             rotationMatrix((Math.PI * 2) / 3),
                //             translationMatrix({x: tr.x * 3, y: tr.y}),
                //         ],
                //         [
                //             rotationMatrix((-Math.PI * 2) / 3),
                //             translationMatrix({x: tr.x * 3, y: tr.y}),
                //         ],
                //     ],
                // ];
            } else {
                return [
                    [
                        [rotationMatrix(Math.PI), translationMatrix({x: tr.x * 3, y: tr.y})],
                        [
                            rotationMatrix(-(Math.PI * 2) / 3),
                            translationMatrix({x: tr.x * 3, y: tr.y}),
                        ],
                        [
                            rotationMatrix((Math.PI * 2) / 3),
                            translationMatrix({x: tr.x * 3, y: tr.y}),
                        ],
                    ],
                    [
                        [rotationMatrix(Math.PI), translationMatrix({x: tr.x * 6, y: tr.y * 2})],
                        [
                            rotationMatrix(-(Math.PI * 2) / 3),
                            translationMatrix({x: tr.x * 6, y: tr.y * 2}),
                        ],
                        [
                            rotationMatrix((Math.PI * 2) / 3),
                            translationMatrix({x: tr.x * 6, y: tr.y * 2}),
                        ],
                    ],
                    // [[rotationMatrix(Math.PI), translationMatrix({x: tr.x * 3, y: tr.y})]],
                    // [[scaleMatrix(1, -1), translationMatrix({x: 0, y: tr.y * 2})]],
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
                ...replicateStandard(tr.x, tr.y, size.x, size.y),
            ];
        }
    }
}
