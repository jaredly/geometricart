import {Coord, View} from '../types';

export const worldToScreen = (width: number, height: number, pos: Coord, view: View) => ({
    x: width / 2 + (pos.x + view.center.x) * view.zoom,
    y: height / 2 + (pos.y + view.center.y) * view.zoom,
});