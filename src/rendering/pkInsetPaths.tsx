import { PathKit, Path as PKPath } from 'pathkit-wasm';
import { applyStyleHover, StyleHover } from '../editor/MultiStyleForm';
import { PK } from '../editor/pk';
import { pkInset, pkPath, pkPathToSegments } from '../sidebar/NewSidebar';
import { Path, PathGroup, Segment, State } from '../types';
import { pathToSegmentKeys } from './pathsAreIdentical';
import {
    applyColorVariations,
    InsetCache,
    normalizedPath,
    pathToSingles,
    removeDuplicatePaths,
    sortByOrdering,
    sortForLaserCutting,
} from './sortedVisibleInsetPaths';

export const getClips = (state: State) => {
    return Object.keys(state.clips)
        .filter((k) => state.clips[k].active)
        .map((k) => state.clips[k]);
};

type PKC = { path: PKPath; outside: boolean; before?: boolean };

export function pkSortedVisibleInsetPaths(
    paths: { [key: string]: Path },
    pathGroups: { [key: string]: PathGroup },
    rand: { next: (min: number, max: number) => number },
    clips: State['clips']['l'][],
    hideDuplicatePaths?: boolean,
    laserCutPalette?: Array<string>,
    styleHover?: StyleHover,
    selectedIds: { [key: string]: boolean } = {},
    insetCache: PKInsetCache = {},
): Array<Path> {
    paths = { ...paths };
    console.log('doing sorted visible');

    const pkc = clips.map((c) => ({
        path: pkPath(PK, c.shape),
        outside: c.outside,
        before: c.defaultInsetBefore,
    }));

    Object.keys(paths).forEach((k) => {
        paths[k] = applyColorVariations(paths[k], rand);
        const norm = normalizedPath(paths[k].segments);
        if (norm) {
            const key = pathToSegmentKeys(
                norm[0][norm[0].length - 1].to,
                norm[0],
            ).join(':');
            if (!insetCache[key]) {
                insetCache[key] = {
                    normalized: pkPath(PK, norm[0]),
                    insets: {},
                };
            }
            paths[k].normalized = {
                key: key,
                transform: norm[1],
            };
        }
    });

    let visible = getVisiblePaths(paths, pathGroups);

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

            const pre = pkc.filter((c) => !c.before);
            const post = pkc.filter((c) => c.before);
            // console.log('visibles');

            if (group?.insetBeforeClip != null) {
                if (group.insetBeforeClip) {
                    return pkPathToInsetPaths(
                        PK,
                        pkp,
                        path,
                        insetCache,
                    ).flatMap(({ path, pkp }) => {
                        return consumePath(
                            PK,
                            pkClips(PK, pkp, pkc, path, group?.clipMode)[0],
                            path,
                        );
                    });
                } else {
                    const [res, changed] = pkClips(
                        PK,
                        pkp,
                        pkc,
                        path,
                        group?.clipMode,
                    );
                    return res
                        ? pkPathToInsetPaths(
                              PK,
                              res,
                              path,
                              changed ? {} : insetCache,
                          ).flatMap(({ path, pkp }) =>
                              consumePath(PK, pkp, path),
                          )
                        : [];
                }
            } else {
                const [res, changed] = pkClips(
                    PK,
                    pkp,
                    pre,
                    path,
                    group?.clipMode,
                );
                return res
                    ? pkPathToInsetPaths(
                          PK,
                          res,
                          path,
                          changed ? {} : insetCache,
                      ).flatMap(({ path, pkp }) =>
                          consumePath(
                              PK,
                              pkClips(PK, pkp, post, path, group?.clipMode)[0],
                              path,
                          ),
                      )
                    : [];
                // } else {
                //     return pkPathToInsetPaths(PK, pkp, path, insetCache).flatMap(
                //         ({ path, pkp }) => consumePath(PK, pkp, path),
                //     );
            }
        });
    pkc.map((p) => p.path.delete());

    if (laserCutPalette) {
        return sortForLaserCutting(processed, laserCutPalette);
    }

    return processed;
}

export const pkClips = (
    PK: PathKit,
    pkp: PKPath,
    pkclips: PKC[],
    opath: Path,
    groupMode?: PathGroup['clipMode'],
): [null | PKPath, boolean] => {
    if (!pkclips.length) {
        return [pkp, false];
    }
    // console.log('pk clips', pkp, opath);
    const clipMode = opath.clipMode ?? groupMode;
    if (
        clipMode === 'none' ||
        (clipMode === 'fills' && opath.style.fills.length)
    ) {
        return [pkp, false]; //consumePath(PK, pkp, path)
    }

    const orig = pkp.toSVGString();
    for (let { path, outside } of pkclips) {
        if (clipMode === 'remove') {
            console.warn('No totally doing? idk');
            const is = pkp.copy();
            is.op(path, PK.PathOp.INTERSECT);
            const cmds = is.toCmds();
            is.delete();
            if (cmds.length) {
                pkp.delete();
                return [null, false];
            }
            continue;
        }

        pkp.op(path, outside ? PK.PathOp.DIFFERENCE : PK.PathOp.INTERSECT);
    }

    return [pkp, pkp.toSVGString() !== orig];
};

// export const pkClip = (
//     PK: PathKit,
//     pkp: PKPath,
//     clip: PKPath,
//     path: Path,
//     groupMode?: PathGroup['clipMode'],
// ): null | PKPath => {
//     const clipMode = path.clipMode ?? groupMode;
//     if (
//         clipMode === 'none' ||
//         (clipMode === 'fills' && path.style.fills.length)
//     ) {
//         return pkp;
//     }
//     if (clipMode === 'remove') {
//         console.warn('No totally doing? idk');
//         const is = pkp.copy();
//         is.op(clip, PK.PathOp.INTERSECT);
//         const cmds = is.toCmds();
//         is.delete();
//         if (cmds.length) {
//             pkp.delete();
//             return null;
//         }
//         return pkp;
//     }

//     pkp.op( clip, PK.PathOp.INTERSECT);
//     return pkp;
// };

export type PKInsetCache = {
    [key: string]: {
        normalized: PKPath;
        insets: { [k: number]: PKPath };
    };
};

export const pkPathToInsetPaths = (
    PK: PathKit,
    pkp: PKPath,
    path: Path,
    insetCache: PKInsetCache,
) => {
    // console.log('hm to inset paths');
    const res = pathToSingles(path).map(([path, inset]) => {
        if (!inset || Math.abs(inset) < 0.005) {
            return { path, pkp: pkp.copy() };
        }
        if (path.debug) {
            console.log('insetting', path, inset);
        }

        if (path.normalized && insetCache[path.normalized.key]) {
            if (!insetCache[path.normalized.key].insets[inset / 100]) {
                const pkpi = insetCache[path.normalized.key].normalized.copy();
                pkInset(PK, pkpi, (inset / 100) * 2);

                insetCache[path.normalized.key].insets[inset / 100] = pkpi;
            }
            const pkp =
                insetCache[path.normalized.key].insets[inset / 100].copy();
            path.normalized.transform.forEach((matrix) => {
                const [[a, b, c], [d, e, f]] = matrix;
                pkp.transform(a, b, c, d, e, f, 0, 0, 1);
            });

            return {
                path,
                pkp,
            };
        }

        const pkpi = pkp.copy();
        pkInset(PK, pkpi, (inset / 100) * 2);

        return { path, pkp: pkpi };
    });
    pkp.delete();
    // console.log('got some singles I guess', res);
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
export function getVisiblePaths(
    paths: { [key: string]: Path },
    pathGroups: { [key: string]: PathGroup },
) {
    return Object.keys(paths)
        .filter(
            (k) =>
                !paths[k].hidden &&
                (!paths[k].group || !pathGroups[paths[k].group!]?.hide),
        )
        .sort(sortByOrdering(paths, pathGroups));
}
