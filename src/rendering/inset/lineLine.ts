import { Coord, LineSegment, Segment } from "../../types";
import { zeroToTwoPi } from "../clipPath";
import { angleBetween } from "../findNextSegments";
import { angleTo, push } from "../getMirrorTransforms";

// @trace
/**
 * ### `insetLineLine`
 *
 * Used to calculate the inset for a line segment that's followed by another line segment.
 */
export const insetLineLine = (
	[p1, p2, p3]: [Coord, Coord, Coord],
	// prev: Coord,
	// seg: LineSegment,
	// next: LineSegment,
	amount: number,
): Array<Segment> => {
	const t0 = angleTo(p1, p2);
	const t1 = angleTo(p2, p3);
	const between = angleBetween(t0, t1, amount > 0);
	/**
	 * If `t0` and `t1` are the same, then pushing the endpoint `t0` perpendicular
	 * to the direction of the line will get us what we want!
	 */
	if (between === 0) {
		// @list-examples
		return [{ type: "Line", to: push(p2, t0 + Math.PI / 2, amount) }];
	}
	/**
	 * If the angle `between` the first and second segments is less than 180º,
	 * we're contracting a corner (either expanding with a concave corner or shrinking
	 * with a convex corner). In order to deal with some edge cases that we'll see
	 * later on, the correct thing to do is offset the two lines past each other,
	 * and connect them through the previous shared endpoint.
	 */
	if (between <= Math.PI) {
		// @list-examples
		return [
			{ type: "Line", to: push(p2, t0 + Math.PI / 2, amount) },
			{ type: "Line", to: p2 },
			{ type: "Line", to: push(p2, t1 + Math.PI / 2, amount) },
		];
		/**
		 * Otherwise, we're "expanding" a corner, and we need to find the new shared
		 * endpoint. We could do a naive offset on both segments and intersect the
		 * new lines, but we can take advantage of some right-triangle math to calculate
		 * the new point directly.
		 */
	} else {
		// @list-examples
		const angle =
			angleBetween(t0 + Math.PI, t1, amount < 0) * (amount > 0 ? -1 : 1);
		const dist = Math.abs(amount / Math.cos(between / 2 - Math.PI));
		return [{ type: "Line", to: push(p2, t0 - Math.PI + angle / 2, dist) }];
	}
};
