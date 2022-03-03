import { epsilon, Primitive } from './intersect';
import { calculateIntersections } from './points';
import { Coord, Intersect } from '../types';

export const calcAllIntersections = (
    primitives: Array<Primitive>,
): { coords: Array<Intersect>; seenCoords: { [key: string]: Intersect } } => {
    const seenCoords: { [k: string]: Intersect } = {};
    const coords: Array<Intersect> = [
        { coord: { x: 0, y: 0 }, primitives: [] },
        { coord: { x: 0, y: -1 }, primitives: [] },
    ];
    coords.forEach((c) => (seenCoords[coordKey(c.coord)] = c));
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
    return { coords, seenCoords };
};

export const numKey = (num: number, precision = 3) => {
    const res = num.toFixed(precision);
    if (res === (-epsilon).toFixed(precision)) {
        return (0).toFixed(precision);
    }
    return res;
};
export const primitiveKey = (p: Primitive) =>
    p.type === 'line'
        ? `${numKey(p.m)}:${numKey(p.b)}${limitKey(p.limit)}`
        : `${coordKey(p.center)}:${numKey(p.radius)}${limitKey(p.limit)}`;
export const limitKey = (limit?: [number, number] | null) =>
    limit ? `:${numKey(limit[0])}:${numKey(limit[1])}` : '';
export const coordKey = (coord: Coord, precision?: number) =>
    `${numKey(coord.x, precision)},${numKey(coord.y, precision)}`;