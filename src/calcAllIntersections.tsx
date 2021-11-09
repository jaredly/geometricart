import { Primitive } from './intersect';
import { calculateIntersections } from './points';
import { Coord, Intersect } from './types';

export const calcAllIntersections = (
    primitives: Array<Primitive>,
): Array<Intersect> => {
    const seenCoords: { [k: string]: Intersect } = {};
    const coords: Array<Intersect> = [];
    for (let i = 0; i < primitives.length; i++) {
        for (let j = i + 1; j < primitives.length; j++) {
            const pair: [number, number] = [i, j];
            coords.push(
                ...(calculateIntersections(primitives[i], primitives[j])
                    .map((coord) => {
                        const k = coordKey(coord);
                        if (seenCoords[k]) {
                            seenCoords[k].primitives.push(pair);
                            return null;
                        }
                        return (seenCoords[k] = { coord, primitives: [pair] });
                    })
                    .filter(Boolean) as Array<Intersect>),
            );
        }
    }
    return coords;
};

export const numKey = (num: number) => {
    const res = num.toFixed(precision);
    if (res === '-0.000') {
        return '0.000';
    }
    return res;
};
const precision = 3;
export const primitiveKey = (p: Primitive) =>
    p.type === 'line'
        ? `${numKey(p.m)}:${numKey(p.b)}${
              p.limit ? `${numKey(p.limit[0])}:${numKey(p.limit[1])}` : ''
          }`
        : `${coordKey(p.center)}:${numKey(p.radius)}`;
export const coordKey = (coord: Coord) =>
    `${numKey(coord.x)},${numKey(coord.y)}`;
