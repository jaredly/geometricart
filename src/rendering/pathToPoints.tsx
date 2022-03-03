import { angleBetween } from './findNextSegments';
import { angleTo, dist, push } from './getMirrorTransforms';
import { epsilon } from './intersect';
import { reverseSegment } from './pathsAreIdentical';
import { Coord, Segment } from '../types';
import { closeEnough, negPiToPi } from './clipPath';

export const pathToPoints = (
    segments: Array<Segment>,
    accurateArcCorners = false,
) => {
    let smallestArcLength = Infinity;
    segments.forEach((seg, i) => {
        if (seg.type === 'Arc') {
            const prev = segments[i === 0 ? segments.length - 1 : i - 1].to;
            const t1 = angleTo(seg.center, prev);
            const t2 = angleTo(seg.center, seg.to);
            let bt = angleBetween(t1, t2, seg.clockwise);
            if (closeEnough(bt, 0)) {
                bt = Math.PI * 2;
            }
            const r = dist(seg.center, prev);
            const arcLength = bt * r;
            smallestArcLength = Math.min(smallestArcLength, arcLength);
        }
    });

    let arcLengths: null | Array<number>;
    if (accurateArcCorners) {
        arcLengths = segments.map((seg, i) => {
            const prev = segments[i === 0 ? segments.length - 1 : i - 1].to;
            if (seg.type === 'Arc') {
                const t1 = angleTo(seg.center, prev);
                const t2 = angleTo(seg.center, seg.to);
                let bt = angleBetween(t1, t2, seg.clockwise);
                if (closeEnough(bt, 0)) {
                    bt = Math.PI * 2;
                }
                const r = dist(seg.center, prev);
                const arcLength = bt * r;
                return arcLength;
            } else {
                return dist(seg.to, prev);
            }
        });
    }

    const points: Array<Coord> = [];
    // let prev = segments[segments.length - 1].to;
    segments.forEach((seg, i) => {
        const pi = i === 0 ? segments.length - 1 : i - 1;
        const prev = segments[pi].to;
        if (seg.type === 'Arc') {
            const t1 = angleTo(seg.center, prev);
            const t2 = angleTo(seg.center, seg.to);
            const r = dist(seg.center, prev);

            if (arcLengths) {
                const smallest =
                    Math.min(
                        arcLengths[pi],
                        arcLengths[i],
                        // arcLengths[(i + 1) % segments.length],
                    ) / 4;
                const smright =
                    Math.min(
                        arcLengths[i],
                        arcLengths[(i + 1) % segments.length],
                    ) / 4;
                const sign = seg.clockwise ? 1 : -1;
                const t1a = t1 + (smallest / r) * sign;
                const t2a = t2 - (smright / r) * sign;
                points.push(push(seg.center, t1a, r));
                points.push(push(seg.center, t2a, r));
            } else {
                const bt = angleBetween(t1, t2, seg.clockwise);
                const subs = 10;
                // const subs = (bt * r) / (smallestArcLength / 10);
                for (let i = 1; i < subs; i++) {
                    const tm = t1 + (bt / subs) * i * (seg.clockwise ? 1 : -1);
                    const d = dist(seg.center, seg.to);
                    const midp = push(seg.center, tm, d);
                    points.push(midp);
                }
            }
            // const tm = t1 + (bt / 2) * (seg.clockwise ? 1 : -1);
            // const d = dist(seg.center, seg.to);
            // const midp = push(seg.center, tm, d);
            // points.push(midp);
        }
        points.push(seg.to);

        // prev = seg.to;
    });
    return points;
};

export function pointsAngles(points: Coord[]) {
    return points.map((point, i) => {
        const prev = i === 0 ? points[points.length - 1] : points[i - 1];
        return angleTo(prev, point);
    });
}

export function angleDifferences(angles: number[]) {
    return angles.map((angle, i) => {
        const prev = i === 0 ? angles[angles.length - 1] : angles[i - 1];
        return negPiToPi(angleBetween(prev, angle, true));
    });
}

export const totalAngle = (segments: Array<Segment>) => {
    const points = pathToPoints(segments, true);
    const angles = pointsAngles(points);
    const betweens = angleDifferences(angles);
    const relatives = betweens.map((between) =>
        between > Math.PI ? between - Math.PI * 2 : between,
    );
    let total = relatives.reduce((a, b) => a + b);
    return total;
};

export const isMaybeClockwise = (segments: Array<Segment>) => {
    const points = pathToPoints(segments);
    const angles = points.map((point, i) => {
        const prev = i === 0 ? points[points.length - 1] : points[i - 1];
        return angleTo(prev, point);
    });
    const betweens = angles.map((angle, i) => {
        const prev = i === 0 ? angles[angles.length - 1] : angles[i - 1];
        return angleBetween(prev, angle, true);
    });
    return betweens.some((a) => a < Math.PI);
};

export const isClockwise = (segments: Array<Segment>) => {
    if (segments.length === 1 && segments[0].type === 'Arc') {
        return segments[0].clockwise;
    }
    return totalAngle(segments) >= Math.PI - epsilon;
};

// export const toDegrees = (x: number) => Math.floor((x / Math.PI) * 180);

export const ensureClockwise = (segments: Array<Segment>) => {
    if (segments.length === 1 && segments[0].type === 'Arc') {
        return [{ ...segments[0], clockwise: true }];
    }
    if (segments.length < 2 || isClockwise(segments)) {
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
