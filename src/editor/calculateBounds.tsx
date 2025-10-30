import {screenToWorld} from './Canvas.screenToWorld.related';
import {View} from '../types';

export function calculateBounds(width: number, height: number, view: View) {
    const {x: x0, y: y0} = screenToWorld(width, height, {x: 0, y: 0}, view);
    const {x: x1, y: y1} = screenToWorld(width, height, {x: width, y: height}, view);

    return {x0, y0, x1, y1};
}