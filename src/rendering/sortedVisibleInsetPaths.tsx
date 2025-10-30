import {paletteColor} from '../editor/RenderPath';
import {ensureClockwise} from '../rendering/pathToPoints';
import {Coord, Path, PathGroup, Segment} from '../types';
import {coordKey, numKey} from './coordKey';
import {closeEnough} from './epsilonToZero';
import {angleBetween} from './isAngleBetween';
import {
    angleTo,
    dist,
    Matrix,
    push,
    rotationMatrix,
    translationMatrix,
} from './getMirrorTransforms';
import {lineToSlope, slopeToLine} from './intersect';
import {withinLimit} from './epsilonToZero';
import {angleIsBetween, closeEnoughAngle} from './epsilonToZero';
import {pathsAreIdentical, pathToReversedSegmentKeys, pathToSegmentKeys} from './pathsAreIdentical';
import {pkSortedVisibleInsetPaths} from './pkInsetPaths';
import {transformSegment} from './points';
import {simplifyPath} from './simplifyPath';

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
export const normalizedPath = (
    segments: Array<Segment>,
): [Array<Segment>, Array<Matrix>] | null => {
    if (segments.length < 2) {
        return null;
    }
    const p1 = segments[0].to;
    const theta = angleTo(p1, segments[1].to);
    const forward = [translationMatrix({x: -p1.x, y: -p1.y}), rotationMatrix(-theta)];
    // console.log(p1);
    const backward = [rotationMatrix(theta), translationMatrix(p1)];
    const normalized = segments.map((s) => transformSegment(s, forward));
    return [normalized, backward];
};

export type InsetCache = {
    [key: string]: {
        segments: Array<Segment>;
        insets: {
            [k: number]: Array<Array<Segment>>;
        };
    };
};

const addToUsed = (path: Path, used: Used, pi: number) => {
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
type Used = {[centerRad: string]: Uses};

export const pathToSingles = (path: Path) => {
    const singles: Array<[Path, number | undefined]> = [];
    path.style.fills.forEach((fill, i) => {
        if (!fill) {
            return;
        }

        singles.push([
            {
                ...path,
                style: {
                    fills: [{...fill, inset: undefined, originalIdx: i}],
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
                    lines: [{...line, inset: undefined, originalIdx: i}],
                    fills: [],
                },
            },
            line.inset,
        ]);
    });
    return singles;
};

const segmentKeyAndLimit = (prev: Coord, seg: Segment): [string, [number, number]] => {
    if (seg.type === 'Line') {
        const si = lineToSlope(prev, seg.to, true);
        const key = `l:${numKey(si.m)}:${numKey(si.b)}`;
        return [key, si.limit!];
    } else if (seg.type === 'Quad') {
        throw new Error('quad not doing');
    } else {
        const key = `${coordKey(seg.center)}:${numKey(dist(seg.center, seg.to))}`;
        let t0 = angleTo(seg.center, prev);
        let t1 = angleTo(seg.center, seg.to);
        if (!seg.clockwise) {
            [t0, t1] = [t1, t0];
        }
        return [key, [t0, t1]];
    }
};

// Is l1 inside of l2?
const isEntirelyWithinInner = (
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

const isEntirelyWithin = (
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

const removeFullOverlaps = (path: Path, pi: number, used: Used, other?: Used) => {
    const finished: Array<Path> = [];
    let current: Path = {...path, segments: [], open: true};
    let droppedAny = false;
    path.segments.forEach((seg, i) => {
        const prev = i === 0 ? path.origin : path.segments[i - 1].to;

        const [key, limit] = segmentKeyAndLimit(prev, seg);

        const shouldDrop =
            isEntirelyWithin(key, limit, pi, used, false, seg.type === 'Arc') ||
            (other && isEntirelyWithin(key, limit, pi, other, true, seg.type === 'Arc'));
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

const findNewLower = (lower: number, seg: Segment, other: Uses) => {
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

const findNewUpper = (upper: number, seg: Segment, other: Uses) => {
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

const isUpOrToTheRight = (p1: Coord, p2: Coord) => {
    if (closeEnough(p1.x, p2.x)) {
        return p1.y > p2.y;
    }
    return p1.x > p2.x;
};

const adjustSeg = (
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
        return {prev: p1, seg: {...segment, to: p2}};
    }
    if (segment.type === 'Quad') {
        throw new Error('quad not doing');
    }

    let [t0, t1] = [angleTo(segment.center, prev), angleTo(segment.center, segment.to)];
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
    return {prev: newPrev, seg: {...segment, to: newTo}};
};

const removePartialOverlaps = (path: Path, pi: number, used: Used, other?: Used) => {
    const finished: Array<Path> = [];
    let current: Path = {...path, segments: [], open: true};
    let droppedAny = false;
    path.segments.forEach((seg, i) => {
        const prev = i === 0 ? path.origin : path.segments[i - 1].to;

        const [key, limit] = segmentKeyAndLimit(prev, seg);

        const compare = (used[key] ? used[key].filter((o) => o[1] > pi) : []).concat(
            other ? (other[key] ?? []) : [],
        );

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

export function sortForLaserCutting(processed: Path[], laserCutPalette: string[]) {
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

    let used: {red: Used; blue: Used} = {red: {}, blue: {}};
    // Register all arc segments.
    red.forEach((path, pi) => addToUsed(path, used.red, pi));
    blue.forEach((path, pi) => addToUsed(path, used.blue, pi));

    red = red.map((path, pi) => removeFullOverlaps(path, pi, used.red)).flat();
    blue = blue.map((path, pi) => removeFullOverlaps(path, pi, used.blue, used.red)).flat();

    // reset for the new, reduced paths
    used = {red: {}, blue: {}};
    red.forEach((path, pi) => addToUsed(path, used.red, pi));
    blue.forEach((path, pi) => addToUsed(path, used.blue, pi));

    // console.log(used);
    red = red.map((path, pi) => removePartialOverlaps(path, pi, used.red)).flat();
    blue = blue.map((path, pi) => removePartialOverlaps(path, pi, used.blue, used.red)).flat();

    return others.concat(blue).concat(red);
}

export function removeDuplicatePaths(visible: string[], paths: {[key: string]: Path}) {
    const usedPaths: Array<Array<string>> = [];
    return visible.filter((k) => {
        const path = paths[k];
        const segments = simplifyPath(ensureClockwise(path.segments));
        const forward = pathToSegmentKeys(path.origin, segments);
        const backward = pathToReversedSegmentKeys(path.origin, segments);
        if (
            usedPaths.some(
                (path) => pathsAreIdentical(path, backward) || pathsAreIdentical(path, forward),
            )
        ) {
            return false;
        }
        usedPaths.push(forward);
        return true;
    });
}

export function sortByOrdering(
    paths: {[key: string]: Path},
    pathGroups: {[key: string]: PathGroup},
): ((a: string, b: string) => number) | undefined {
    return (a, b) => {
        const oa = paths[a].group ? pathGroups[paths[a].group!]?.ordering : paths[a].ordering;
        const ob = paths[b].group ? pathGroups[paths[b].group!]?.ordering : paths[b].ordering;
        if (oa === ob) {
            const numa = a.startsWith('id-') ? +a.slice(3) : 0;
            const numb = b.startsWith('id-') ? +b.slice(3) : 0;
            if (!isNaN(numa) && !isNaN(numb)) {
                return numa - numb;
            }
            return 0;
        }
        if (oa == null) {
            return ob == null ? 0 : ob >= 0 ? 1 : -1;
        }
        if (ob == null) {
            return oa >= 0 ? -1 : 1;
        }
        return ob - oa;
    };
}

export function applyColorVariations(
    path: Path,
    rand: {next: (min: number, max: number) => number},
) {
    if (!path) {
        debugger;
    }
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

export const sortedVisibleInsetPaths = pkSortedVisibleInsetPaths;
