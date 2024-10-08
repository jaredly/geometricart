import {
    angleTo,
    applyMatrices,
    dist,
    Matrix,
    push,
} from './getMirrorTransforms';
import {
    Circle,
    circleCircle,
    lineCircle,
    lineLine,
    lineToSlope,
    Primitive,
    SlopeIntercept,
} from './intersect';
import { BarePath, Coord, GuideGeom, Path, Segment } from '../types';

// export type Primitive = {type: 'line', data: SlopeIntercept} | {type: 'circle', center: Coord, radius: number}
export const transformPath = (path: Path, matrices: Array<Matrix>): Path => ({
    ...path,
    origin: applyMatrices(path.origin, matrices),
    segments: path.segments.map((s) => transformSegment(s, matrices)),
});

export function transformBarePath(shape: BarePath, tx: Matrix[]): BarePath {
    return {
        origin: applyMatrices(shape.origin, tx),
        segments: shape.segments.map((seg) => transformSegment(seg, tx)),
    };
}

export const transformSegment = (
    segment: Segment,
    matrices: Array<Matrix>,
): Segment => {
    // const to = applyMatrices(segment.to, matrices)
    switch (segment.type) {
        case 'Arc':
            const flips = matrices.some((m) => m[0][0] === 1 && m[1][1] === -1);
            return {
                type: 'Arc',
                center: applyMatrices(segment.center, matrices),
                clockwise: flips ? !segment.clockwise : segment.clockwise,
                to: applyMatrices(segment.to, matrices),
                // to,
            };
        case 'Quad':
            return {
                type: 'Quad',
                to: applyMatrices(segment.to, matrices),
                control: applyMatrices(segment.control, matrices),
            };
        case 'Line':
            return {
                type: 'Line',
                to: applyMatrices(segment.to, matrices),
            };
    }
};

export const getCircumCircle = (p1: Coord, p2: Coord, p3: Coord) => {
    const t1 = angleTo(p1, p2);
    const d1 = dist(p1, p2);

    const t2 = angleTo(p1, p3);
    const d2 = dist(p1, p3);

    const m1 = push(p1, t1, d1 / 2);
    const m2 = push(p1, t2, d2 / 2);

    const mid = lineLine(
        lineToSlope(m1, push(m1, t1 + Math.PI / 2, 1)),
        lineToSlope(m2, push(m2, t2 + Math.PI / 2, 1)),
    );

    if (!mid) {
        return null;
    }

    return { center: mid, r: dist(p1, mid), m1, m2 };

    // const ta = (t1 + t2) / 2;
    // const t3 = angleTo(p2, p1);
    // const t4 = angleTo(p2, p3);
    // const tb = (t3 + t4) / 2;

    // if (!mid) {
    //     return null;
    // }
    // const da = dist(p1, mid);
    // const r = Math.abs(Math.sin(ta - t1) * da);
    // return { center: mid, r };
};

export const getInCircle = (p1: Coord, p2: Coord, p3: Coord) => {
    const t1 = angleTo(p1, p2);
    const t2 = angleTo(p1, p3);
    const ta = (t1 + t2) / 2;
    const t3 = angleTo(p2, p1);
    const t4 = angleTo(p2, p3);
    const tb = (t3 + t4) / 2;

    const mid = lineLine(
        lineToSlope(p1, push(p1, ta, 1)),
        lineToSlope(p2, push(p2, tb, 1)),
    );
    if (!mid) {
        return null;
    }
    const da = dist(p1, mid);
    const r = Math.abs(Math.sin(ta - t1) * da);
    return { center: mid, r };
};

export const calcPolygon = (
    p1: Coord,
    p2: Coord,
    sides: number,
    toCenter: boolean,
) => {
    // console.log('calc', toCenter);
    const internal = Math.PI / sides;
    const adjacent = Math.PI / 2 - internal;
    if (toCenter) {
        const center = p1;
        const r = dist(p1, p2);
        const a1 = angleTo(p1, p2);
        const points = [p2];
        for (let i = 1; i < sides; i++) {
            points.push(push(center, a1 + internal * 2 * i, r));
        }
        return { center, points, r };
    }

    const theta = angleTo(p1, p2);
    const d = dist(p1, p2) / 2;
    const r = d / Math.sin(internal);
    const center = push(p1, theta + adjacent, r);
    const points = [p1, p2];
    for (let i = 2; i < sides; i++) {
        points.push(
            push(
                center,
                theta + adjacent + Math.PI + ((Math.PI * 2) / sides) * i,
                r,
            ),
        );
    }
    return {
        center,
        points,
        r,
    };
};

export const geomToPrimitives = (
    geom: GuideGeom,
    limit?: boolean,
): Array<Primitive> => {
    switch (geom.type) {
        case 'CloneCircle': {
            const d = dist(geom.p1, geom.p2);
            return [{ type: 'circle', center: geom.p3, radius: d }];
        }
        case 'CircumCircle': {
            const got = getCircumCircle(geom.p1, geom.p2, geom.p3);
            if (!got) {
                return [];
            }
            return [{ type: 'circle', center: got.center, radius: got.r }];
        }
        case 'InCircle': {
            const got = getInCircle(geom.p1, geom.p2, geom.p3);
            if (!got) {
                return [];
            }
            return [{ type: 'circle', center: got.center, radius: got.r }];
        }
        case 'Perpendicular': {
            const t1 = angleTo(geom.p1, geom.p2) + Math.PI / 2;
            if (limit) {
                const mag = dist(geom.p1, geom.p2);
                return [
                    lineToSlope(
                        push(geom.p1, t1, mag),
                        push(geom.p1, t1, -mag),
                        true,
                    ),
                ];
            }
            const p2 = push(geom.p1, t1, 1);
            return [lineToSlope(geom.p1, p2, false)];
        }
        case 'Split': {
            return [lineToSlope(geom.p1, geom.p2, true)];
        }
        case 'Polygon': {
            const { center, points, r } = calcPolygon(
                geom.p1,
                geom.p2,
                geom.sides,
                geom.toCenter,
            );
            return [
                // { type: 'circle', center, radius: r },
                ...points.map((p1, i) =>
                    lineToSlope(p1, points[(i + 1) % points.length], true),
                ),
                // lineToSlope(geom.p1, geom.p2, true)
            ];
        }
        case 'Line': {
            if (geom.extent) {
                const mid = {
                    x: (geom.p1.x + geom.p2.x) / 2,
                    y: (geom.p1.y + geom.p2.y) / 2,
                };
                const t = angleTo(geom.p1, geom.p2);
                const d = dist(geom.p1, geom.p2);
                return [
                    lineToSlope(
                        push(mid, t, (d * geom.extent) / 2),
                        push(mid, t + Math.PI, (d * geom.extent) / 2),
                        true,
                    ),
                ];
            }
            return [lineToSlope(geom.p1, geom.p2, geom.limit)];
        }
        case 'Circle': {
            const result: Array<Primitive> = [];
            const radius = dist(geom.center, geom.radius);
            if (geom.half) {
                result.push({
                    type: 'circle',
                    center: geom.center,
                    radius: radius / 2,
                });
            }
            for (let i = 1; i <= geom.multiples + 1; i++) {
                result.push({
                    type: 'circle',
                    center: geom.center,
                    radius: radius * i,
                });
            }
            if (geom.line) {
                result.push(lineToSlope(geom.center, geom.radius));
            }
            return result;
        }
        case 'AngleBisector': {
            const t1 = angleTo(geom.p2, geom.p1);
            const t2 = angleTo(geom.p2, geom.p3);
            const mid = (t1 + t2) / 2;
            return [lineToSlope(geom.p2, push(geom.p2, mid, 1))];
        }
        case 'PerpendicularBisector': {
            const t = angleTo(geom.p1, geom.p2);
            const d = dist(geom.p1, geom.p2);
            const mid = push(geom.p1, t, d / 2);
            return [lineToSlope(mid, push(mid, t + Math.PI / 2, 1))];
        }
    }
};

export const calculateIntersections = (
    p1: Primitive,
    p2: Primitive,
): Array<Coord> => {
    if (p1.type === 'line' && p2.type === 'line') {
        const int = lineLine(p1, p2);
        return int ? [int] : [];
    }
    if (p1.type === 'circle' && p2.type === 'circle') {
        return circleCircle(p1, p2);
    }
    if (p1.type === 'line') {
        return lineCircle(p2 as Circle, p1);
    }
    return lineCircle(p1, p2 as SlopeIntercept);
};
