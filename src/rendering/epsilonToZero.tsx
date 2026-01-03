import {angleBetween} from './isAngleBetween';

// export const anglesEqual = (one: Angle, two: Angle): boolean => {
//     if (one.type !== two.type) {
//         return false
//     }
//     if (!closeEnough(one.theta, two.theta)) {
//         return false
//     }
//     if(one.type === 'arc' && two.type === 'arc') {
//         return one.clockwise === two.clockwise && closeEnough(one.radius, two.radius)
//     }
//     return true
// }

export const closeEnough = (one: number, two: number, eps = epsilon) =>
    one === two || Math.abs(one - two) < eps;

export const anglesEqual = (one: Angle, two: Angle) => {
    if (one.type === 'flat' && two.type === 'flat') {
        return closeEnoughAngle(one.theta, two.theta);
    }
    if (one.type === 'arc' && two.type === 'arc') {
        return (
            one.clockwise === two.clockwise &&
            closeEnoughAngle(one.theta, two.theta) &&
            closeEnough(one.radius, two.radius)
        );
    }
    return false;
};
// ok folks, here's what we're doing

export const epsilonToZero = (value: number) => (Math.abs(value) < epsilon ? 0 : value);
export const closeEnoughAngle = (one: number, two: number, eps?: number) => {
    one = zeroToTwoPi(one);
    two = zeroToTwoPi(two);
    return closeEnough(one, two, eps);
};

export const angleIsBetween = (angle: number, [lower, upper]: [number, number]) => {
    const one = angleBetween(lower, angle, true);
    const two = angleBetween(lower, upper, true);
    return one <= two + epsilon;
};
// export const convertCircle = (p1: Coord, p2: Coord): Circle => ({
//     type: 'circle',
//     center: p1,
//     radius: dist(p1, p2),
// });

export const epsilon = 0.000001; // export const lineLine_ = (
//     from1: Coord,
//     to1: Coord,
//     from2: Coord,
//     to2: Coord,
// ): Coord | null => {
//     const dX: number = to1.x - from1.x;
//     const dY: number = to1.y - from1.y;
//     const determinant: number = dX * (to2.y - from2.y) - (to2.x - from2.x) * dY;
//     if (determinant === 0) return null; // parallel lines
//     const lambda: number =
//         ((to2.y - from2.y) * (to2.x - from1.x) +
//             (from2.x - to2.x) * (to2.y - from1.y)) /
//         determinant;
//     //   const gamma: number = ((from1.y - to1.y) * (to2.x - from1.x) + dX * (to2.y - from1.y)) / determinant;
//     // check if there is an intersection
//     //   if (!(0 <= lambda && lambda <= 1) || !(0 <= gamma && gamma <= 1)) return undefined;
//     return {
//         x: from1.x + lambda * dX,
//         y: from1.y + lambda * dY,
//     };
// };

export const withinLimit = ([low, high]: [number, number], value: number, eps = epsilon) => {
    return low - eps <= value && value <= high + eps;
};
export const zeroToTwoPi = (angle: number) => {
    if (angle < 0) {
        angle += Math.PI * 2;
    }
    if (angle > Math.PI * 2) {
        angle -= Math.PI * 2;
    }
    if (angle < epsilon) {
        return 0;
    }
    if (Math.abs(Math.PI * 2 - angle) < epsilon) {
        return 0;
    }
    return angle;
};

/**
 * Normalizes an angle to between -PI and PI
 */
export const negPiToPi = (angle: number) => {
    const res = zeroToTwoPi(angle);
    return res > Math.PI ? res - Math.PI * 2 : res;
};
export type Angle =
    | {type: 'flat'; theta: number}
    | {
          type: 'arc';
          /** the tangent line! */
          theta: number;
          radius: number;
          clockwise: boolean;
      };
