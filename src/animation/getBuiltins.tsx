import { applyMatrices, dist, Matrix } from "../rendering/getMirrorTransforms";
import { pathToPoints, rasterSegPoints } from "../rendering/pathToPoints";
import { transformSegment } from "../rendering/points";
import { Coord, Fill, Path, Segment, State } from "../types";
import { segmentsBounds, segmentsCenter } from "../editor/Bounds";
import { segmentToPrimitive } from "../editor/findSelection";
import { pathSegs } from "../editor/RenderPath";
import { coordKey } from "../rendering/coordKey";
import { angleBetween } from "../rendering/findNextSegments";
import {
	angleTo,
	push,
	rotationMatrix,
	scale,
	scaleMatrix,
	transformsToMatrices,
	translationMatrix,
} from "../rendering/getMirrorTransforms";
import { pointCircle, pointLine } from "../rendering/intersect";
import { coordsEqual, reverseSegment } from "../rendering/pathsAreIdentical";
import { maybeReverseSegment, segmentKey } from "../rendering/segmentKey";

const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

export function getBuiltins(): { [key: string]: Function | number } {
	return {
		dist,
		push,
		scale,
		angleTo,
		angleBetween,
		sin: Math.sin,
		cos: Math.cos,
		tan: Math.tan,
		clamp,
		PI: Math.PI,
		sineStep: (t: number, steps: number, smooth: number) => {
			const perc = 1 - smooth;
			const mid =
				Math.sin((((t * steps) % 1) - 0.5) * Math.PI * perc) /
					2 /
					Math.sin((perc * Math.PI) / 2) +
				0.5;
			return mid / steps + Math.floor(t * steps) / steps;
		},
		translate: (p1: Coord, p2: Coord) => ({
			x: p1.x + p2.x,
			y: p1.y + p2.y,
		}),
		limit: (t: number, min: number, max: number) =>
			Math.min(Math.max(t, min), max),
		segmentsBounds,
		segmentsCenter,
		transformSegment,
		applyMatrices,
		lerp: (a: number, b: number, between: number) => a + (b - a) * between,
		crossFade: (t: number, mid: number) =>
			t < 0.5 - mid ? 0 : t > 0.5 + mid ? 1 : ((t - 0.5) / mid + 1) / 2,
		squishSine: (t: number, mid: number) => {
			if (t < mid) {
				return Math.sin(((t / mid) * Math.PI) / 2) / 2 + 0.5;
			}
			if (t > 1 - mid) {
				return 0.5 - Math.sin((((1 - t) / mid) * Math.PI) / 2) / 2;
			}
			if (t < 0.5 - mid) {
				return 1;
			}
			if (t > 0.5 + mid) {
				return 0;
			}
			if (t < 1 - mid) {
				return 1 - (Math.sin((((t - 0.5) / mid) * Math.PI) / 2) / 2 + 0.5);
				// return Math.sin((((1 - t) / mid) * Math.PI) / 2);
			}
		},
		scaleMatrix,
		translationMatrix,
		rotationMatrix,
		transformsToMatrices,
		animationTimer,
		pathForSegments: pathSegs,
		rectPath: (c: Coord, size: Coord, color: string) => {
			const path = pathSegs([
				{
					type: "Line",
					to: { x: c.x - size.x / 2, y: c.y - size.y / 2 },
				},
				{
					type: "Line",
					to: { x: c.x + size.x / 2, y: c.y - size.y / 2 },
				},
				{
					type: "Line",
					to: { x: c.x + size.x / 2, y: c.y + size.y / 2 },
				},
				{
					type: "Line",
					to: { x: c.x - size.x / 2, y: c.y + size.y / 2 },
				},
			]);
			path.style.fills[0] = { color };
			return path;
		},
		closestPoint,
		farthestPoint,
		scaleInsets,
		modInsets,
		modFills,
		transformPath: (path: Path, tx: Array<Matrix>): Path => {
			return {
				...path,
				origin: applyMatrices(path.origin, tx),
				segments: path.segments.map((s) => transformSegment(s, tx)),
			};
		},
		followPath,
		// insetPath,
		lerpPos,
	};
}

// export const insetPath = (path: Path, inset: number): Array<Path> => {
//     const [segments, corners] = insetSegments(path.segments, inset / 100);
//     const regions = cleanUpInsetSegments2(segments, corners);

//     return regions.map((segments) => ({
//         ...path,
//         segments,
//         origin: segments[segments.length - 1].to,
//     }));
// };
const lerpPos = (p1: Coord, p2: Coord, percent: number) => {
	return {
		x: (p2.x - p1.x) * percent + p1.x,
		y: (p2.y - p1.y) * percent + p1.y,
	};
};

export const closestPoint = (
	center: Coord,
	segments: Array<Segment>,
): [number, Coord] => {
	let best = null as null | [number, Coord];
	rasterSegPoints(pathToPoints(segments, null)).forEach((point) => {
		const d = dist(point, center);
		if (best == null || best[0] > d) {
			best = [d, point];
		}
	});

	return best!;
};

export const farthestPoint = (center: Coord, segments: Array<Segment>) => {
	let best = null as null | [number, Coord];
	rasterSegPoints(pathToPoints(segments, null)).forEach((point) => {
		const d = dist(point, center);
		if (best == null || best[0] < d) {
			best = [d, point];
		}
	});

	return best;
};

// Returns 'idx', 'percent through it'
export const animationTimer = (
	t: number,
	weights: Array<number>,
	pause: number = 0,
): [number, number] => {
	if (!weights.length) {
		return [0, 0];
	}
	const total = weights.reduce((a, b) => a + b) + pause * weights.length;
	t *= total;
	let at = 0;
	for (let i = 0; i < weights.length; i++) {
		let w = weights[i] + pause;
		if (at + w > t) {
			const off = t - at;
			if (off < pause / 2) {
				return [i, 0];
			}
			if (off > w - pause / 2) {
				return [i, 1];
			}
			return [i, (off - pause / 2) / (w - pause)];
		}
		at += w;
	}
	return [weights.length - 1, 1];
};
const followPath = (path: Array<Coord> | Path, percent: number) => {
	let points;
	if (!Array.isArray(path)) {
		points = rasterSegPoints(
			pathToPoints(path.segments, path.open ? path.origin : null),
		);
		points = points.concat([points[0]]);
	} else {
		points = path;
	}
	const dists = [];
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		const d = dist(points[i - 1], points[i]);
		total += d;
		dists.push(d);
	}
	const desired = percent * total;
	let at = 0;
	for (let i = 0; i < points.length - 1; i++) {
		if (at + dists[i] > desired) {
			return lerpPos(points[i], points[i + 1], (desired - at) / dists[i]);
		}
		at += dists[i];
	}
	return points[points.length - 1];
};

const scaleInsets = (path: Path, scale: number): Path => {
	return modInsets(path, (i) => (i ? i * scale : i));
};

const pathToSegments = (path: Path) => {
	return path.segments.map((seg, i) => {
		const prev =
			i === 0 ? path.segments[path.segments.length - 1] : path.segments[i - 1];
		return maybeReverseSegment(prev.to, seg);
	});
};

export const produceJointPaths = (ids: string[], paths: State["paths"]) => {
	const segs = ids.flatMap((id) => pathToSegments(paths[id]));

	const borders = removeDuplicateSegments(segs);
	let orphans = resolveOverlaps(borders);
	if (orphans.length !== borders.length) {
		console.log("more", orphans.slice());
		orphans = removeDuplicateSegments(orphans);
		console.log("back", orphans.slice());
	}

	// if (true) {
	//     return orphans.map(p => [p])
	// }

	const result = [[orphans.shift()!]];
	while (orphans.length) {
		const prev = orphans.length;
		top: for (let i = 0; i < orphans.length; i++) {
			const or = orphans[i];
			for (let j = 0; j < result.length; j++) {
				const p = result[j];
				const left = p[0].prev;
				const right = p[p.length - 1].segment.to;

				if (coordsEqual(or.prev, left)) {
					p.unshift({
						prev: or.segment.to,
						segment: reverseSegment(or.prev, or.segment),
					});
				} else if (coordsEqual(or.segment.to, left)) {
					p.unshift(or);
				} else if (coordsEqual(or.prev, right)) {
					p.push(or);
				} else if (coordsEqual(or.segment.to, right)) {
					p.push({
						prev: or.segment.to,
						segment: reverseSegment(or.prev, or.segment),
					});
				} else {
					continue;
				}
				orphans.splice(i, 1);
				break top;
			}
		}
		if (orphans.length === prev) {
			result.push([orphans.shift()!]);
		}
	}

	if (orphans.length) {
		console.error("Still have orphans", orphans);
	}

	return result;
};

export const findAdjacentPaths = (ids: string[], paths: State["paths"]) => {
	const segMap: { [key: string]: boolean } = {};
	ids.forEach((id) => {
		const path = paths[id];
		path.segments.forEach((seg, i) => {
			const prev =
				i === 0
					? path.segments[path.segments.length - 1]
					: path.segments[i - 1];
			const rs = maybeReverseSegment(prev.to, seg);
			const key = segmentKey(rs.prev, rs.segment);
			segMap[key] = true;
		});
	});

	return Object.keys(paths).filter(
		(id) =>
			!ids.includes(id) &&
			paths[id].style.fills.length &&
			paths[id].segments.some((seg, i) => {
				const prev =
					i === 0
						? paths[id].segments[paths[id].segments.length - 1]
						: paths[id].segments[i - 1];
				const rs = maybeReverseSegment(prev.to, seg);
				const key = segmentKey(rs.prev, rs.segment);
				return segMap[key];
			}),
	);
};

const modFills = (
	path: Path,
	mod: (fill: Fill, i: number) => Fill | null,
): Path => {
	return {
		...path,
		style: {
			...path.style,
			fills: path.style.fills.map((f, i) => (f ? mod(f, i) : f)),
		},
	};
};

const modInsets = (
	path: Path,
	mod: (inset: number | undefined) => number | undefined,
): Path => {
	return {
		...path,
		style: {
			fills: path.style.fills.map((f) =>
				f
					? {
							...f,
							inset: mod(f.inset),
						}
					: f,
			),
			lines: path.style.lines.map((f) =>
				f
					? {
							...f,
							inset: mod(f.inset),
						}
					: f,
			),
		},
	};
};

export type PSeg = {
	prev: Coord;
	segment: Segment;
};

const unique = <T,>(v: T[], k: (t: T) => string) => {
	const map: { [key: string]: true } = {};
	return v.filter((v) => {
		const key = k(v);
		return map[key] ? false : (map[key] = true);
	});
};

function removeDuplicateSegments(segs: { prev: Coord; segment: Segment }[]) {
	const segMap: {
		[key: string]: { prev: Coord; segment: Segment; count: number };
	} = {};
	segs.forEach((seg) => {
		const key = segmentKey(seg.prev, seg.segment);
		if (!segMap[key]) {
			segMap[key] = { prev: seg.prev, segment: seg.segment, count: 1 };
		} else {
			segMap[key].count++;
		}
	});
	return Object.entries(segMap)
		.filter((s) => s[1].count === 1)
		.map(([k, { count, ...v }]) => v);
}

function resolveOverlaps(borders: PSeg[]): PSeg[] {
	const points = unique(
		borders.flatMap((ps) => [ps.prev, ps.segment.to]),
		coordKey,
	);

	borders = borders.slice();
	const prims = borders.map((ps) => segmentToPrimitive(ps.prev, ps.segment));

	// console.log('OVERPALS')
	// console.log()
	// console.log(points.map(x => coordKey(x)))
	// console.log()

	points.forEach((point) => {
		// console.log('-> ', coordKey(point))
		for (let i = 0; i < prims.length; i++) {
			const prim = prims[i];
			const { prev, segment } = borders[i];
			// Ignore points on endpoints
			if (coordsEqual(prev, point) || coordsEqual(segment.to, point)) {
				continue;
			}
			if (prim.type === "line" && pointLine(point, prim)) {
				const p1: PSeg = { prev, segment: { type: "Line", to: point } };
				const p2: PSeg = { prev: point, segment: segment };
				borders[i] = p1;
				borders.splice(i + 1, 0, p2);
				prims[i] = segmentToPrimitive(p1.prev, p1.segment);
				prims.splice(i + 1, 0, segmentToPrimitive(p2.prev, p2.segment));
				break;
			}
			if (prim.type === "circle" && pointCircle(point, prim)) {
				const p1: PSeg = maybeReverseSegment(prev, {
					...segment,
					to: point,
				});
				const p2: PSeg = maybeReverseSegment(point, segment);
				// consoleSegment({ prev, segment }, point)
				// consoleSegment(p1)
				// consoleSegment(p2)
				borders[i] = p1;
				borders.splice(i + 1, 0, p2);
				prims[i] = segmentToPrimitive(p1.prev, p1.segment);
				prims.splice(i + 1, 0, segmentToPrimitive(p2.prev, p2.segment));
				break;
			}
		}
	});

	return borders;
}
