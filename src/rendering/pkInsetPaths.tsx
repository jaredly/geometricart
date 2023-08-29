import { PathKit, Path as PKPath } from 'pathkit-wasm';
import { StyleHover, applyStyleHover } from '../editor/MultiStyleForm';
import { Path, PathGroup, Segment } from '../types';
import { pathToSegmentKeys } from './pathsAreIdentical';
import {
    InsetCache,
    applyColorVariations,
    normalizedPath,
    pathToSingles,
    removeDuplicatePaths,
    sortByOrdering,
    sortForLaserCutting,
} from './sortedVisibleInsetPaths';
import { pkInset, pkPath, pkPathToSegments } from '../sidebar/NewSidebar';
import { transformSegment } from './points';
import { Bounds } from '../editor/GuideElement';
import { PK } from '../editor/pk';

export function pkSortedVisibleInsetPaths(
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

    const pkc = clip ? pkPath(PK, clip) : null;

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

    let visible = Object.keys(paths)
        .filter(
            (k) =>
                !paths[k].hidden &&
                (!paths[k].group || !pathGroups[paths[k].group!]?.hide),
        )
        .sort(sortByOrdering(paths, pathGroups));

    if (hideDuplicatePaths) {
        visible = removeDuplicatePaths(visible, paths);
    }

    let processed: Array<Path> = visible
        .map((k) => paths[k])
        .flatMap((path: Path): Path[] => {
            const pkp = pkPath(PK, path.segments, path.origin);
            const group = path.group ? pathGroups[path.group] : null;
            if (selectedIds[path.id] && styleHover) {
                path = {
                    ...path,
                    style: applyStyleHover(styleHover, path.style),
                };
            }

            if (group?.insetBeforeClip) {
                return pkPathToInsetPaths(PK, pkp, path, insetCache).flatMap(
                    ({ path, pkp }) => {
                        return consumePath(
                            PK,
                            pkc
                                ? pkClip(PK, pkp, pkc, path, group?.clipMode)
                                : pkp,
                            path,
                        );
                    },
                );
            } else if (pkc) {
                const res = pkClip(PK, pkp, pkc, path, group?.clipMode);
                return res
                    ? pkPathToInsetPaths(PK, res, path, insetCache).flatMap(
                          ({ path, pkp }) => consumePath(PK, pkp, path),
                      )
                    : [];
            } else {
                return pkPathToInsetPaths(PK, pkp, path, insetCache).flatMap(
                    ({ path, pkp }) => consumePath(PK, pkp, path),
                );
            }
        });
    pkc?.delete();

    if (laserCutPalette) {
        return sortForLaserCutting(processed, laserCutPalette);
    }

    return processed;
}

export const pkClip = (
    PK: PathKit,
    pkp: PKPath,
    clip: PKPath,
    path: Path,
    groupMode?: PathGroup['clipMode'],
): null | PKPath => {
    const clipMode = path.clipMode ?? groupMode;
    if (
        clipMode === 'none' ||
        (clipMode === 'fills' && path.style.fills.length)
    ) {
        return pkp; //consumePath(PK, pkp, path)
    }
    if (clipMode === 'remove') {
        console.warn('No totally doing? idk');
        const is = pkp.copy();
        is.op(clip, PK.PathOp.INTERSECT);
        const cmds = is.toCmds();
        is.delete();
        if (cmds.length) {
            pkp.delete();
            return null;
        }
        return pkp; //consumePath(PK, pkp, path)
    }

    // pkp.op(clip, PK.PathOp.UNION);
    // pkp.lineTo(0, 0);
    // pkp.lineTo(1, 1);
    // pkp.lineTo(1, 0);

    pkp.op(
        clip,
        clipMode === 'outside' ? PK.PathOp.DIFFERENCE : PK.PathOp.INTERSECT,
        // PK.PathOp.DIFFERENCE,
    );
    return pkp; //consumePath(PK, pkp, path)
};

export const pkPathToInsetPaths = (
    PK: PathKit,
    pkp: PKPath,
    path: Path,
    insetCache: InsetCache,
) => {
    const res = pathToSingles(path).map(([path, inset]) => {
        if (!inset || Math.abs(inset) < 0.005) {
            return { path, pkp: pkp.copy() };
        }
        if (path.debug) {
            console.log('insetting', path, inset);
        }

        // if (path.normalized && insetCache[path.normalized.key]) {
        //     if (!insetCache[path.normalized.key].insets[inset / 100]) {
        //         const pkp = pkPath(PK, path.segments, path.origin);
        //         pkInset(PK, pkp, inset);
        //         insetCache[path.normalized.key].insets[inset / 100] =
        //             pkPathToSegments(PK, pkp).map((s) => s.segments);
        //         pkp.delete();
        //     }
        //     const transform = path.normalized.transform;
        //     return insetCache[path.normalized.key].insets[inset / 100].map(
        //         (region) => {
        //             const segments = region.map((seg) =>
        //                 transformSegment(seg, transform),
        //             );
        //             return {
        //                 ...path,
        //                 segments,
        //                 origin: segments[segments.length - 1].to,
        //             };
        //         },
        //     );
        // }

        const pkpi = pkp.copy();
        pkInset(PK, pkpi, (inset / 100) * 2);
        // const regions = pkPathToSegments(PK, pkp);
        // pkp.delete();
        // return regions.map((region) => ({ ...path, ...region }));
        return { path, pkp: pkpi };
    });
    pkp.delete();
    return res;
};

export const consumePath = (
    PK: PathKit,
    pkp: PKPath | null,
    path: Path,
): Path[] => {
    if (!pkp) {
        return [];
    }
    const regions = pkPathToSegments(PK, pkp);
    pkp.delete();
    return regions.map((region) => ({ ...path, ...region }));
};
