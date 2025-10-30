import {Coord} from './types';

export const lerp = (a: number, b: number, i: number) => a + (b - a) * i;

export const plerp = (p0: Coord, p1: Coord, i: number) => ({
    x: lerp(p0.x, p1.x, i),
    y: lerp(p0.y, p1.y, i),
});