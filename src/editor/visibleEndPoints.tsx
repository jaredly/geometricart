import {SlopeIntercept} from '../rendering/intersect';
import {Bounds} from './Bounds';

export const visibleEndPoints = (si: SlopeIntercept, bounds: Bounds) => {
    if (si.m === Infinity) {
        return [
            {x: si.b, y: bounds.y0},
            {x: si.b, y: bounds.y1},
        ];
    }
    return [
        {x: bounds.x0, y: bounds.x0 * si.m + si.b},
        {x: bounds.x1, y: bounds.x1 * si.m + si.b},
    ];
};