import {angleBetween} from './findNextSegments';
import {angleTo, dist, push} from './getMirrorTransforms';
import {epsilon} from './intersect';
import {reverseSegment} from './pathsAreIdentical';
import {Coord, Segment} from '../types';
import {negPiToPi} from './clipPath';
import {closeEnough} from './epsilonToZero';
import {segmentKey} from './segmentKey';
import {pxToMM} from '../gcode/generateGcode';

export type RasterSeg = {
    from: Coord;
    to: Coord;
    points: Array<Coord>;
    skipped?: boolean;
    seg: Segment;
};

export const rasterSegPoints = (segs: RasterSeg[]) => {
    return segs.flatMap((seg) => seg.points);
};

export const pathToPoints = (
    segments: Array<Segment>,
    origin: null | Coord,
    accurateArcCorners = false,
    ppi?: number,
): RasterSeg[] => {
    let smallestArcLength = Infinity;
    segments.forEach((seg, i) => {
        if (seg.type === 'Arc') {
            const prev =
                i === 0 ? (origin ?? segments[segments.length - 1].to) : segments[i - 1].to;
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
            const prev =
                i === 0 ? (origin ?? segments[segments.length - 1].to) : segments[i - 1].to;
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

    const segmentPoints: Array<RasterSeg> = [];
    // let prev = segments[segments.length - 1].to;
    segments.forEach((seg, i) => {
        const prev = i === 0 ? (origin ?? segments[segments.length - 1].to) : segments[i - 1].to;
        if (seg.type === 'Arc') {
            const t1 = angleTo(seg.center, prev);
            const t2 = angleTo(seg.center, seg.to);
            const r = dist(seg.center, prev);

            if (arcLengths) {
                const prevAl =
                    i === 0
                        ? origin
                            ? Infinity
                            : arcLengths[segments.length - 1]
                        : arcLengths[i - 1];
                const smallest =
                    Math.min(
                        prevAl,
                        arcLengths[i],
                        // arcLengths[(i + 1) % segments.length],
                    ) / 4;
                const smright = Math.min(arcLengths[i], arcLengths[(i + 1) % segments.length]) / 4;
                const sign = seg.clockwise ? 1 : -1;
                const t1a = t1 + (smallest / r) * sign;
                const t2a = t2 - (smright / r) * sign;
                segmentPoints.push({
                    from: prev,
                    to: seg.to,
                    points: [push(seg.center, t1a, r), push(seg.center, t2a, r), seg.to],
                    seg,
                });
            } else {
                let bt = angleBetween(t1, t2, seg.clockwise);
                if (closeEnough(bt, 0)) {
                    bt = Math.PI * 2;
                    console.log('AK', t1, t2, r);
                }
                // const subs = 10;
                const radius = dist(seg.center, seg.to);
                const distance = bt * radius;
                const points: Coord[] = [];
                const subs = ppi ? pxToMM(distance, ppi) : 10;
                // const subs = (bt * r) / (smallestArcLength / 10);
                for (let i = 1; i < subs; i++) {
                    const tm = t1 + (bt / subs) * i * (seg.clockwise ? 1 : -1);
                    const midp = push(seg.center, tm, radius);
                    points.push(midp);
                }
                points.push(seg.to);
                segmentPoints.push({
                    from: prev,
                    to: seg.to,
                    points,
                    seg,
                });
            }
            // const tm = t1 + (bt / 2) * (seg.clockwise ? 1 : -1);
            // const d = dist(seg.center, seg.to);
            // const midp = push(seg.center, tm, d);
            // points.push(midp);
        } else if (seg.type === 'Quad') {
            const points: Coord[] = [];
            for (let i = 1; i < 10; i++) {
                points.push(getPointOnQuadraticBezierCurve(prev, seg.control, seg.to, i / 10));
            }
            segmentPoints.push({
                from: prev,
                to: seg.to,
                points,
                seg,
            });
        } else {
            segmentPoints.push({
                from: prev,
                to: seg.to,
                points: [seg.to],
                seg,
            });
        }

        // prev = seg.to;
    });
    if (!segmentPoints.length) {
        console.warn('wat', segments);
    }
    // console.log(`pathToPoints`, segments, origin, segmentPoints);
    return segmentPoints;
};

function getPointOnQuadraticBezierCurve(
    startPoint: Coord,
    controlPoint: Coord,
    endPoint: Coord,
    ratio: number,
) {
    return getLinearInterpolationPoint(
        getLinearInterpolationPoint(startPoint, controlPoint, ratio),
        getLinearInterpolationPoint(controlPoint, endPoint, ratio),
        ratio,
    );
}

function getLinearInterpolationPoint(startPoint: Coord, endPoint: Coord, ratio: number) {
    return {
        x: getLinearInterpolationValue(startPoint.x, endPoint.x, ratio),
        y: getLinearInterpolationValue(startPoint.y, endPoint.y, ratio),
    };
}

function getLinearInterpolationValue(startValue: number, endValue: number, ratio: number) {
    return startValue + (endValue - startValue) * ratio;
}

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
    const points = pathToPoints(segments, null, true);
    return totalAnglePoints(rasterSegPoints(points));
};

export const totalAnglePoints = (points: Coord[]) => {
    const angles = pointsAngles(points);
    const betweens = angleDifferences(angles);
    const relatives = betweens.map((between) =>
        between > Math.PI ? between - Math.PI * 2 : between,
    );
    let total = relatives.reduce((a, b) => a + b);
    return total;
};

export const isMaybeClockwise = (segments: Array<Segment>) => {
    const points = rasterSegPoints(pathToPoints(segments, null));
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

export const isClockwisePoints = (points: Coord[]) => {
    return totalAnglePoints(points) >= Math.PI - epsilon;
};

// export const toDegrees = (x: number) => Math.floor((x / Math.PI) * 180);

export const ensureClockwise = (segments: Array<Segment>) => {
    if (segments.length === 1 && segments[0].type === 'Arc') {
        return [{...segments[0], clockwise: true}];
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
