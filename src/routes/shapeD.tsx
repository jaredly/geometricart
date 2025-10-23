import {Coord} from '../types';

export const shapeD = (points: Coord[]) =>
    'M' +
    points
        .map((p) => `${Math.round(p.x * 1000) / 1000} ${Math.round(p.y * 1000) / 1000}`)
        .join('L') +
    'Z';
