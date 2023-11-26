import { Coord } from '../types';

export const scalePos = (pos: Coord, scale: number) => ({
    x: pos.x * scale,
    y: pos.y * scale,
});
