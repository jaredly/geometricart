import { closeEnoughAngle, epsilon } from "./intersect";
import { Angle } from "./clipPath";

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
	if (one.type === "flat" && two.type === "flat") {
		return closeEnoughAngle(one.theta, two.theta);
	}
	if (one.type === "arc" && two.type === "arc") {
		return (
			one.clockwise === two.clockwise &&
			closeEnoughAngle(one.theta, two.theta) &&
			closeEnough(one.radius, two.radius)
		);
	}
	return false;
};
// ok folks, here's what we're doing

export const epsilonToZero = (value: number) =>
	Math.abs(value) < epsilon ? 0 : value;
