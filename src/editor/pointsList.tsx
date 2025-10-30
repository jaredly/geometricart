import {Coord} from '../types';

export const pointsList = (points: Array<Coord>) => points.map(({x, y}) => `${x},${y}`).join(' ');
