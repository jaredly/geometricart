import { Coord, Id, Mirror } from "../types";

// [[a, b, c], [d, e, f]]
export type Matrix = Array<Array<number>>;

export const getMirrorTransforms = (mirrors: { [key: Id]: Mirror }) => {
	// TODO: topo sort if I want this to be faster
	const got: { [key: Id]: Array<Array<Matrix>> } = {};
	const left = Object.keys(mirrors).filter((k) => {
		const m = mirrors[k];
		if (typeof m.parent === "string") {
			return true;
		}
		// otherwise, we're in the new style, with reified mirrors
		if (m.parent) {
			got[k] = getTransformsForNewMirror(m);
		} else {
			got[k] = mirrorTransforms(m).map(transformsToMatrices);
		}
	});
	let tick = 0;
	while (left.length) {
		if (tick++ > 1000) {
			throw new Error(`Infinite loop probably`);
		}
		for (let i = 0; i < left.length; i++) {
			const m = mirrors[left[i]];
			if (typeof m.parent === "string" && got[m.parent]) {
				left.splice(i, 1);

				let transforms = mirrorTransforms(m).map(transformsToMatrices);
				const parent = got[m.parent];
				const res: Array<Array<Matrix>> = transforms.slice();
				parent.forEach((outer) => {
					res.push(outer);
					transforms.forEach((inner) => {
						res.push(inner.concat(outer));
					});
				});
				got[m.id] = res;
				break;
			}
		}
	}
	return got;
};

export const getTransformsForNewMirror = (
	mirror: Mirror,
): Array<Array<Matrix>> => {
	let transforms = mirrorTransforms(mirror).map(transformsToMatrices);
	let current = mirror;
	while (current.parent && typeof current.parent !== "string") {
		current = current.parent;
		const outer = mirrorTransforms(current).map(transformsToMatrices);
		let next: Array<Array<Matrix>> = transforms.slice();
		outer.forEach((steps) => {
			next.push(steps);
			transforms.forEach((inner) => {
				next.push(inner.concat(steps));
			});
		});
		transforms = next;
	}
	return transforms;
};

export const getTransformsForMirror = (
	mirror: Id | Mirror,
	mirrors: { [key: Id]: Mirror },
): Array<Array<Matrix>> => {
	const m = typeof mirror === "string" ? mirrors[mirror] : mirror;
	let transforms = mirrorTransforms(m).map(transformsToMatrices);
	let current = m;
	while (current.parent) {
		current =
			typeof current.parent === "string"
				? mirrors[current.parent]
				: current.parent;
		const outer = mirrorTransforms(current).map(transformsToMatrices);
		let next: Array<Array<Matrix>> = transforms.slice();
		outer.forEach((steps) => {
			next.push(steps);
			transforms.forEach((inner) => {
				next.push(inner.concat(steps));
			});
		});
		transforms = next;
	}
	return transforms;
};

export const applyMatrix = (
	{ x, y }: Coord,
	[[a, b, c], [d, e, f]]: Matrix,
) => ({
	x: x * a + y * b + c,
	y: x * d + y * e + f,
});

export const applyMatrices = (pos: Coord, matrices: Array<Matrix>) => {
	return matrices.reduce(applyMatrix, pos);
};

export const mirrorTransforms = (mirror: Mirror): Array<Array<Transform>> => {
	const original: Array<Array<Transform>> = [[]];
	const transforms: Array<Array<Transform>> = [];
	if (mirror.reflect) {
		const reflect: Array<Transform> = [
			{ type: "reflect", p1: mirror.origin, p2: mirror.point },
		];
		original.push(reflect);
		transforms.push(reflect);
	}
	const by = (Math.PI * 2) / (mirror.rotational.length + 1);
	mirror.rotational.forEach((enabled, i) => {
		if (!enabled) {
			return;
		}
		original.forEach((steps) => {
			transforms.push(
				steps.concat([
					{
						type: "rotate",
						center: mirror.origin,
						theta: by * (i + 1),
					},
				]),
			);
		});
	});
	return transforms;
};

// export type Transform = Array<Array<number>>;
export type Transform =
	| { type: "rotate"; center: Coord; theta: number }
	| { type: "reflect"; p1: Coord; p2: Coord };

export const scale = (coord: Coord, scale: number) => ({
	x: coord.x * scale,
	y: coord.y * scale,
});
export const translationMatrix = (coord: Coord): Matrix => [
	[1, 0, coord.x],
	[0, 1, coord.y],
];
export const rotationMatrix = (theta: number): Matrix => [
	[Math.cos(theta), -Math.sin(theta), 0],
	[Math.sin(theta), Math.cos(theta), 0],
];
export const scaleMatrix = (sx: number, sy: number): Matrix => [
	[sx, 0, 0],
	[0, sy, 0],
];

export const reverseTransform = (mx: Matrix[]): Matrix[] => {
	return mx.slice().reverse().map(invertMatrix);
};

export const invertMatrix = (matrix: Matrix): Matrix => {
	const [[a, b, c], [d, e, f]] = matrix;
	// translation
	if (a === 1 && b === 0 && d === 0 && e === 1) {
		return [
			[1, 0, -c],
			[0, 1, -f],
		];
	}
	// scale
	if (b === 0 && c === 0 && d === 0 && f === 0) {
		return [
			[1 / a, 0, 0],
			[0, 1 / e, 0],
		];
	}
	// rotation
	if (c === 0 && f === 0) {
		// sin(-x) = -sin(x)
		// cos(-x) = cos(x)
		return [
			[a, -b, c],
			[-d, e, f],
		];
	}
	console.warn("cant invert", matrix);
	throw new Error(`cant invert matrix`);
	// return null;
};

export const transformToMatrices = (t: Transform) => {
	switch (t.type) {
		case "rotate":
			return [
				// translate to origin
				translationMatrix(scale(t.center, -1)),
				rotationMatrix(t.theta),
				// translate back
				translationMatrix(t.center),
			];
		case "reflect":
			const theta = angleTo(t.p1, t.p2);
			return [
				// translate to origin
				translationMatrix(scale(t.p1, -1)),
				// rotate to origin
				rotationMatrix(-theta),
				// reflect over x axis
				scaleMatrix(1, -1),
				// rotate back
				rotationMatrix(theta),
				// translate back
				translationMatrix(t.p1),
			];
	}
};

export const transformsToMatrices = (t: Array<Transform>) =>
	t.reduce(
		(result, t) => result.concat(transformToMatrices(t)),
		[] as Array<Matrix>,
	);

/**
 * Calculate the point found `mag` units in `theta` direction from `p1`.
 */
export const push = (p1: Coord, theta: number, mag: number) => ({
	x: p1.x + Math.cos(theta) * mag,
	y: p1.y + Math.sin(theta) * mag,
});

export const posOffset = (p1: Coord, p2: Coord) => ({
	x: p1.x + p2.x,
	y: p1.y + p2.y,
});

/**
 * Calculate the angle from `p1`, pointing at `p2`.
 */
export const angleTo = (p1: Coord, p2: Coord) =>
	Math.atan2(p2.y - p1.y, p2.x - p1.x);
/**
 * Calculate the distance between two points.
 */
export const dist = (p1: Coord, p2: Coord) => {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	return Math.sqrt(dx * dx + dy * dy);
};
