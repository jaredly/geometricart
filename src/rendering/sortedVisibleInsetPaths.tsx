import { coordKey, numKey } from './calcAllIntersections';
import { clipPath, closeEnough } from './clipPath';
import {
    cleanUpInsetSegments2,
    filterTooSmallSegments,
    findRegions,
    segmentsToNonIntersectingSegments,
} from './findInternalRegions';
import { angleBetween } from './findNextSegments';
import { pathToPrimitives } from '../editor/findSelection';
import { angleTo, dist, push } from './getMirrorTransforms';
import { insetSegmentsBeta, simplifyPath } from './insetPath';
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
import { ensureClockwise, isMaybeClockwise } from '../rendering/pathToPoints';
import { paletteColor } from '../editor/RenderPath';
import { Coord, Path, PathGroup, Segment } from '../types';

// This should produce:
// a list of lines
// and a list of fills
// lines come after fills? maybe? idk, that would make some things harder.

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
    Object.keys(paths).forEach((k) => {
        paths[k] = applyColorVariations(paths[k], rand);
    });
    let visible = Object.keys(paths)
        .filter(
            (k) =>
                !paths[k].hidden &&
                (!paths[k].group || !pathGroups[paths[k].group!].hide),
        )
        .sort((a, b) => {
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
        });

    if (hideDuplicatePaths) {
        const usedPaths: Array<Array<string>> = [];
        visible = visible.filter((k) => {
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

    /*
    If it's clip first, go through and clip the paths, leaving the styles.
    if it's inset first, go through and inset the paths, ... ok yeah that's fine.
    */
    let clipPrims = clip ? pathToPrimitives(clip) : null;

    let processed: Array<Path> = visible
        .map((k) => paths[k])
        .map((path) => {
            // if (path.debug) {
            //     console.log(`debug`, path);
            // }
            const group = path.group ? pathGroups[path.group] : null;
            if (selectedIds[path.id] && styleHover) {
                path = {
                    ...path,
                    style: applyStyleHover(styleHover, path.style),
                };
            }
            if (group?.insetBeforeClip) {
                return pathToInsetPaths(path)
                    .map((insetPath) => {
                        return clip
                            ? clipPath(
                                  insetPath,
                                  clip,
                                  clipPrims!,
                                  group?.clipMode,
                              )
                            : insetPath;
                    })
                    .flat();
            } else if (clip) {
                return clipPath(path, clip, clipPrims!, group?.clipMode)
                    .map((clipped) => pathToInsetPaths(clipped))
                    .flat();
            } else {
                return pathToInsetPaths(path);
            }
        })
        .flat();
    // processed.forEach((p) => {
    //     if (p.debug) {
    //         console.log('debug processed', p);
    //     }
    // });

    if (laserCutPalette) {
        // processed paths are singles at this point
        let red = processed.filter((path) => {
            if (path.style.lines.length !== 1) {
                return;
            }
            const color = paletteColor(
                laserCutPalette,
                path.style.lines[0]?.color,
            );
            return color === 'red';
        });
        let blue = processed.filter((path) => {
            if (path.style.lines.length !== 1) {
                return;
            }
            const color = paletteColor(
                laserCutPalette,
                path.style.lines[0]?.color,
            );
            return color === 'blue';
        });
        let others = processed.filter((path) => {
            if (path.style.lines.length !== 1) {
                return true;
            }
            const color = paletteColor(
                laserCutPalette,
                path.style.lines[0]?.color,
            );
            return color !== 'red' && color !== 'blue';
        });

        let used: { red: Used; blue: Used } = { red: {}, blue: {} };
        // Register all arc segments.
        red.forEach((path, pi) => addToUsed(path, used.red, pi));
        blue.forEach((path, pi) => addToUsed(path, used.blue, pi));

        red = red
            .map((path, pi) => removeFullOverlaps(path, pi, used.red))
            .flat();
        blue = blue
            .map((path, pi) =>
                removeFullOverlaps(path, pi, used.blue, used.red),
            )
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
            .map((path, pi) =>
                removePartialOverlaps(path, pi, used.blue, used.red),
            )
            .flat();

        return others.concat(blue).concat(red);
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

export const pathToInsetPaths = (path: Path): Array<Path> => {
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
            if (!inset || inset < 0.005) {
                return [path];
            }
            // if (path.debug) {
            //     console.log('ok single', path, inset);
            // }
            // console.log('INSETS');

            const segments = insetSegmentsBeta(path.segments, inset / 100);
            const regions = cleanUpInsetSegments2(segments);
            if (path.debug) {
                const result = segmentsToNonIntersectingSegments(
                    filterTooSmallSegments(segments),
                );
                const regions = findRegions(result.result, result.froms).filter(
                    isMaybeClockwise,
                );

                return regions.map((segments) => ({
                    ...path,
                    segments,
                    origin: segments[segments.length - 1].to,
                }));
            }
            // if (path.debug) {
            //     console.log('seg', segments);
            //     console.log('regions', regions);
            // }
            // // console.log('insets', regions.length);
            // if (path.debug && !regions.length) {
            //     console.log(inset, 'dropping debug path, no regions');
            //     console.log(segments);
            // }

            return regions.map((segments) => ({
                ...path,
                segments,
                origin: segments[segments.length - 1].to,
            }));

            // const result = insetPath(path, inset / 100);
            // if (!result) {
            //     return [];
            // }
            // return pruneInsetPath(result.segments, path.debug)
            //     .filter((s) => s.length)
            //     .map((segments) => ({
            //         ...result,
            //         segments,
            //         origin: segments[segments.length - 1].to,
            //     }));
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
function applyColorVariations(
    path: Path,
    rand: { next: (min: number, max: number) => number },
) {
    path = {
        ...path,
        style: {
            ...path.style,
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
