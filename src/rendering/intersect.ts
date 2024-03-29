import { isWithinLineLimit, zeroToTwoPi } from './clipPath';
import { closeEnough } from './epsilonToZero';
import { angleBetween, isAngleBetween } from './findNextSegments';
import { angleTo, dist, push } from './getMirrorTransforms';
import { Coord } from '../types';
import { coordsEqual } from './pathsAreIdentical';
import { numKey } from './coordKey';

// export const lineLine_ = (
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

export const withinLimit = ([low, high]: [number, number], value: number) => {
    return low - epsilon <= value && value <= high + epsilon;
};

export const pointLine = (coord: Coord, line: SlopeIntercept) => {
    if (line.m === Infinity) {
        return (
            closeEnough(line.b, coord.x) &&
            (!line.limit || withinLimit(line.limit, coord.y))
        );
    }
    if (line.m === 0) {
        return (
            closeEnough(line.b, coord.y) &&
            (!line.limit || withinLimit(line.limit, coord.x))
        );
    }
    const y = line.m * coord.x + line.b;
    return (
        closeEnough(y, coord.y) &&
        (!line.limit || withinLimit(line.limit, coord.x))
    );
};

export const lineLine = (one: SlopeIntercept, two: SlopeIntercept) => {
    if (closeEnough(one.m, two.m)) {
        return null;
    }
    if (one.m === Infinity) {
        const y = two.m * one.b + two.b;
        if (one.limit && !withinLimit(one.limit, y)) {
            return null;
        }
        if (two.limit && !withinLimit(two.limit, one.b)) {
            return null;
        }
        return { x: one.b, y: y };
    }
    if (two.m === Infinity) {
        const y = one.m * two.b + one.b;
        if (two.limit && !withinLimit(two.limit, y)) {
            return null;
        }
        if (one.limit && !withinLimit(one.limit, two.b)) {
            return null;
        }
        return { x: two.b, y: y };
    }
    if (Math.abs(one.m - two.m) < epsilon) {
        return null;
    }
    // y = m1x + b1
    // y = m2x + b2
    // m1x + b1 = m2x + b2
    // m1x - m2x = b2 - b1
    // x(m1 - m2) = b2 - b1
    // x = (b2 - b1) / (m1 - m2)
    // y = mx + b
    const x = (two.b - one.b) / (one.m - two.m);
    if (one.limit && !withinLimit(one.limit, x)) {
        return null;
    }
    if (two.limit && !withinLimit(two.limit, x)) {
        return null;
    }
    return {
        x,
        y: one.m * x + one.b,
    };
};

const sq = (x: number) => x * x;

// export const convertCircle = (p1: Coord, p2: Coord): Circle => ({
//     type: 'circle',
//     center: p1,
//     radius: dist(p1, p2),
// });

export const epsilon = 0.000001;

export const slopeToLine = (si: SlopeIntercept): [Coord, Coord] => {
    if (!si.limit) {
        throw new Error(
            `cannot convert a si that doesn't have a limit back to a line`,
        );
    }
    if (si.m === Infinity) {
        return [
            { x: si.b, y: si.limit[0] },
            { x: si.b, y: si.limit[1] },
        ];
    }
    return [
        { x: si.limit[0], y: si.m * si.limit[0] + si.b },
        { x: si.limit[1], y: si.m * si.limit[1] + si.b },
    ];
};

// NOTE: if these two points are the same, we pretend it's a horizontal line.
export const lineToSlope = (
    p1: Coord,
    p2: Coord,
    limit?: boolean,
): SlopeIntercept => {
    if (Math.abs(p1.y - p2.y) < epsilon) {
        return {
            type: 'line',
            m: 0,
            b: p1.y,
            limit: limit ? [Math.min(p1.x, p2.x), Math.max(p1.x, p2.x)] : null,
        };
    }
    if (Math.abs(p1.x - p2.x) < epsilon) {
        // b is now the X intercept, not the Y intercept
        return {
            type: 'line',
            m: Infinity,
            b: p1.x,
            limit: limit ? [Math.min(p1.y, p2.y), Math.max(p1.y, p2.y)] : null,
        };
    }
    const m = (p2.y - p1.y) / (p2.x - p1.x);
    const b = p2.y - p2.x * m;
    return {
        type: 'line',
        m,
        b,
        limit: limit ? [Math.min(p1.x, p2.x), Math.max(p1.x, p2.x)] : null,
    };
};

export type SlopeIntercept = {
    type: 'line';
    // If m === Infinity, b is the x coord. otherwise it's the normal b
    m: number;
    b: number;
    // if m === Infinity, limit is on the y axis, otherwise it's on the x axis
    limit?: null | [number, number];
};
// the limit is two thetas, in clockwise direction.
export type Circle = {
    type: 'circle';
    radius: number;
    center: Coord;
    limit?: null | [number, number];
};
export type Primitive = SlopeIntercept | Circle;

const close = (a: number, b: number) => Math.abs(a - b) < epsilon;

export const intersections = (
    one: Primitive,
    two: Primitive,
    debug = false,
): Array<Coord> => {
    if (one.type === 'line') {
        if (two.type === 'line') {
            if (closeEnough(one.m, two.m)) {
                if (closeEnough(one.b, two.b)) {
                    if (one.limit && two.limit) {
                        const res = [];
                        if (withinLimit(one.limit, two.limit[0])) {
                            res.push(two.limit[0]);
                        }
                        if (withinLimit(one.limit, two.limit[1])) {
                            res.push(two.limit[1]);
                        }
                        if (withinLimit(two.limit, one.limit[0])) {
                            res.push(one.limit[0]);
                        }
                        if (withinLimit(two.limit, one.limit[1])) {
                            res.push(one.limit[1]);
                        }
                        const seen: { [key: string]: true } = {};
                        return res
                            .filter((v) => {
                                const k = numKey(v);
                                if (seen[k]) {
                                    return false;
                                }
                                return (seen[k] = true);
                            })
                            .map((v) =>
                                one.m === Infinity
                                    ? { x: one.b, y: v }
                                    : { x: v, y: one.m * v + one.b },
                            );
                    }
                }
            }
            const res = lineLine(one, two);
            return res ? [res] : [];
        }
        return lineCircle(two, one, debug);
    }
    if (two.type === 'line') {
        return lineCircle(one, two, debug);
    }
    return circleCircle(one, two);
};

export const circleCircle = (one: Circle, two: Circle): Array<Coord> => {
    if (
        coordsEqual(one.center, two.center) &&
        closeEnough(one.radius, two.radius)
    ) {
        if (!one.limit && !two.limit) {
            return [];
        }
        // One is a complete circle, give us both endpoints of two
        if (!one.limit) {
            return [
                push(two.center, two.limit![0], two.radius),
                push(two.center, two.limit![1], two.radius),
            ];
        }
        if (!two.limit) {
            return [
                push(one.center, one.limit![0], one.radius),
                push(one.center, one.limit![1], one.radius),
            ];
        }
        // It's the same circle!
        // Now we just check for some overlaps
        const angles = [];
        if (isAngleBetween(two.limit[0], one.limit[0], two.limit[1], true)) {
            angles.push(one.limit[0]);
        }
        if (isAngleBetween(two.limit[0], one.limit[1], two.limit[1], true)) {
            angles.push(one.limit[1]);
        }
        if (isAngleBetween(one.limit[0], two.limit[0], one.limit[1], true)) {
            angles.push(two.limit[0]);
        }
        if (isAngleBetween(one.limit[0], two.limit[1], one.limit[1], true)) {
            angles.push(two.limit[1]);
        }
        const seen: { [k: string]: true } = {};
        return angles
            .filter((a) => {
                const k = numKey(a);
                return seen[k] ? false : (seen[k] = true);
            })
            .map((angle) => push(one.center, angle, one.radius));
    }
    // (x - h)^2 + (y - k)^2 = r^2
    // we've got two of these.
    // 0, 1, 2, or all intersections.
    // sounds quadratic.

    let dx = two.center.x - one.center.x;
    let dy = two.center.y - one.center.y;
    let d = Math.sqrt(dx * dx + dy * dy);

    const check =
        one.limit || two.limit
            ? (pos: Coord) =>
                  (one.limit
                      ? isAngleBetween(
                            one.limit[0],
                            angleTo(one.center, pos),
                            one.limit[1],
                            true,
                        )
                      : true) &&
                  (two.limit
                      ? isAngleBetween(
                            two.limit[0],
                            angleTo(two.center, pos),
                            two.limit[1],
                            true,
                        )
                      : true)
            : (pos: Coord) => pos;

    // tangent (or nearly)
    if (close(one.radius + two.radius, d)) {
        const ratio = (one.radius + two.radius) / one.radius;
        return [
            {
                x: one.center.x + dx / ratio,
                y: one.center.y + dy / ratio,
            },
        ].filter(check);
    }
    const larger = one.radius > two.radius ? one : two;
    const smaller = one.radius > two.radius ? two : one;
    // one inside the other
    if (
        close(
            // difference between the two
            larger.radius - smaller.radius,
            d,
        )
    ) {
        const t = angleTo(larger.center, smaller.center);
        return [push(larger.center, t, larger.radius)].filter(check);
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
    ].filter(check);
};

export const closeEnoughAngle = (one: number, two: number) => {
    one = zeroToTwoPi(one);
    two = zeroToTwoPi(two);
    return closeEnough(one, two);
};

export const angleIsBetween = (
    angle: number,
    [lower, upper]: [number, number],
) => {
    const one = angleBetween(lower, angle, true);
    const two = angleBetween(lower, upper, true);
    return one <= two + epsilon;
};

export const pointCircle = (point: Coord, circle: Circle) => {
    if (
        !withinLimit(
            [-circle.radius, circle.radius],
            point.x - circle.center.x,
        ) ||
        !withinLimit([-circle.radius, circle.radius], point.y - circle.center.y)
    ) {
        return false;
    }
    const d = dist(point, circle.center);
    return (
        closeEnough(d, circle.radius) &&
        (!circle.limit ||
            angleIsBetween(angleTo(circle.center, point), circle.limit))
    );
};

// TODO: what to do about inf slope, no y intercept
export function lineCircle(
    { center: { x: cx, y: cy }, radius, limit: climit }: Circle,
    { m: slope, b: intercept, limit }: SlopeIntercept,
    debug = false,
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

        // Tangent folx
        if (close(Math.abs(intercept - cx), radius)) {
            if (limit && !withinLimit(limit, cy)) {
                return [];
            }
            return [{ x: intercept, y: cy }];
        }

        // Outside the radius
        if (Math.abs(intercept - cx) > radius) {
            return [];
        }
        const y = Math.sqrt(sq(radius) - sq(intercept - cx));
        if (debug) {
            console.log('yes inf');
        }
        return [
            { x: intercept, y: cy + y },
            { x: intercept, y: cy - y },
        ].filter(
            (p) =>
                (!limit || withinLimit(limit, p.y)) &&
                (climit
                    ? angleIsBetween(angleTo({ x: cx, y: cy }, p), climit)
                    : true),
        );
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

    // Dist to line, for tangent check
    if (Math.abs(slope) < epsilon) {
        const d = Math.abs(cy - intercept);
        if (close(d, radius)) {
            if (limit && !withinLimit(limit, cx)) {
                return [];
            }
            if (
                climit &&
                !angleIsBetween(
                    angleTo({ x: cx, y: cy }, { x: cx, y: intercept }),
                    climit,
                )
            ) {
                return [];
            }
            return [{ x: cx, y: intercept }];
        }
    } else {
        // passing through origin of circle, perpendicular to line
        const fromCircle = lineToSlope(
            { x: cx, y: cy },
            { x: cx + 1, y: cy - 1 / slope },
        );

        const intersection = lineLine(fromCircle, {
            type: 'line',
            m: slope,
            b: intercept,
        });

        if (
            intersection &&
            // We're tangent!
            close(dist({ x: cx, y: cy }, intersection), radius)
        ) {
            if (
                limit &&
                !(limit[0] <= intersection.x && intersection.x <= limit[1])
            ) {
                return [];
            }
            if (
                climit &&
                !angleIsBetween(angleTo({ x: cx, y: cy }, intersection), climit)
            ) {
                return [];
            }
            return [intersection];
        }

        // const x = (two.b - one.b) / (one.m - two.m);
        // return {
        // 	x,
        // 	y: one.m * x + one.b,
        // };
    }

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
            if (
                limit &&
                !(
                    limit[0] <= intersections[0].x &&
                    intersections[0].x <= limit[1]
                )
            ) {
                return [];
            }
            if (
                climit &&
                !angleIsBetween(
                    angleTo({ x: cx, y: cy }, intersections[0]),
                    climit,
                )
            ) {
                return [];
            }
            // only 1 intersection
            return [intersections[0]];
        }
        const center = { x: cx, y: cy };
        if (debug) {
            console.log(
                `Here we are`,
                intersections,
                climit,
                intersections.map((p) => angleTo(center, p)),
            );
        }
        return intersections.filter(
            (p) =>
                (!limit || withinLimit(limit, p.x)) &&
                (climit ? angleIsBetween(angleTo(center, p), climit) : true),
        );
    }
    // no intersection
    return [];
}
