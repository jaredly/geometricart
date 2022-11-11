import { coordKey, numKey } from './coordKey';
import { closeEnough } from './clipPath';
import {
    cleanUpInsetSegments2,
    filterTooSmallSegments,
    findRegions,
    removeNonWindingRegions,
} from './findInternalRegions';
import { segmentsToNonIntersectingSegments } from './segmentsToNonIntersectingSegments';
import { angleBetween } from './findNextSegments';
import { pathToPrimitives } from '../editor/findSelection';
import {
    angleTo,
    dist,
    Matrix,
    push,
    rotationMatrix,
    transformsToMatrices,
    translationMatrix,
} from './getMirrorTransforms';
import { insetSegments, insetSegmentsBeta } from './insetPath';
import { simplifyPath } from './simplifyPath';
import {
    angleIsBetween,
    closeEnoughAngle,
    lineToSlope,
    slopeToLine,
    withinLimit,
} from './intersect';
import { applyStyleHover, StyleHover } from '../editor/MultiStyleForm';
import {
    pathsAreIdentical,
    pathToReversedSegmentKeys,
    pathToSegmentKeys,
} from './pathsAreIdentical';
import {
    ensureClockwise,
    isClockwise,
    isMaybeClockwise,
    reversePath,
} from '../rendering/pathToPoints';
import { paletteColor } from '../editor/RenderPath';
import { Coord, Path, PathGroup, Segment } from '../types';
import { segmentsBounds } from '../editor/Bounds';
import { cleanUpInsetSegments3, clipPathTry } from './clipPathNew';
import { transformSegment } from './points';

// This should produce:
// a list of lines
// and a list of fills
// lines come after fills? maybe? idk, that would make some things harder.

/**
 * Rotated so s[0].to - s[1].to is at the origin heading along the positive x axis.
 * Returns the reverse transform matrix as well.
 *
 * NOTE That I'm not messing with scaling at the moment.
 */
const normalizedPath = (
    segments: Array<Segment>,
): [Array<Segment>, Array<Matrix>] | null => {
    if (segments.length < 2) {
        return null;
    }
    const p1 = segments[0].to;
    const theta = angleTo(p1, segments[1].to);
    const forward = [
        translationMatrix({ x: -p1.x, y: -p1.y }),
        rotationMatrix(-theta),
    ];
    // console.log(p1);
    const backward = [rotationMatrix(theta), translationMatrix(p1)];
    const normalized = segments.map((s) => transformSegment(s, forward));
    return [normalized, backward];
};
type InsetCache = {
    [key: string]: {
        segments: Array<Segment>;
        insets: {
            [k: number]: Array<Array<Segment>>;
        };
    };
};

export function sortedVisibleInsetPaths(
    paths: { [key: string]: Path },
    pathGroups: { [key: string]: PathGroup },
    rand: { next: (min: number, max: number) => number },
    clip?: Array<Segment>,
    hideDuplicatePaths?: boolean,
    laserCutPalette?: Array<string>,
    styleHover?: StyleHover,
    selectedIds: { [key: string]: boolean } = {},
): Array<Path> {
    paths = { ...paths };

    const insetCache: InsetCache = {};

    const now = performance.now();
    Object.keys(paths).forEach((k) => {
        paths[k] = applyColorVariations(paths[k], rand);
        const norm = normalizedPath(paths[k].segments);
        if (norm) {
            const key = pathToSegmentKeys(
                norm[0][norm[0].length - 1].to,
                norm[0],
            ).join(':');
            if (!insetCache[key]) {
                insetCache[key] = { segments: norm[0], insets: {} };
            }
            paths[k].normalized = {
                key: key,
                transform: norm[1],
            };
        }
    });
    // console.log(performance.now() - now);

    let visible = Object.keys(paths)
        .filter(
            (k) =>
                !paths[k].hidden &&
                (!paths[k].group || !pathGroups[paths[k].group!].hide),
        )
        .sort(sortByOrdering(paths, pathGroups));

    if (hideDuplicatePaths) {
        visible = removeDuplicatePaths(visible, paths);
    }

    /*
    If it's clip first, go through and clip the paths, leaving the styles.
    if it's inset first, go through and inset the paths, ... ok yeah that's fine.
    */

    let processed: Array<Path> = visible
        .map((k) => paths[k])
        .map(
            processOnePath(
                pathGroups,
                selectedIds,
                styleHover,
                clip,
                insetCache,
            ),
        )
        .flat();

    if (laserCutPalette) {
        return sortForLaserCutting(processed, laserCutPalette);
    }

    return processed;
}

export const addToUsed = (path: Path, used: Used, pi: number) => {
    path.segments.forEach((seg, i) => {
        const prev = i === 0 ? path.origin : path.segments[i - 1].to;
        const [key, limit] = segmentKeyAndLimit(prev, seg);
        if (!used[key]) {
            used[key] = [];
        }
        used[key].push([limit, pi]);
    });
};

// const reduced: Used = {};
// Object.keys(used.red).forEach((key) => {
//     reduced[key] = used.red[key].filter(
//         ([limit, i]) =>
//             !used.red[key].some(([l2, i2]) =>
//                 isEntirelyWithinInner(limit, i, l2, i2, false),
//             ),
//     );
// });
// console.log(reduced);

type Uses = Array<[[number, number], number]>;
type Used = { [centerRad: string]: Uses };

export const pathToInsetPaths = (
    path: Path,
    insetCache: InsetCache,
): Array<Path> => {
    const singles: Array<[Path, number | undefined]> = [];
    path.style.fills.forEach((fill, i) => {
        if (!fill) {
            return;
        }

        singles.push([
            {
                ...path,
                style: {
                    fills: [{ ...fill, inset: undefined, originalIdx: i }],
                    lines: [],
                },
            },
            fill.inset,
        ]);
    });
    path.style.lines.forEach((line, i) => {
        if (!line) {
            return;
        }
        singles.push([
            {
                ...path,
                style: {
                    lines: [{ ...line, inset: undefined, originalIdx: i }],
                    fills: [],
                },
            },
            line.inset,
        ]);
    });
    // const result = insetPath(path)
    return singles
        .map(([path, inset]) => {
            if (!inset || Math.abs(inset) < 0.005) {
                return [path];
            }

            if (path.normalized && insetCache[path.normalized.key]) {
                if (!insetCache[path.normalized.key].insets[inset / 100]) {
                    const [segments, corners] = insetSegments(
                        insetCache[path.normalized.key].segments,
                        inset / 100,
                    );
                    const regions = cleanUpInsetSegments2(segments, corners);
                    insetCache[path.normalized.key].insets[inset / 100] =
                        regions;
                }
                const transform = path.normalized.transform;
                return insetCache[path.normalized.key].insets[inset / 100].map(
                    (region) => {
                        // const segments = region;
                        const segments = region.map((seg) =>
                            transformSegment(seg, transform),
                        );
                        return {
                            ...path,
                            segments,
                            origin: segments[segments.length - 1].to,
                        };
                    },
                );
            }

            const [segments, corners] = insetSegments(
                path.segments,
                inset / 100,
            );
            const regions = cleanUpInsetSegments2(segments, corners);

            return regions.map((segments) => ({
                ...path,
                segments,
                origin: segments[segments.length - 1].to,
            }));
        })
        .flat();
};

export const segmentKeyAndLimit = (
    prev: Coord,
    seg: Segment,
): [string, [number, number]] => {
    if (seg.type === 'Line') {
        const si = lineToSlope(prev, seg.to, true);
        const key = `l:${numKey(si.m)}:${numKey(si.b)}`;
        return [key, si.limit!];
    } else {
        const key = `${coordKey(seg.center)}:${numKey(
            dist(seg.center, seg.to),
        )}`;
        let t0 = angleTo(seg.center, prev);
        let t1 = angleTo(seg.center, seg.to);
        if (!seg.clockwise) {
            [t0, t1] = [t1, t0];
        }
        return [key, [t0, t1]];
    }
};

// Is l1 inside of l2?
export const isEntirelyWithinInner = (
    l1: [number, number],
    i1: number,
    l2: [number, number],
    i2: number,
    otherWins: boolean,
    angle: boolean,
) => {
    if (i1 === i2) {
        return false;
    }
    if (angle) {
        if (closeEnoughAngle(l1[0], l2[0]) && closeEnoughAngle(l1[1], l2[1])) {
            return otherWins || i1 < i2;
        }

        return angleIsBetween(l1[0], l2) && angleIsBetween(l1[1], l2);
    }
    if (closeEnough(l1[0], l2[0]) && closeEnough(l1[1], l2[1])) {
        return otherWins || i1 < i2;
    }
    angleIsBetween;
    return withinLimit(l2, l1[0]) && withinLimit(l2, l1[1]);
};

export const isEntirelyWithin = (
    key: string,
    limit: [number, number],
    // prev: Coord,
    // seg: Segment,
    pi: number,
    used: Used,
    otherWins: boolean,
    angle: boolean,
) => {
    if (!used[key]) {
        return false;
    }
    return used[key].some(([limit2, i2]) =>
        isEntirelyWithinInner(limit, pi, limit2, i2, otherWins, angle),
    );
};

export const removeFullOverlaps = (
    path: Path,
    pi: number,
    used: Used,
    other?: Used,
) => {
    const finished: Array<Path> = [];
    let current: Path = { ...path, segments: [], open: true };
    let droppedAny = false;
    path.segments.forEach((seg, i) => {
        const prev = i === 0 ? path.origin : path.segments[i - 1].to;

        const [key, limit] = segmentKeyAndLimit(prev, seg);

        const shouldDrop =
            isEntirelyWithin(key, limit, pi, used, false, seg.type === 'Arc') ||
            (other &&
                isEntirelyWithin(
                    key,
                    limit,
                    pi,
                    other,
                    true,
                    seg.type === 'Arc',
                ));
        if (shouldDrop) {
            droppedAny = true;
            // finish off the current one
            if (current.segments.length) {
                finished.push(current);
            }
            // start a new one at this one's end
            current = {
                ...path,
                open: true,
                segments: [],
                origin: seg.to,
            };
            return;
        }

        // Otherwise.... check to see if the start is contained within another (and not just equal to the endpoint?...)
        // hrm this could get dicey.
        // Ok, so find the other one, that contains t0, whose t1 is closest (clockwise) to our t1. Their t1 is our new t0. Same with t1, but reversed.
        // Then, ensure that

        current.segments.push(seg);
    });
    if (droppedAny) {
        return current.segments.length ? finished.concat([current]) : finished;
    } else {
        return [path];
    }
};

export const findNewLower = (lower: number, seg: Segment, other: Uses) => {
    if (seg.type === 'Line') {
        let max = null;
        for (let [limit, _] of other) {
            if (withinLimit(limit, lower)) {
                max = max != null ? Math.max(max, limit[1]) : limit[1];
            }
        }
        return max;
    } else {
        let max = null;
        for (let [limit, _] of other) {
            if (angleIsBetween(lower, limit)) {
                let dt = angleBetween(lower, limit[1], true);
                if (max == null || max[0] < dt) {
                    max = [dt, limit[1]];
                }
            }
        }
        return max ? max[1] : null;
    }
};

export const findNewUpper = (upper: number, seg: Segment, other: Uses) => {
    if (seg.type === 'Line') {
        let min = null;
        for (let [limit, _] of other) {
            if (withinLimit(limit, upper)) {
                min = min != null ? Math.min(min, limit[0]) : limit[0];
            }
        }
        return min;
    } else {
        let min = null;
        for (let [limit, _] of other) {
            if (angleIsBetween(upper, limit)) {
                let dt = angleBetween(limit[0], upper, true);
                if (min == null || min[0] < dt) {
                    min = [dt, limit[0]];
                }
            }
        }
        return min ? min[1] : null;
    }
};

export const isUpOrToTheRight = (p1: Coord, p2: Coord) => {
    if (closeEnough(p1.x, p2.x)) {
        return p1.y > p2.y;
    }
    return p1.x > p2.x;
};

export const adjustSeg = (
    prev: Coord,
    segment: Segment,
    newLower: number | null,
    newUpper: number | null,
) => {
    if (segment.type === 'Line') {
        const si = lineToSlope(prev, segment.to, true);
        if (!si.limit) {
            throw new Error('no limit');
        }
        if (newLower) {
            si.limit[0] = newLower;
        }
        if (newUpper) {
            si.limit[1] = newUpper;
        }
        // nixed
        if (si.limit[0] > si.limit[1]) {
            return null;
        }
        let [p1, p2] = slopeToLine(si);
        if (isUpOrToTheRight(prev, segment.to)) {
            [p1, p2] = [p2, p1];
        }
        return { prev: p1, seg: { ...segment, to: p2 } };
    }

    let [t0, t1] = [
        angleTo(segment.center, prev),
        angleTo(segment.center, segment.to),
    ];
    if (!segment.clockwise) {
        [t0, t1] = [t1, t0];
    }
    let orig = angleBetween(t0, t1, true);
    if (newLower) {
        t0 = newLower;
    }
    if (newUpper) {
        t1 = newUpper;
    }
    // the endpoints have passed each other
    if (angleBetween(t0, t1, true) > orig) {
        return null;
    }
    const d = dist(segment.center, segment.to);
    let newPrev = push(segment.center, t0, d);
    let newTo = push(segment.center, t1, d);
    if (!segment.clockwise) {
        [newPrev, newTo] = [newTo, newPrev];
    }
    return { prev: newPrev, seg: { ...segment, to: newTo } };
};

export const removePartialOverlaps = (
    path: Path,
    pi: number,
    used: Used,
    other?: Used,
) => {
    const finished: Array<Path> = [];
    let current: Path = { ...path, segments: [], open: true };
    let droppedAny = false;
    path.segments.forEach((seg, i) => {
        const prev = i === 0 ? path.origin : path.segments[i - 1].to;

        const [key, limit] = segmentKeyAndLimit(prev, seg);

        const compare = (
            used[key] ? used[key].filter((o) => o[1] > pi) : []
        ).concat(other ? other[key] ?? [] : []);

        const newLower = findNewLower(limit[0], seg, compare);
        const newUpper = findNewUpper(limit[1], seg, compare);
        if (!newLower && !newUpper) {
            return current.segments.push(seg);
        }
        console.log(newUpper, newLower, limit);
        droppedAny = true;
        const newSeg = adjustSeg(prev, seg, newLower, newUpper);

        if (newSeg) {
            if (newLower) {
                if (current.segments.length) {
                    finished.push(current);
                }
                current = {
                    ...path,
                    open: true,
                    segments: [],
                    origin: newSeg.prev,
                };
            }
            current.segments.push(newSeg.seg);
        }

        if (newUpper) {
            if (current.segments.length) {
                finished.push(current);
            }
            current = {
                ...path,
                open: true,
                segments: [],
                origin: seg.to,
            };
        }
    });
    if (droppedAny) {
        return current.segments.length ? finished.concat([current]) : finished;
    } else {
        return [path];
    }
};

function processOnePath(
    pathGroups: { [key: string]: PathGroup },
    selectedIds: { [key: string]: boolean },
    styleHover: StyleHover | undefined,
    clip: Segment[] | undefined,
    insetCache: InsetCache,
): (value: Path, index: number, array: Path[]) => Path[] {
    const clipBounds = clip ? segmentsBounds(clip) : null;
    return (path) => {
        // if (path.debug) {
        //     console.log('hi');
        // }
        if (!isClockwise(path.segments)) {
            const segments = reversePath(path.segments);
            const origin = segments[segments.length - 1].to;
            path = { ...path, segments, origin };
        }
        // path = { ...path, segments: simplifyPath(path.segments) };
        const group = path.group ? pathGroups[path.group] : null;
        if (selectedIds[path.id] && styleHover) {
            path = {
                ...path,
                style: applyStyleHover(styleHover, path.style),
            };
        }

        if (group?.insetBeforeClip) {
            return pathToInsetPaths(path, insetCache)
                .map((insetPath) => {
                    return clip
                        ? clipPathTry(
                              insetPath,
                              clip,
                              clipBounds!,
                              path.debug,
                              group?.clipMode,
                          )
                        : insetPath;
                })
                .flat();
        } else if (clip) {
            return clipPathTry(
                path,
                clip,
                clipBounds!,
                path.debug,
                group?.clipMode,
            )
                .map((clipped) => pathToInsetPaths(clipped, insetCache))
                .flat();
        } else {
            return pathToInsetPaths(path, insetCache);
        }
    };
}

function sortForLaserCutting(processed: Path[], laserCutPalette: string[]) {
    // processed paths are singles at this point
    let red = processed.filter((path) => {
        if (path.style.lines.length !== 1) {
            return;
        }
        const color = paletteColor(laserCutPalette, path.style.lines[0]?.color);
        return color === 'red';
    });
    let blue = processed.filter((path) => {
        if (path.style.lines.length !== 1) {
            return;
        }
        const color = paletteColor(laserCutPalette, path.style.lines[0]?.color);
        return color === 'blue';
    });
    let others = processed.filter((path) => {
        if (path.style.lines.length !== 1) {
            return true;
        }
        const color = paletteColor(laserCutPalette, path.style.lines[0]?.color);
        return color !== 'red' && color !== 'blue';
    });

    let used: { red: Used; blue: Used } = { red: {}, blue: {} };
    // Register all arc segments.
    red.forEach((path, pi) => addToUsed(path, used.red, pi));
    blue.forEach((path, pi) => addToUsed(path, used.blue, pi));

    red = red.map((path, pi) => removeFullOverlaps(path, pi, used.red)).flat();
    blue = blue
        .map((path, pi) => removeFullOverlaps(path, pi, used.blue, used.red))
        .flat();

    // reset for the new, reduced paths
    used = { red: {}, blue: {} };
    red.forEach((path, pi) => addToUsed(path, used.red, pi));
    blue.forEach((path, pi) => addToUsed(path, used.blue, pi));

    // console.log(used);
    red = red
        .map((path, pi) => removePartialOverlaps(path, pi, used.red))
        .flat();
    blue = blue
        .map((path, pi) => removePartialOverlaps(path, pi, used.blue, used.red))
        .flat();

    return others.concat(blue).concat(red);
}

function removeDuplicatePaths(
    visible: string[],
    paths: { [key: string]: Path },
) {
    const usedPaths: Array<Array<string>> = [];
    return visible.filter((k) => {
        const path = paths[k];
        const segments = simplifyPath(ensureClockwise(path.segments));
        const forward = pathToSegmentKeys(path.origin, segments);
        const backward = pathToReversedSegmentKeys(path.origin, segments);
        if (
            usedPaths.some(
                (path) =>
                    pathsAreIdentical(path, backward) ||
                    pathsAreIdentical(path, forward),
            )
        ) {
            return false;
        }
        usedPaths.push(forward);
        return true;
    });
}

function sortByOrdering(
    paths: { [key: string]: Path },
    pathGroups: { [key: string]: PathGroup },
): ((a: string, b: string) => number) | undefined {
    return (a, b) => {
        const oa = paths[a].group
            ? pathGroups[paths[a].group!].ordering
            : paths[a].ordering;
        const ob = paths[b].group
            ? pathGroups[paths[b].group!].ordering
            : paths[b].ordering;
        if (oa === ob) {
            return 0;
        }
        if (oa == null) {
            return 1;
        }
        if (ob == null) {
            return -1;
        }
        return ob - oa;
    };
}

function applyColorVariations(
    path: Path,
    rand: { next: (min: number, max: number) => number },
) {
    path = {
        ...path,
        style: {
            ...path.style,
            lines: path.style.lines.map((line) => {
                if (line?.colorVariation != null) {
                    let lighten = line.lighten;
                    if (line.colorVariation) {
                        const off = rand.next(-1.0, 1.0) * line.colorVariation;
                        lighten = lighten != null ? lighten + off : off;
                    }
                    return {
                        ...line,
                        colorVariation: undefined,
                        lighten,
                    };
                }
                return line;
            }),
            fills: path.style.fills.map((fill) => {
                if (fill?.colorVariation != null) {
                    let lighten = fill.lighten;
                    if (fill.colorVariation) {
                        const off = rand.next(-1.0, 1.0) * fill.colorVariation;
                        lighten = lighten != null ? lighten + off : off;
                    }
                    return {
                        ...fill,
                        colorVariation: undefined,
                        lighten,
                    };
                }
                return fill;
            }),
        },
    };
    return path;
}
