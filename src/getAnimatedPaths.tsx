import {
    angleTo,
    applyMatrices,
    dist,
    Matrix,
    push,
    rotationMatrix,
    scale,
    scaleMatrix,
    transformsToMatrices,
    transformToMatrices,
    translationMatrix,
} from './getMirrorTransforms';
import { Coord, Path, Segment, State } from './types';
import { getSelectedIds } from './Canvas';
import { angleBetween } from './findNextSegments';
import { segmentsBounds, segmentsCenter } from './Export';
import { transformSegment } from './points';
import { pathToPoints } from './pathToPoints';
import { insetSegmentsBeta } from './insetPath';
import { cleanUpInsetSegments2 } from './findInternalRegions';
import { pathSegs } from './RenderPath';
// import { insetPath } from './insetPath';

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
const animationTimer = (
    t: number,
    weights: Array<number>,
    pause: number = 0, // in the same units as the weights.
): [number, number] => {
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

// export type RenderPrimitive = {
//     type: 'circle';
//     center: Coord;
//     radius: number;
//     color: string;
// };

export function getAnimatedPaths(
    state: State,
    scripts: ({
        key: string;
        fn: any;
        args: string[];
        phase: 'pre-inset' | 'post-inset';
        selection: { type: 'Path' | 'PathGroup'; ids: string[] } | undefined;
    } | null)[],
    currentAnimatedValues: { [key: string]: number },
) {
    const paths = { ...state.paths };
    // const primitives: Array<RenderPrimitive> = [];
    scripts.forEach((script) => {
        if (!script) {
            return;
        }

        const selectedIds = script.selection
            ? getSelectedIds(paths, script.selection)
            : null;
        let subset = paths;
        if (selectedIds) {
            subset = {};
            Object.keys(selectedIds).forEach((id) => (subset[id] = paths[id]));
        }
        const args = [
            subset,
            ...script!.args.map((arg) => currentAnimatedValues[arg] || 0),
        ];
        try {
            const result: unknown = script!.fn.apply(null, args);
            // if (result && Array.isArray(result)) {
            //     // primitives.push(...result);
            // }
        } catch (err) {
            console.error(err);
            console.log(`Bad fn invocation`, script!.key);
        }
        if (selectedIds) {
            Object.keys(selectedIds).forEach((id) => (paths[id] = subset[id]));
        }
    });
    return paths;
}

export function getAnimationScripts(state: State): ({
    key: string;
    fn: any;
    args: string[];
    phase: 'pre-inset' | 'post-inset';
    selection: { type: 'Path' | 'PathGroup'; ids: string[] } | undefined;
} | null)[] {
    return Object.keys(state.animations.scripts)
        .filter((k) => state.animations.scripts[k].enabled)
        .map((key) => {
            const script = state.animations.scripts[key];
            const line = script.code.match(
                /\s*\(((\s*\w+\s*,)+(\s*\w+)?\s*)\)\s*=>/,
            );
            if (!line) {
                console.log(`No match`);
                return null;
            }
            const args = line![1]
                .split(',')
                .map((m) => m.trim())
                .filter(Boolean);
            if (args[0] !== 'paths') {
                console.log('bad args', args);
                return null;
            }

            const builtins: { [key: string]: Function } = {
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
                closestPoint,
                farthestPoint,
                scaleInsets,
                modInsets,
                transformPath: (path: Path, tx: Array<Matrix>): Path => {
                    return {
                        ...path,
                        origin: applyMatrices(path.origin, tx),
                        segments: path.segments.map((s) =>
                            transformSegment(s, tx),
                        ),
                    };
                },
                followPath,
                insetPath,
                lerpPos,
            };

            try {
                const fn = new Function(
                    Object.keys(builtins).join(','),
                    'return ' + script.code,
                )(...Object.keys(builtins).map((k) => builtins[k]));
                return {
                    key,
                    fn,
                    args: args.slice(1),
                    phase: script.phase,
                    selection: script.selection,
                };
            } catch (err) {
                console.log('Bad fn');
                console.error(err);
                return null;
            }
        })
        .filter(Boolean);
}

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
