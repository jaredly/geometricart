import {Coord} from '../types';

export const mulPos = (a: Coord, b: Coord) => ({x: a.x * b.x, y: a.y * b.y});
