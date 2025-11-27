import {mulPos} from '../animation/mulPos';
import {boundsForCoords} from '../editor/Bounds';
import {
    applyTilingTransforms,
    applyTilingTransformsG,
    normalizeTilingShape,
    setTilingPoints,
    tilingPoints,
    transformShape,
} from '../editor/tilingPoints';
import {getShapeSize, initialTransform, tilingTransforms} from '../editor/tilingTransforms';
import {coordKey, numKey} from '../rendering/coordKey';
import {closeEnough, epsilon} from '../rendering/epsilonToZero';
import {
    applyMatrices,
    dist,
    scaleMatrix,
    translationMatrix,
} from '../rendering/getMirrorTransforms';
import {angleBetween} from '../rendering/isAngleBetween';
import {isClockwisePoints, pointsAngles} from '../rendering/pathToPoints';
import {BarePath, Coord, Segment, Tiling} from '../types';
import {colorShapes} from './patternColoring';
import {pk} from './pk';
import {
    cmpCoords,
    edgesByEndpoint,
    joinAdjacentShapeSegments,
    shapesFromSegments,
    unique,
} from './shapesFromSegments';
import {pathsFromSegments} from './pathsFromSegments';
import {outerBoundary} from './outerBoundary';
import {weaveIntersections} from './weaveIntersections';
import {transformBarePath, transformSegment} from '../rendering/points';
import {cropLines} from './screens/animator.screen/cropLines';
import {cmdsToSegments} from '../gcode/cmdsToSegments';
import {eigenShapeTransform, xyratio} from '../editor/eigenShapeTransform';
import {
    arcToCoords,
    arcToSegs,
    clipToPathData,
    pkPathWithCmds,
} from './screens/animator.screen/cropPath';
import {pkPathToSegments} from '../sidebar/pkClipPaths';
import {coordsEqual} from '../rendering/pathsAreIdentical';
import {evalQuad} from './screens/animator.screen/splitSegment';

export const cmdsForCoords = (coords: Coord[], open = true) => {
    return [
        pk.MOVE_VERB,
        coords[0].x,
        coords[0].y,
        ...coords.slice(1).flatMap(({x, y}) => [pk.LINE_VERB, x, y]),
        ...(open ? [] : [pk.CLOSE_VERB]),
    ];
};

export const pkPathFromCoords = (coords: Coord[], open = true) =>
    pk.Path.MakeFromCmds(cmdsForCoords(coords, open));

export const coordsFromPkPath = (cmds: Float32Array) => {
    const shapes: Coord[][] = [];

    let i = 0;
    while (i < cmds.length) {
        switch (cmds[i++]) {
            case pk.MOVE_VERB:
                shapes.push([{x: cmds[i++], y: cmds[i++]}]);
                break;
            case pk.LINE_VERB:
                shapes[shapes.length - 1].push({x: cmds[i++], y: cmds[i++]});
                break;
            case pk.CLOSE_VERB:
                break;
            default:
                throw new Error(`unknown cmd ${cmds[i - 1]} at ${i}`);
        }
    }

    return shapes;
};

export const pklip = (one: Coord[], two: Coord[]): Coord[][] | null => {
    if (!pk) {
        console.log('no pk');
        return null;
    }
    const ok = pkPathFromCoords(one)!;
    const tk = pkPathFromCoords(two)!;
    ok.op(tk, pk.PathOp.Intersect);
    tk.delete();
    const shapes = coordsFromPkPath(ok.toCmds());
    ok.delete();
    return shapes;
};

// 0.13,-0.87,0.62,-0.22
// 0.12,-0.87,0.62,-0.22

export const shapeBoundsKey = (coords: Coord[], msl: number) => {
    const by = 100 / msl;
    const bounds = boundsForCoords(
        ...coords.map(({x, y}) => ({
            x: Math.round(x * by) / by,
            y: Math.round(y * by) / by,
        })),
    );
    return `${bounds.x0.toFixed(2)},${bounds.y0.toFixed(2)},${bounds.x1.toFixed(2)},${bounds.y1.toFixed(2)}`;
};

const uniqueWithCount = <T,>(l: T[], k: (t: T) => string) => {
    const seen: Record<string, number> = {};
    const count: [] = [];
    const res: T[] = [];
    l.forEach((t) => {
        const key = k(t);
        if (key in seen) {
            count[seen[key]]++;
            return;
        }
        seen[key] = res.length;
        res.push(t);
    });
    return {res, count};
};

type ColorInfo = {
    duplicates: number[];
    colors: number[];
    maxColor: number;
};

type Shape = {
    id: number;
    points: Coord[];
    eigenPoints: number[];
};

export const preTransformTiling = (tiling: Tiling): Tiling => {
    const pts = tilingPoints(tiling.shape);
    const tx = normalizeTilingShape(pts);
    const bounds = pts.map((pt) => applyMatrices(pt, tx));
    return {
        ...tiling,
        shape: setTilingPoints({...tiling.shape}, bounds),
        cache: {
            ...tiling.cache,
            segments: tiling.cache.segments.map((seg) => ({
                prev: applyMatrices(seg.prev, tx),
                segment: transformSegment(seg.segment, tx),
            })),
            shapes: tiling.cache.shapes.map((shape) => transformBarePath(shape, tx)),
        },
    };
};

export const cropShapes = (
    shapes: Coord[][],
    crops?: {segments: Segment[]; hole?: boolean; rough?: boolean}[],
) => {
    if (!crops) return shapes.map((s) => [s]);
    let pks = shapes.map((shape) => pkPathFromCoords(shape)!);
    let remove = pks.map(() => false);
    const areas = crops.some((c) => c.rough) ? shapes.map(calcPolygonArea) : [];
    for (let crop of crops) {
        const clipPk = pkPathWithCmds(crop.segments[crop.segments.length - 1].to, crop.segments);
        pks.forEach((path, i) => {
            if (crop.rough) {
                const other = path.copy();
                other.op(clipPk, crop.hole ? pk.PathOp.Difference : pk.PathOp.Intersect);
                other.simplify();
                const size = pkPathToSegments(other)
                    .map(coordsFromBarePath)
                    .map(calcPolygonArea)
                    .reduce((a, b) => a + b, 0);
                if (size < areas[i] / 2 + epsilon) {
                    remove[i] = true;
                }
                // if (other.toCmds().length === 0) {
                //     remove[i] = true;
                // }
                other.delete();
            } else {
                path.op(clipPk, crop.hole ? pk.PathOp.Difference : pk.PathOp.Intersect);
                path.simplify();
            }
        });
        clipPk.delete();
    }
    return pks.map((pk, i) => {
        if (remove[i]) {
            pk.delete();
            return [];
        }
        pk.simplify();
        const items = pkPathToSegments(pk);
        pk.delete();
        return items.map(coordsFromBarePath);
        // return items.map((bp) => bp.segments.map((s) => s.to).concat([bp.origin]));
    });
};

export const coordsFromBarePath = (bp: BarePath) => {
    const coords: Coord[] = [bp.origin];
    bp.segments.forEach((seg, i) => {
        const prev = i === 0 ? bp.origin : bp.segments[i - 1].to;
        switch (seg.type) {
            case 'Line':
                coords.push(seg.to);
                break;
            case 'Arc':
                coords.push(...arcToCoords(prev, seg));
                break;
            case 'Quad':
                for (let i = 0; i < 10; i++) {
                    coords.push(evalQuad(prev, seg.control, seg.to, i / 10));
                }
                break;
        }
    });
    if (coordsEqual(coords[0], coords[coords.length - 1])) {
        coords.pop();
    }
    return coords;
};

const shapeSegments = (shape: Coord[]) => {
    return shape.map((c, i): [Coord, Coord] => [shape[i === 0 ? shape.length - 1 : i - 1], c]);
};

export type Crop = {segments: Segment[]; hole?: boolean; rough?: boolean};

export const getSimplePatternData = (tiling: Tiling, size: Coord | number) => {
    const bounds = tilingPoints(tiling.shape);
    const eigenSegments = tiling.cache.segments.map(
        (s) => [s.prev, s.segment.to] as [Coord, Coord],
    );

    const initialShapes = getInitialShapes(eigenSegments, tiling, bounds);

    const canons = initialShapes
        .map(joinAdjacentShapeSegments)
        .map(canonicalShape)
        .map((canon) => calcOverlap(canon, bounds));

    const minSegLength = Math.min(
        ...canons
            .map((c) => c.points)
            .flatMap(shapeSegments)
            .map(([a, b]) => dist(a, b))
            .filter((l) => l > 0.001),
    );

    const ttt = eigenShapeTransform(
        tiling.shape,
        bounds[2],
        bounds,
        typeof size === 'number' ? simpleSize(tiling, size) : size,
    );
    const transformedShapes = applyTilingTransformsG(initialShapes, ttt, transformShape);
    const uniqueShapes = unique(transformedShapes, (s) => shapeBoundsKey(s, minSegLength));

    return {initialShapes, minSegLength, canons, ttt, uniqueShapes};
};

const simpleSize = (tiling: Tiling, x: number) => {
    const bounds = tilingPoints(tiling.shape);
    const y = Math.round(Math.abs(xyratio(tiling.shape, bounds[2])) * x);
    return {x, y};
};

export const getShapeColors = (allShapes: Coord[][], minSegLength: number) => {
    const uniquePoints = unique(allShapes.flat(), coordKey);
    const pointNames = Object.fromEntries(uniquePoints.map((p, i) => [coordKey(p), i]));
    const colors = colorShapes(pointNames, allShapes, minSegLength, false);

    return {colors, pointNames, uniquePoints};
};

export const getNewPatternData = (tiling: Tiling, size = 2, crops?: Crop[]) => {
    const bounds = tilingPoints(tiling.shape);
    const {uniqueShapes, initialShapes, minSegLength, canons, ttt} = getSimplePatternData(
        tiling,
        simpleSize(tiling, size),
    );

    const allShapes = cropShapes(uniqueShapes, crops).flat();
    const allSegments = unique(
        allShapes
            .map(joinAdjacentShapeSegments)
            .flatMap(shapeSegments)
            .map(([a, b]): [Coord, Coord] =>
                (closeEnough(a.x, b.x) ? a.y > b.y : a.x > b.x) ? [b, a] : [a, b],
            ),
        ([a, b]) => `${coordKey(a)}:${coordKey(b)}`,
    );
    const byEndPoint = edgesByEndpoint(allSegments);

    const {pointNames, colors, uniquePoints} = getShapeColors(allShapes, minSegLength);

    const outer = outerBoundary(allSegments, byEndPoint, pointNames);
    const paths = pathsFromSegments(allSegments, byEndPoint, outer);
    const woven = weaveIntersections(allSegments, paths);

    return {
        bounds,
        uniquePoints,
        shapes: allShapes,
        eigenPoints: [],
        colorInfo: {colors, maxColor: Math.max(...colors)},
        allSegments,
        paths,
        outer,
        woven,

        initialShapes,
        minSegLength,
        canons,
        ttt,
    };
};

export type PatternData = ReturnType<typeof getPatternData>;
export const getPatternData = (
    tiling: Tiling,
    debug = false,
    size = 2,
    crops?: {segments: Segment[]; hole?: boolean}[],
) => {
    tiling = preTransformTiling(tiling);

    const pts = tilingPoints(tiling.shape);
    const eigenSegments = tiling.cache.segments.map(
        (s) => [s.prev, s.segment.to] as [Coord, Coord],
    );
    const eigenPoints = unique(eigenSegments.flat(), coordKey);

    const ttt = tilingTransforms(tiling.shape, pts[2], pts, getShapeSize(pts[2], size));

    const allSegments = unique(
        cropLines(
            applyTilingTransforms(eigenSegments, ttt)
                .map((seg) =>
                    cmpCoords(seg[0], seg[1]) === 1 ? ([seg[1], seg[0]] as [Coord, Coord]) : seg,
                )
                .map(([a, b]) => ({alpha: 1, points: [a, b]})),
            crops,
        ).map((one) => one.points as [Coord, Coord]),
        ([a, b]) => `${coordKey(a)}:${coordKey(b)}`,
    );

    const byEndPoint = edgesByEndpoint(allSegments);
    const shapes = shapesFromSegments(byEndPoint, eigenPoints);

    const canons = shapes
        .map(joinAdjacentShapeSegments)
        .map(canonicalShape)
        .map((canon) => calcOverlap(canon, pts));

    const transformedShapes = applyTilingTransformsG(shapes, ttt, transformShape);

    // const pointIds: Record<string, number> = {};
    // applyTilingTransformsG(
    //     eigenPoints.map((p, i) => ({p, i})),
    //     ttt,
    //     ({p, i}, tx) => ({p: applyMatrices(p, tx), i}),
    // ).map(({p, i}) => (pointIds[coordKey(p)] = i));
    // const shapePoints = shapes.map((shape) => shape.map((p) => pointIds[coordKey(p)]));

    const minSegLength = Math.min(
        ...eigenSegments.map(([a, b]) => dist(a, b)).filter((l) => l > 0.001),
    );

    const allShapes = unique(transformedShapes, (s) => shapeBoundsKey(s, minSegLength));

    const uniquePoints = unique(allShapes.flat(), coordKey);
    const pointNames = Object.fromEntries(uniquePoints.map((p, i) => [coordKey(p), i]));
    const outer = outerBoundary(allSegments, byEndPoint, pointNames);
    const paths = pathsFromSegments(allSegments, byEndPoint, outer);
    const woven = weaveIntersections(allSegments, paths);

    const colors = colorShapes(pointNames, allShapes, minSegLength, debug);

    return {
        bounds: pts,
        uniquePoints,
        initialShapes: shapes,
        shapes: allShapes,
        eigenPoints,
        // shapePoints,
        colorInfo: {colors, maxColor: Math.max(...colors)},
        allSegments,
        minSegLength,
        paths,
        outer,
        woven,
        canons,
        ttt,
    };
};

function getInitialShapes(eigenSegments: [Coord, Coord][], tiling: Tiling, pts: Coord[]) {
    const eigenPoints = unique(eigenSegments.flat(), coordKey);
    const allSegments = unique(
        applyTilingTransforms(eigenSegments, initialTransform(tiling.shape, pts[2], pts)).map(
            (seg) => (cmpCoords(seg[0], seg[1]) === 1 ? ([seg[1], seg[0]] as [Coord, Coord]) : seg),
        ),
        ([a, b]) => `${coordKey(a)}:${coordKey(b)}`,
    );

    const byEndPoint = edgesByEndpoint(allSegments);
    const bounds = pkPathFromCoords(pts)!;
    const shapes = shapesFromSegments(byEndPoint, eigenPoints).filter((shape) => {
        const p = pkPathFromCoords(shape)!;
        p.op(bounds, pk.PathOp.Intersect);
        const shapes = cmdsToSegments([...p.toCmds()]);
        p.delete();
        return shapes.filter((s) => s.segments.length).length;
    });
    bounds.delete();
    return shapes;
}

export function calcOverlap(canon: ReturnType<typeof canonicalShape>, pts: Coord[]) {
    const overlap = pklip(canon.points, pts) as null | Coord[][];
    const full = calcPolygonArea(canon.points);
    const showing = overlap ? overlap.map(calcPolygonArea).reduce((a, b) => a + b, 0) : 0;
    const percentage = showing / full;
    return {
        ...canon,
        percentage,
        overlap: overlap?.map((shape) => shape.map((coord) => applyMatrices(coord, canon.tx))),
    };
}

export function calcPolygonArea(vertices: Coord[]) {
    let total = 0;

    for (let i = 0, l = vertices.length; i < l; i++) {
        const addX = vertices[i].x;
        const addY = vertices[i === vertices.length - 1 ? 0 : i + 1].y;
        const subX = vertices[i === vertices.length - 1 ? 0 : i + 1].x;
        const subY = vertices[i].y;

        total += addX * addY * 0.5;
        total -= subX * subY * 0.5;
    }

    return Math.abs(total);
}

export const canonicalShape = (shape: Coord[]) => {
    if (!isClockwisePoints(shape)) {
        shape = shape.toReversed();
    }

    const lengths: number[] = shape.map((p, i) =>
        dist(p, shape[i === 0 ? shape.length - 1 : i - 1]),
    );
    const maxLength = Math.max(...lengths);
    const normlengths = lengths.map((l) => l / maxLength);

    const angles = pointsAngles(shape);
    const internalAngles = angles.map((a, i) =>
        angleBetween(angles[i === 0 ? angles.length - 1 : i - 1], a, true),
    );

    const rots = normlengths.map((_, i) => {
        const rotpoints = shape.slice(i).concat(shape.slice(0, i));
        const rotlengths = normlengths.slice(i).concat(normlengths.slice(0, i));
        const rotangles = internalAngles.slice(i).concat(internalAngles.slice(0, i));
        const key = rotlengths.map((l, i) => `${numKey(l)}:${numKey(rotangles[i])}`).join(';');
        // TODO: only do this for the last one
        const tx = [
            translationMatrix(mulPos(rotpoints[0], {x: -1, y: -1})),
            scaleMatrix(1 / maxLength, 1 / maxLength),
        ];
        const scaled = rotpoints.map((p) => applyMatrices(p, tx));
        // const moved = rotpoints.map((p) => applyMatrices(p, move));
        return {key, points: rotpoints, lengths: rotlengths, angles: rotangles, scaled, tx};
    });
    rots.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

    const first = rots[0];

    return first;
};
