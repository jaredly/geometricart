import {coordKey} from '../../../../rendering/coordKey';
import {Matrix} from '../../../../rendering/getMirrorTransforms';
import {Coord} from '../../../../types';
import {centroid} from '../../../findReflectionAxes';
import {collectAllPaths} from '../../../followPath';
import {shapeSegments} from '../../../getPatternData';
import {outerBoundary} from '../../../outerBoundary';
import {pathsFromSegments} from '../../../pathsFromSegments';
import {unique, joinAdjacentShapeSegments, edgesByEndpoint} from '../../../shapesFromSegments';
import {Ctx, AnimCtx, a} from '../eval/evaluate';
import {Pattern, PatternContents} from '../export-types';
import {sortCoordPair, coordPairKey} from '../utils/adjustShapes';
import {notNull} from '../utils/notNull';
import {first, matchKind} from './renderPattern';
import {renderPatternShape} from './renderPatternShape';
import {colorLines} from './colorLines';

export function renderPatternLines(
    baseShapes: Coord[][],
    pattern: Pattern,
    contents: PatternContents & {type: 'lines'},
    simple: {
        initialShapes: Coord[][];
        minSegLength: number;
        canons: {
            percentage: number;
            overlap: Coord[][] | undefined;
            key: string;
            points: Coord[];
            lengths: number[];
            angles: number[];
            scaled: Coord[];
            tx: Matrix[];
        }[];
        ttt: Matrix[][][];
        uniqueShapes: Coord[][];
        bounds: Coord[];
        eigenCorners: Coord[][];
    },
    ctx: Ctx,
    panim: AnimCtx,
) {
    const allSegments = unique(
        baseShapes
            .map(joinAdjacentShapeSegments)
            .flatMap(shapeSegments)
            .map((pair) => sortCoordPair(pair)),
        coordPairKey,
    );

    const byEndPoint = edgesByEndpoint(allSegments);

    const uniquePoints = unique(allSegments.flat(), coordKey);
    const pointNames = Object.fromEntries(uniquePoints.map((p, i) => [coordKey(p), i]));

    const outer = outerBoundary(allSegments, byEndPoint, pointNames);
    const links = pathsFromSegments(allSegments, byEndPoint, outer);
    let allPaths = collectAllPaths(links, allSegments);
    if (!contents.includeBorders) {
        allPaths = allPaths.filter((p) => p.pathId != null);
    }

    const maxPathId = allPaths.reduce((a, b) => Math.max(a, b.pathId ?? 0), 0);
    // ok so for each line, we need to maybe evaluate the style dealio?
    const orderedStyles = Object.values(contents.styles).sort((a, b) => a.order - b.order);

    const colors = colorLines(allPaths, simple.bounds, simple.ttt, ctx.log);
    const maxColor = Math.max(...colors.filter(notNull));
    let pathsWithGroups = allPaths.map((path, i) => ({...path, groupId: colors[i]}));

    if (contents.sort) {
        const fn = a.value(panim, contents.sort);
        if (typeof fn !== 'function') {
            panim.warn(`"sort" should be a function.`);
        } else if (fn.length === 2) {
            let warned = false;
            pathsWithGroups.sort((a, b) => {
                const res = fn(a, b);
                if (typeof res !== 'number') {
                    if (warned) {
                        panim.warn('"sort" with two arguments should return an number');
                        warned = true;
                    }
                    return 0;
                }
                return res;
            });
        } else if (fn.length === 1) {
            pathsWithGroups = fn(pathsWithGroups);
            if (!Array.isArray(pathsWithGroups)) {
                panim.warn('sort() with one argument should return an array');
            }
        }
    }

    // for alternating:
    // ignore anything without a pathId
    // then find paths that interesect with the eigenshape
    // do the ttt on them
    // make a map of coordPairKey -> number
    // for all other paths, step through their coord pairs until you find a hit
    ctx.items.push(
        ...pathsWithGroups.flatMap((path, i) => {
            const key = i + '';
            const center = centroid(path.points);

            const matchingStyles = orderedStyles.map((style) => {
                const match = Array.isArray(style.kind)
                    ? first(style.kind, (k) =>
                          matchKind(k, key, path.groupId ?? -1, center, simple.eigenCorners),
                      )
                    : matchKind(style.kind, key, path.groupId ?? -1, center, simple.eigenCorners);
                if (!match) {
                    return;
                }
                return {style, match};
            });
            return renderPatternShape(
                path.points,
                ctx,
                i,
                panim,
                {
                    ...path,
                    open: !!path.open,
                    maxPathId,
                    center,
                    key,
                    i,
                    maxI: allPaths.length - 1,
                    maxGroupId: maxColor,
                },
                matchingStyles.filter(notNull),
                path.open,
            );
        }),
    );

    return;
}
