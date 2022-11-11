import { epsilon, Primitive } from './intersect';
import { Coord } from '../types';

let keys;
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
