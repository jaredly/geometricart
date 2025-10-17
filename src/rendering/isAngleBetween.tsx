import {closeEnough} from './epsilonToZero';
import {epsilon} from './epsilonToZero';

// export const angleDiff = (one: number, two: number) => {
//     const diff = one - two;
//     if (diff < -Math.PI) {
//         return diff + Math.PI * 2;
//     }
//     if (diff > Math.PI) {
//         return diff - Math.PI * 2;
//     }
//     return diff;
// };
// true if middle is between left and right, going from left to right around the circle {clockwise/or not}
// if middle is equal to left or right, also return true

export const isAngleBetween = (left: number, middle: number, right: number, clockwise: boolean) => {
    if (closeEnough(left, right)) {
        return true;
    }
    if (closeEnough(middle, right)) {
        return true;
    }
    const lm = angleBetween(left, middle, clockwise);
    const lr = angleBetween(left, right, clockwise);
    return lm <= lr;
};
/**
 * Calculate the difference between two angles.
 *
 * The result will always be positive, in $[0,2\pi]$
 */

export const angleBetween = (
    // the 'starting' angle, must be in $[-\pi,\pi]$
    left: number,
    // end 'ending' angle, must be in $[-\pi,\pi]$
    right: number,
    // which direction to travel around the circle, `true` for clockwise
    clockwise: boolean,
) => {
    if (!clockwise) {
        [left, right] = [right, left];
    }
    if (Math.abs(right - left) < epsilon) {
        return 0;
    }
    if (right >= left) {
        return right - left;
    }
    const res = right + Math.PI * 2 - left;
    if (res < 0) {
        return res + Math.PI * 2;
    }
    return res;
};
