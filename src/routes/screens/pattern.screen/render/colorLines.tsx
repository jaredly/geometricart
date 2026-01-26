import {boundsForCoords} from '../../../../editor/Bounds';
import {applyTilingTransformsG} from '../../../../editor/tilingPoints';
import {Matrix, applyMatrices} from '../../../../rendering/getMirrorTransforms';
import {Coord} from '../../../../types';
import {aabbContains} from '../../../shapesFromSegments';
import {coordPairs, coordPairKey} from '../utils/adjustShapes';
import {RenderLog, barePathFromCoords} from '../utils/resolveMods';
import {maybeAddItems} from './renderPattern';

export const colorLines = (
    lines: {points: Coord[]; pathId?: number}[],
    bounds: Coord[],
    ttt: Matrix[][][],
    debugLog?: RenderLog[],
) => {
    const byPair: Record<string, number> = {};
    const prec = 4;

    if (debugLog) {
        debugLog?.push({
            type: 'items',
            title: 'Lines',
            items: lines.map((line) => ({
                item: {type: 'shape', shape: barePathFromCoords(line.points, true)},
            })),
        });
    }

    // Find the lines that fall within the bounds
    const boundingBox = boundsForCoords(...bounds);
    const baseLines = lines.filter((line) => line.points.some((p) => aabbContains(boundingBox, p)));

    if (debugLog) {
        debugLog?.push({
            type: 'items',
            title: 'Base Lines',
            items: baseLines.map((line) => ({
                item: {type: 'shape', shape: barePathFromCoords(line.points, true)},
            })),
        });
    }

    const baseLog = maybeAddItems(debugLog, 'Base Lines Transformed');
    const dups: Record<number, number> = {};
    baseLines.forEach((line, i) => {
        const transformedLines = applyTilingTransformsG([line.points], ttt, (pts, tx) =>
            pts.map((p) => applyMatrices(p, tx)),
        );

        const keys = transformedLines.map((points) =>
            coordPairs(points, true).map((p) => coordPairKey(p, prec)),
        );
        for (let sub of keys) {
            for (let key of sub) {
                if (byPair[key] != null) {
                    dups[i] = byPair[key];
                    return;
                }
            }
        }

        baseLog?.push({
            item: transformedLines.map((points) => ({
                type: 'shape',
                shape: barePathFromCoords(points, true),
                hidePoints: true,
                noFill: true,
            })),
            text: `base line ${i}`,
        });

        keys.forEach((keys) => keys.forEach((key) => (byPair[key] = i)));
    });
    const remap: Record<number, number> = {};
    let at = 0;
    baseLines.forEach((_, i) => {
        if (dups[i] != null) {
            // remap[i] = remap[dups[i]];
        } else {
            remap[i] = at++;
        }
    });

    const matches = maybeAddItems(debugLog, 'Base Items');

    return lines
        .map((line, i) => {
            if (baseLines.includes(line)) {
                const at = baseLines.indexOf(line);
                return dups[at] ?? at;
            }

            for (let pair of coordPairs(line.points, true)) {
                const k = coordPairKey(pair, prec);
                if (byPair[k] != null) {
                    return byPair[k];
                }
            }
            return null;
        })
        .map((n) => (n != null ? remap[n] : n));
};
