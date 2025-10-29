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
import {tilingTransforms} from '../editor/tilingTransforms';
import {coordKey, numKey} from '../rendering/coordKey';
import {closeEnough} from '../rendering/epsilonToZero';
import {
    applyMatrices,
    dist,
    Matrix,
    scaleMatrix,
    translationMatrix,
} from '../rendering/getMirrorTransforms';
import {angleBetween} from '../rendering/isAngleBetween';
import {isClockwisePoints, pointsAngles} from '../rendering/pathToPoints';
import {Coord, Tiling} from '../types';
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

const pkPathFromCoords = (coords: Coord[]) =>
    pk.Path.MakeFromCmds([
        pk.MOVE_VERB,
        coords[0].x,
        coords[0].y,
        ...coords.slice(1).flatMap(({x, y}) => [pk.LINE_VERB, x, y]),
    ]);

const coordsFromPkPath = (cmds: Float32Array) => {
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

const pklip = (one: Coord[], two: Coord[]): Coord[][] | null => {
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

export const shapeKey = (coords: Coord[], msl: number) => {
    const by = 100 / msl;
    const bounds = boundsForCoords(
        ...coords.map(({x, y}) => ({
            x: Math.round(x * by) / by,
            y: Math.round(y * by) / by,
        })),
    );
    return `${bounds.x0.toFixed(2)},${bounds.y0.toFixed(2)},${bounds.x1.toFixed(2)},${bounds.y1.toFixed(2)}`;
};

export const uniqueWithCount = <T,>(l: T[], k: (t: T) => string) => {
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
    return {...tiling, shape: setTilingPoints({...tiling.shape}, bounds)};
};

export const getPatternData = (tiling: Tiling, debug = false) => {
    tiling = preTransformTiling(tiling);

    const pts = tilingPoints(tiling.shape);
    const eigenSegments = tiling.cache.segments.map(
        (s) => [s.prev, s.segment.to] as [Coord, Coord],
    );
    const eigenPoints = unique(eigenSegments.flat(), coordKey);

    const ttt = tilingTransforms(tiling.shape, pts[2], pts);

    const allSegments = unique(
        applyTilingTransforms(eigenSegments, ttt).map((seg) =>
            cmpCoords(seg[0], seg[1]) === 1 ? ([seg[1], seg[0]] as [Coord, Coord]) : seg,
        ),
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

    const allShapes = unique(transformedShapes, (s) => shapeKey(s, minSegLength));

    const uniquePoints = unique(allShapes.flat(), coordKey);
    const pointNames = Object.fromEntries(uniquePoints.map((p, i) => [coordKey(p), i]));
    const outer = outerBoundary(allSegments, byEndPoint, pointNames);
    const paths = pathsFromSegments(allSegments, byEndPoint, outer);
    const woven = weaveIntersections(allSegments, paths);

    const colors = colorShapes(pointNames, allShapes, minSegLength, debug);

    return {
        bounds: pts,
        uniquePoints,
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

function calcPolygonArea(vertices: Coord[]) {
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

export function findCommonFractions(value: number) {
    const whole = Math.floor(value);
    if (value === whole) {
        return;
    }
    const decimal = value - whole;
    for (let num = 1; num < 100; num++) {
        for (let denom = 2; denom < 100; denom++) {
            //
            if (closeEnough(num / denom, decimal, 0.001)) {
                return {num: num + whole * denom, denom};
            }
        }
    }
}

const nums = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const denoms = '₀₁₂₃₄₅₆₇₈₉';
const slash = '⁄';

const getNumber = (n: number, digits: string) => {
    let res = '';
    while (n > 0) {
        const out = Math.floor(n / 10);
        res = digits[n - out * 10] + res;
        n = out;
    }
    return res;
};

export const humanReadableFraction = (value: number) => {
    if (closeEnough(Math.round(value), value, 0.001)) return Math.round(value) + '';
    const fract = findCommonFractions(value);
    if (fract) {
        const whole = Math.floor(fract.num / fract.denom);
        if (whole) {
            return `${whole} ${getNumber(fract.num - whole * fract.denom, nums)}${slash}${getNumber(fract.denom, denoms)}`;
        }
        return `${getNumber(fract.num, nums)}${slash}${getNumber(fract.denom, denoms)}`;
    }
    return value.toFixed(4);
};

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
        return {key, points: rotpoints, lengths: rotlengths, angles: rotangles, scaled, tx};
    });
    rots.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

    const first = rots[0];

    return first;
};
