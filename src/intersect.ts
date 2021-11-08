import { dist } from './getMirrorTransforms';
import { Coord } from './types';

export const lineLine_ = (
    from1: Coord,
    to1: Coord,
    from2: Coord,
    to2: Coord,
): Coord | null => {
    const dX: number = to1.x - from1.x;
    const dY: number = to1.y - from1.y;

    const determinant: number = dX * (to2.y - from2.y) - (to2.x - from2.x) * dY;
    if (determinant === 0) return null; // parallel lines

    const lambda: number =
        ((to2.y - from2.y) * (to2.x - from1.x) +
            (from2.x - to2.x) * (to2.y - from1.y)) /
        determinant;
    //   const gamma: number = ((from1.y - to1.y) * (to2.x - from1.x) + dX * (to2.y - from1.y)) / determinant;

    // check if there is an intersection
    //   if (!(0 <= lambda && lambda <= 1) || !(0 <= gamma && gamma <= 1)) return undefined;

    return {
        x: from1.x + lambda * dX,
        y: from1.y + lambda * dY,
    };
};

export const lineLine = (one: SlopeIntercept, two: SlopeIntercept) => {
    if (one.m === two.m) {
        return null;
    }
    if (one.m === Infinity) {
        return { x: one.b, y: two.m * one.b + two.b };
    }
    if (two.m === Infinity) {
        return { x: two.b, y: one.m * two.b + one.b };
    }
    // y = m1x + b1
    // y = m2x + b2
    // m1x + b1 = m2x + b2
    // m1x - m2x = b2 - b1
    // x(m1 - m2) = b2 - b1
    // x = (b2 - b1) / (m1 - m2)
    // y = mx + b
    const x = (two.b - one.b) / (one.m - two.m);
    return {
        x,
        y: one.m * x + one.b,
    };
};

const sq = (x: number) => x * x;

export const convertCircle = (p1: Coord, p2: Coord): Circle => ({
    type: 'circle',
    center: p1,
    radius: dist(p1, p2),
});

export const epsilon = 0.000001;

// NOTE: if these two points are the same, we pretend it's a horizontal line.
export const lineToSlope = (p1: Coord, p2: Coord): SlopeIntercept => {
    if (Math.abs(p1.y - p2.y) < epsilon) {
        return { type: 'line', m: 0, b: p1.y };
    }
    if (Math.abs(p1.x - p2.x) < epsilon) {
        // b is now the X intercept, not the Y intercept
        return { type: 'line', m: Infinity, b: p1.x };
    }
    const m = (p2.y - p1.y) / (p2.x - p1.x);
    const b = p2.y - p2.x * m;
    return { type: 'line', m, b };
};

export type SlopeIntercept = { type: 'line'; m: number; b: number };
export type Circle = { type: 'circle'; radius: number; center: Coord };
export type Primitive = SlopeIntercept | Circle;

export const circleCircle = (one: Circle, two: Circle): Array<Coord> => {
    // (x - h)^2 + (y - k)^2 = r^2
    // we've got two of these.
    // 0, 1, 2, or all intersections.
    // sounds quadratic.

    let dx = two.center.x - one.center.x;
    let dy = two.center.y - one.center.y;
    let d = Math.sqrt(dx * dx + dy * dy);

    // tangent (or nearly)
    if (Math.abs(one.radius + two.radius - d) < epsilon) {
        return [
            {
                x: one.center.x + dx / 2,
                y: one.center.y + dy / 2,
            },
        ];
    }

    let R = one.radius;
    let R2 = R * R;
    let r = two.radius;
    let x = (d * d - r * r + R2) / (2 * d);
    if (R2 < x * x) {
        return [];
    }
    let y = Math.sqrt(R2 - x * x);
    dx /= d;
    dy /= d;
    // TODO: might be duplicates
    return [
        {
            x: one.center.x + dx * x - dy * y,
            y: one.center.y + dy * x + dx * y,
        },
        {
            x: one.center.x + dx * x + dy * y,
            y: one.center.y + dy * x - dx * y,
        },
    ];
};

// TODO: what to do about inf slope, no y intercept
export function lineCircle(
    { center: { x: cx, y: cy }, radius }: Circle,
    { m: slope, b: intercept }: SlopeIntercept,
): Array<Coord> {
    // circle: (x - h)^2 + (y - k)^2 = r^2
    // line: y = m * x + n
    // r: circle radius
    // h: x value of circle centre
    // k: y value of circle centre
    // m: slope
    // n: y-intercept
    if (slope === Infinity) {
        // (y - k)^2 = r^2 - (x - h)^2
        // y = sqrt(r^2 - (x - h)^2) + k
        // Outside the radius
        if (Math.abs(intercept - cx) > radius) {
            return [];
        }
        const y = Math.sqrt(sq(radius) - sq(intercept - cx));
        return [
            { x: intercept, y: cy + y },
            { x: intercept, y: cy - y },
        ];
    }

    // circle: (x - h)^2 + (y - k)^2 = r^2
    // line: y = m * x + b
    // y = sqrt(r^2 - (x - cx)^2) + k
    // m * x + b = sqrt(r^2 - (x - cx)^2) + cy
    // (mx + b - cy)^2 = r^2 - (x - cx)^2
    //
    // (a + b)(a + b)
    // a^2 + 2ab + b^2
    // (a - b)(a - b)
    // a^2 + 2a(-b) + b^2
    //
    // (mx)^2 + 2mx(b - cy) + (b - cy)^2 = r^2 - (x^2 - 2x(cx) + cx^2)
    // m^2x^2 + 2mx(b - cy) + (b - cy)^2 = r^2 - x^2 + 2x(cx) - cx^2

    // + m^2x^2
    // + x^2
    // + 2mx(b - cy)
    // - 2x(cx)
    // + (b - cy)^2
    // - r^2
    // + cx^2
    // = 0

    // (m^2 + 1) x^2
    // (2m(b - cy) - 2cx) x
    // (b - cy)^2 - r^2 + cx^2

    // (m^2 + 1) x^2
    // (2mb - 2mcy - 2cx) x
    // (b - cy)^2 - r^2 + cx^2

    // m^2x^2 + x^2 + 2mx(b - cy) - 2x(cx) + (b - cy)^2 - r^2 + cx^2 = 0

    // (m^2 + 1)x^2

    // get a, b, c values
    var a = 1 + sq(slope);
    var b = -cx * 2 + slope * (intercept - cy) * 2;
    var c = sq(cx) + sq(intercept - cy) - sq(radius);

    // get discriminant
    var d = sq(b) - 4 * a * c;
    if (d >= 0) {
        // insert into quadratic formula
        var intersections = [
            (-b + Math.sqrt(d)) / (2 * a),
            (-b - Math.sqrt(d)) / (2 * a),
        ].map((x) => ({ x, y: slope * x + intercept }));
        if (d == 0) {
            // only 1 intersection
            return [intersections[0]];
        }
        return intersections;
    }
    // no intersection
    return [];
}
