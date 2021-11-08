import { Coord, Id, Mirror } from './types';

// [[a, b, c], [d, e, f]]
export type Matrix = Array<Array<number>>;

export const getMirrorTransforms = (mirrors: { [key: Id]: Mirror }) => {
    // TODO: topo sort if I want this to be faster
    const got: { [key: Id]: Array<Array<Matrix>> } = {};
    const left = Object.keys(mirrors).filter((k) => {
        const m = mirrors[k];
        if (m.parent) {
            return true;
        }
        got[k] = mirrorTransforms(m).map(transformsToMatrices);
    });
    let tick = 0;
    while (left.length) {
        if (tick++ > 1000) {
            throw new Error(`Infinite loop probably`);
        }
        for (let i = 0; i < left.length; i++) {
            const m = mirrors[left[i]];
            if (got[m.parent!]) {
                left.splice(i, 1);

                let transforms = mirrorTransforms(m).map(transformsToMatrices);
                const parent = got[m.parent!];
                const res: Array<Array<Matrix>> = [];
                parent.forEach((outer) => {
                    transforms.forEach((inner) => {
                        res.push(inner.concat(outer));
                    });
                });
                got[m.id] = res;
                break;
            }
        }
    }
    return got;
};

export const getTransformsForMirror = (
    mirror: Id,
    mirrors: { [key: Id]: Mirror },
): Array<Array<Matrix>> => {
    let transforms = mirrorTransforms(mirrors[mirror]).map(
        transformsToMatrices,
    );
    let current = mirrors[mirror];
    while (current.parent) {
        current = mirrors[current.parent];
        const outer = mirrorTransforms(current).map(transformsToMatrices);
        let next: Array<Array<Matrix>> = [];
        outer.forEach((steps) => {
            transforms.forEach((inner) => {
                next.push(inner.concat(steps));
            });
        });
        transforms = next;
    }
    return transforms;
};

export const applyMatrix = (
    { x, y }: Coord,
    [[a, b, c], [d, e, f]]: Matrix,
) => ({
    x: x * a + y * b + c,
    y: x * d + y * e + f,
});

export const applyMatrices = (pos: Coord, matrices: Array<Matrix>) => {
    return matrices.reduce(applyMatrix, pos);
};

export const mirrorTransforms = (mirror: Mirror) => {
    const original: Array<Array<Transform>> = [[]];
    const transforms: Array<Array<Transform>> = [];
    if (mirror.reflect) {
        const reflect: Array<Transform> = [
            { type: 'reflect', p1: mirror.origin, p2: mirror.point },
        ];
        original.push(reflect);
        transforms.push(reflect);
    }
    const by = (Math.PI * 2) / (mirror.rotational.length + 1);
    mirror.rotational.forEach((enabled, i) => {
        if (!enabled) {
            return;
        }
        original.forEach((steps) => {
            transforms.push(
                steps.concat([
                    {
                        type: 'rotate',
                        center: mirror.origin,
                        theta: by * (i + 1),
                    },
                ]),
            );
        });
    });
    return transforms;
};

// export type Transform = Array<Array<number>>;
export type Transform =
    | { type: 'rotate'; center: Coord; theta: number }
    | { type: 'reflect'; p1: Coord; p2: Coord };

export const scale = (coord: Coord, scale: number) => ({
    x: coord.x * scale,
    y: coord.y * scale,
});
export const translationMatrix = (coord: Coord): Matrix => [
    [1, 0, coord.x],
    [0, 1, coord.y],
];
export const rotationMatrix = (theta: number): Matrix => [
    [Math.cos(theta), -Math.sin(theta), 0],
    [Math.sin(theta), Math.cos(theta), 0],
];
export const scaleMatrix = (sx: number, sy: number) => [
    [sx, 0, 0],
    [sy, 0, 0],
];

export const transformToMatrices = (t: Transform) => {
    switch (t.type) {
        case 'rotate':
            return [
                // translate to origin
                translationMatrix(scale(t.center, -1)),
                rotationMatrix(t.theta),
                // translate back
                translationMatrix(t.center),
            ];
        case 'reflect':
            const theta = angleTo(t.p1, t.p2);
            return [
                // translate to origin
                translationMatrix(scale(t.p1, -1)),
                // rotate to origin
                rotationMatrix(-theta),
                // reflect over x axis
                scaleMatrix(1, -1),
                // rotate back
                rotationMatrix(theta),
                // translate back
                translationMatrix(t.p1),
            ];
    }
};

export const transformsToMatrices = (t: Array<Transform>) =>
    t.reduce(
        (result, t) => result.concat(transformToMatrices(t)),
        [] as Array<Matrix>,
    );

export const push = (p1: Coord, theta: number, mag: number) => ({
    x: p1.x + Math.cos(theta) * mag,
    y: p1.y + Math.sin(theta) * mag,
});
export const angleTo = (p1: Coord, p2: Coord) =>
    Math.atan2(p2.y - p1.y, p2.x - p1.x);
export const dist = (p1: Coord, p2: Coord) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
};
