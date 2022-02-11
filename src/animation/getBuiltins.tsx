import { applyMatrices, dist, Matrix } from '../rendering/getMirrorTransforms';
import { Coord, Path, Segment } from '../types';
import { transformSegment } from '../rendering/points';
import { pathToPoints } from '../rendering/pathToPoints';
import { insetSegmentsBeta } from '../rendering/insetPath';
import { cleanUpInsetSegments2 } from '../rendering/findInternalRegions';
import { pathSegs } from '../editor/RenderPath';
import {
    angleTo,
    push,
    rotationMatrix,
    scale,
    scaleMatrix,
    transformsToMatrices,
    transformToMatrices,
    translationMatrix,
} from '../rendering/getMirrorTransforms';
import { angleBetween } from '../rendering/findNextSegments';
import { segmentsBounds, segmentsCenter } from '../editor/Export';

export function getBuiltins(): { [key: string]: Function } {
    return {
        dist,
        push,
        scale,
        angleTo,
        angleBetween,
        segmentsBounds,
        segmentsCenter,
        transformSegment,
        applyMatrices,
        scaleMatrix,
        translationMatrix,
        rotationMatrix,
        transformsToMatrices,
        animationTimer,
        pathForSegments: pathSegs,
        rectPath: (c: Coord, size: Coord, color: string) => {
            const path = pathSegs([
                {
                    type: 'Line',
                    to: { x: c.x - size.x / 2, y: c.y - size.y / 2 },
                },
                {
                    type: 'Line',
                    to: { x: c.x + size.x / 2, y: c.y - size.y / 2 },
                },
                {
                    type: 'Line',
                    to: { x: c.x + size.x / 2, y: c.y + size.y / 2 },
                },
                {
                    type: 'Line',
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
        transformPath: (path: Path, tx: Array<Matrix>): Path => {
            return {
                ...path,
                origin: applyMatrices(path.origin, tx),
                segments: path.segments.map((s) => transformSegment(s, tx)),
            };
        },
        followPath,
        insetPath,
        lerpPos,
    };
}

export const insetPath = (path: Path, inset: number): Array<Path> => {
    const segments = insetSegmentsBeta(path.segments, inset / 100);
    const regions = cleanUpInsetSegments2(segments);

    return regions.map((segments) => ({
        ...path,
        segments,
        origin: segments[segments.length - 1].to,
    }));
};
const lerpPos = (p1: Coord, p2: Coord, percent: number) => {
    return {
        x: (p2.x - p1.x) * percent + p1.x,
        y: (p2.y - p1.y) * percent + p1.y,
    };
};

export const closestPoint = (center: Coord, segments: Array<Segment>) => {
    let best = null as null | [number, Coord];
    pathToPoints(segments).forEach((point) => {
        const d = dist(point, center);
        if (best == null || best[0] > d) {
            best = [d, point];
        }
    });

    return best;
};

export const farthestPoint = (center: Coord, segments: Array<Segment>) => {
    let best = null as null | [number, Coord];
    pathToPoints(segments).forEach((point) => {
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
        points = pathToPoints(path.segments);
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
