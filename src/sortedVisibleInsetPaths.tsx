import { ensureClockwise } from './CanvasRender';
import { clipPath, closeEnough } from './clipPath';
import { pathToPrimitives } from './findSelection';
import { angleTo, dist } from './getMirrorTransforms';
import {
    pathsAreIdentical,
    pathToReversedSegmentKeys,
    pathToSegmentKeys,
} from './pathsAreIdentical';
import { paletteColor } from './RenderPath';
import { insetPath, pruneInsetPath, simplifyPath } from './insetPath';
import { Coord, Path, PathGroup, Segment } from './types';
import { segmentKey, segmentKeyReverse } from './DrawPath';
import { coordKey, numKey } from './calcAllIntersections';
import { isAngleBetween } from './findNextSegments';

// This should produce:
// a list of lines
// and a list of fills
// lines come after fills? maybe? idk, that would make some things harder.

export function sortedVisibleInsetPaths(
    paths: { [key: string]: Path },
    pathGroups: { [key: string]: PathGroup },
    clip?: Array<Segment>,
    hideDuplicatePaths?: boolean,
    laserCutPalette?: Array<string>,
): Array<Path> {
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
            const group = path.group ? pathGroups[path.group] : null;
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
        type Used = { [centerRad: string]: Array<[number, number, number]> };
        const used: { red: Used; blue: Used } = { red: {}, blue: {} };

        // let usedSegments: { red: Array<string>; blue: Array<string> } = {
        //     red: [],
        //     blue: [],
        // };
        // ughhhhh ok this is a lot harder because i've simplified paths ....
        const addToUsed = (path: Path, used: Used, pi: number) => {
            path.segments.forEach((seg, i) => {
                const prev = i === 0 ? path.origin : path.segments[i - 1].to;
                if (seg.type === 'Arc') {
                    let t0 = angleTo(seg.center, prev);
                    let t1 = angleTo(seg.center, seg.to);
                    const key = `${coordKey(seg.center)}:${numKey(
                        dist(seg.center, seg.to),
                    )}`;
                    if (!used[key]) {
                        used[key] = [];
                    }
                    used[key].push(seg.clockwise ? [t0, t1, pi] : [t1, t0, pi]);
                }
            });
        };

        // Register all arc segments.
        red.forEach((path, pi) => addToUsed(path, used.red, pi));
        blue.forEach((path, pi) => addToUsed(path, used.blue, pi));

        const isEntirelyWithin = (
            prev: Coord,
            seg: Segment,
            pi: number,
            used: Used,
            otherWins: boolean,
        ) => {
            if (seg.type === 'Line') {
                // TODO:
                return false;
            }
            const key = `${coordKey(seg.center)}:${numKey(
                dist(seg.center, seg.to),
            )}`;
            let t0 = angleTo(seg.center, prev);
            let t1 = angleTo(seg.center, seg.to);
            if (!seg.clockwise) {
                [t0, t1] = [t1, t0];
            }
            if (
                used[key] &&
                used[key].find(([ot0, ot1, opi]) => {
                    if (opi === pi) {
                        return false;
                    }
                    // If exactly equal, the "lower id" number wins, I don't make the rules.
                    if (closeEnough(ot0, t0) && closeEnough(ot1, t1)) {
                        return otherWins || pi < opi;
                    }
                    return (
                        pi !== opi &&
                        isAngleBetween(ot0, t0, ot1, true) &&
                        isAngleBetween(ot0, t1, ot1, true)
                    );
                })
            ) {
                return true;
            }
            return false;
        };

        const removeOverlays = (
            path: Path,
            pi: number,
            used: Used,
            other?: Used,
        ) => {
            const finished: Array<Path> = [];
            let current: Path = { ...path, segments: [], open: true };
            // const used = usedSegments.red;
            path.segments.forEach((seg, i) => {
                const prev = i === 0 ? path.origin : path.segments[i - 1].to;
                const key = segmentKey(prev, seg);
                const keyRev = segmentKeyReverse(prev, seg);
                const shouldDrop =
                    isEntirelyWithin(prev, seg, pi, used, false) ||
                    (other && isEntirelyWithin(prev, seg, pi, other, true));
                if (shouldDrop) {
                    // console.log(`used!`, key);
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
                current.segments.push(seg);
            });
            if (finished.length) {
                return current.segments.length
                    ? finished.concat([current])
                    : finished;
            } else {
                return [path];
            }
        };

        red = red.map((path, pi) => removeOverlays(path, pi, used.red)).flat();
        blue = blue
            .map((path, pi) => removeOverlays(path, pi, used.blue, used.red))
            .flat();
        // return others.concat()
        return others.concat(blue).concat(red);
    }

    return processed;
}

export const pathToInsetPaths = (path: Path) => {
    const singles: Array<[Path, number | undefined]> = [];
    path.style.fills.forEach((fill) => {
        if (!fill) {
            return;
        }
        singles.push([
            {
                ...path,
                style: {
                    fills: [{ ...fill, inset: undefined }],
                    lines: [],
                },
            },
            fill.inset,
        ]);
    });
    path.style.lines.forEach((line) => {
        if (!line) {
            return;
        }
        singles.push([
            {
                ...path,
                style: {
                    lines: [{ ...line, inset: undefined }],
                    fills: [],
                },
            },
            line.inset,
        ]);
    });
    // const result = insetPath(path)
    return singles
        .map(([path, inset]) => {
            if (!inset) {
                return [path];
            }
            const result = insetPath(path, inset / 100);
            return pruneInsetPath(result.segments)
                .filter((s) => s.length)
                .map((segments) => ({
                    ...result,
                    segments,
                    origin: segments[segments.length - 1].to,
                }));
            // return [result];
        })
        .flat();
};
