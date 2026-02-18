import {coordKey} from '../../../../rendering/coordKey';
import {Coord} from '../../../../types';
import {centroid} from '../../../findReflectionAxes';
import {shapeSegments} from '../../../getPatternData';
import {outerBoundary} from '../../../outerBoundary';
import {pathsFromSegments} from '../../../pathsFromSegments';
import {unique, joinAdjacentShapeSegments, edgesByEndpoint} from '../../../shapesFromSegments';
import {weaveIntersections2} from '../../../weaveIntersections';
import {Ctx, AnimCtx} from '../eval/evaluate';
import {ConcreteFillOrLine, Pattern, PatternContents, colorToRgb} from '../export-types';
import {sortCoordPair, coordPairKey} from '../utils/adjustShapes';
import {withShared, withLocals, barePathFromCoords} from '../utils/resolveMods';
import {resolveFill} from './renderPattern';

export const renderPatternWeave = (
    baseShapes: Coord[][],
    pattern: Pattern,
    contents: PatternContents & {type: 'weave'},
    ctx: Ctx,
    panim: AnimCtx,
) => {
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
    const paths = pathsFromSegments(allSegments, byEndPoint, outer);
    const fronts = Object.values(contents.styles).flatMap((m) =>
        m.disabled ? [] : Object.values(m.items),
    );

    const woven = weaveIntersections2(allSegments, paths);
    if (!woven) return;
    const maxPathId = woven.reduce((m, p) => Math.max(m, p.pathId ?? 0), 0);
    const minPathId = woven.reduce((m, p) => Math.min(m, p.pathId ?? 0), 0);

    const pwanim = withShared(withLocals(panim, {maxPathId}), contents.shared, true);

    const pathPoints: Record<string, Coord[]> = {};
    woven.forEach((item) => {
        const at = item.pathId ?? 'null';
        if (!pathPoints[at]) pathPoints[at] = [];
        pathPoints[at].push(...item.line);
    });
    const pathCenters = Object.fromEntries(
        Object.entries(pathPoints).map(([k, pts]) => [k, centroid(pts)]),
    );

    const animNone = withLocals(pwanim, {pathId: undefined, pathCenter: pathCenters.null});
    const stylesForPathId: Record<string, ConcreteFillOrLine[]> = {};
    stylesForPathId.null = fronts.map((style) => {
        return resolveFill(animNone, style);
    });

    for (let i = minPathId; i <= maxPathId; i++) {
        const anim: Ctx['anim'] = withLocals(pwanim, {
            pathId: i,
            pathCenter: pathCenters[i],
        });
        stylesForPathId[i] = fronts.map((style) => resolveFill(anim, style));
    }
    const maxLineWidthForPathId = Object.fromEntries(
        Object.entries(stylesForPathId).map(([key, lines]) => [
            key,
            lines.reduce(
                (max, line) =>
                    line.color == null ||
                    !line.line?.width ||
                    (line.enabled != null && !line.enabled)
                        ? max
                        : Math.max(max, line.line.width),
                0,
            ),
        ]),
    );

    woven.forEach(({line: points, pathId, masks}, i) => {
        if (!stylesForPathId[pathId ?? 'null']) {
            throw new Error(`not prepared for ${pathId}`);
        }
        stylesForPathId[pathId ?? 'null'].forEach((line, k) => {
            if (line.color == null || !line.line?.width || (line.enabled != null && !line.enabled))
                return;

            ctx.items.push({
                key: `elm-${i}--${k}`,
                type: 'path',
                shapes: [barePathFromCoords(points, true)],
                masks: masks.map(({line, pathId}) => ({
                    shape: barePathFromCoords(line, true),
                    strokeWidth: maxLineWidthForPathId[pathId ?? 'null'] * 0.01,
                })),
                opacity: line.opacity,
                // opacity: i % 10 === 0 ? 1 : 0.1,
                zIndex: line.zIndex,
                color: colorToRgb(line.color!),
                strokeWidth: line.line.width! * 0.01,
            });
        });
    });

    return;
};
