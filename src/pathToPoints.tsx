import { angleBetween } from './findNextSegments';
import { angleTo, dist, push } from './getMirrorTransforms';
import { epsilon } from './intersect';
import { reverseSegment } from './pathsAreIdentical';
import { Coord, Segment } from './types';

export const pathToPoints = (segments: Array<Segment>) => {
    const points: Array<Coord> = [];
    let prev = segments[segments.length - 1].to;
    segments.forEach((seg) => {
        if (seg.type === 'Arc') {
            const t1 = angleTo(seg.center, prev);
            const t2 = angleTo(seg.center, seg.to);
            const bt = angleBetween(t1, t2, seg.clockwise);
            const subs = 10;
            for (let i = 1; i < subs; i++) {
                const tm = t1 + (bt / subs) * i * (seg.clockwise ? 1 : -1);
                const d = dist(seg.center, seg.to);
                const midp = push(seg.center, tm, d);
                points.push(midp);
            }
            // const tm = t1 + (bt / 2) * (seg.clockwise ? 1 : -1);
            // const d = dist(seg.center, seg.to);
            // const midp = push(seg.center, tm, d);
            // points.push(midp);
        }
        points.push(seg.to);

        prev = seg.to;
    });
    return points;
};

export const totalAngle = (segments: Array<Segment>) => {
    const points = pathToPoints(segments);
    const angles = points.map((point, i) => {
        const prev = i === 0 ? points[points.length - 1] : points[i - 1];
        return angleTo(prev, point);
    });
    const betweens = angles.map((angle, i) => {
        const prev = i === 0 ? angles[angles.length - 1] : angles[i - 1];
        return angleBetween(prev, angle, true);
    });
    const relatives = betweens.map((between) =>
        between > Math.PI ? between - Math.PI * 2 : between,
    );
    let total = relatives.reduce((a, b) => a + b);
    return total;
};

export const isClockwise = (segments: Array<Segment>) => {
    return totalAngle(segments) >= Math.PI - epsilon;
};

export const toDegrees = (x: number) => Math.floor((x / Math.PI) * 180);

export const ensureClockwise = (segments: Array<Segment>) => {
    if (!segments.length || isClockwise(segments)) {
        return segments;
    }
    return reversePath(segments);
};

export const reversePath = (source: Array<Segment>): Array<Segment> => {
    const segments: Array<Segment> = [];
    for (let i = source.length - 1; i >= 0; i--) {
        const seg = source[i];
        const prev = i === 0 ? source[source.length - 1].to : source[i - 1].to;
        segments.push(reverseSegment(prev, seg));
    }
    return segments;
};
