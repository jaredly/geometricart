import {push} from '../rendering/getMirrorTransforms';
import {Coord} from '../types';

export const arrow = (coord: Coord, theta: number, size: number, wsize = 1) => [
    push(coord, theta, size),
    push(coord, theta + (Math.PI * 2) / 3, size * wsize),
    push(coord, theta - (Math.PI * 2) / 3, size * wsize),
];