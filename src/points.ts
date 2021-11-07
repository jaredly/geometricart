import { angleTo, dist, push } from './getMirrorTransforms';
import {
    Circle,
    circleCircle,
    lineCircle,
    lineLine,
    lineToSlope,
    Primitive,
    SlopeIntercept,
} from './intersect';
import { Coord, GuideGeom } from './types';

// export type Primitive = {type: 'line', data: SlopeIntercept} | {type: 'circle', center: Coord, radius: number}

export const geomToPrimitives = (geom: GuideGeom): Array<Primitive> => {
    switch (geom.type) {
        case 'Line':
            return [lineToSlope(geom.p1, geom.p2)];
        case 'Circle': {
            const circles: Array<Primitive> = [];
            const radius = dist(geom.center, geom.radius);
            if (geom.half) {
                circles.push({
                    type: 'circle',
                    center: geom.center,
                    radius: radius / 2,
                });
            }
            for (let i = 1; i <= geom.multiples + 1; i++) {
                circles.push({
                    type: 'circle',
                    center: geom.center,
                    radius: radius * i,
                });
            }
            return [lineToSlope(geom.center, geom.radius), ...circles];
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
