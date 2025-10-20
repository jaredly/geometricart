import * as martinez from 'martinez-polygon-clipping';
import { mulPos } from '../animation/PointsEditor';
import { applyTilingTransforms, getTransform, tilingPoints } from '../editor/tilingPoints';
import { tilingTransforms } from '../editor/tilingTransforms';
import { coordKey, numKey } from '../rendering/coordKey';
import { closeEnough } from '../rendering/epsilonToZero';
import {
    applyMatrices,
    dist,
    scaleMatrix,
    translationMatrix
} from '../rendering/getMirrorTransforms';
import { angleBetween } from '../rendering/isAngleBetween';
import { pointsAngles } from '../rendering/pathToPoints';
import { Coord, Tiling } from '../types';
import { pk } from './pk';
import { shapesFromSegments, unique } from './shapesFromSegments';

const pkPathFromCoords = (coords: Coord[]) =>
    pk.Path.MakeFromCmds([
        pk.MOVE_VERB, coords[0].x, coords[0].y,
        ...coords.slice(1).flatMap(({x, y}) => [pk.LINE_VERB, x, y]),
    ]);

const coordsFromPkPath = (cmds: Float32Array) => {
    const shapes: Coord[][] = [];

    console.log(cmds)

    let i = 0;
    while (i < cmds.length) {
        switch (cmds[i++]) {
            case pk.MOVE_VERB:
                shapes.push([{x: cmds[i++], y: cmds[i++]}]);
                break
            case pk.LINE_VERB:
                shapes[shapes.length - 1].push({x: cmds[i++], y: cmds[i++]});
                break
            case pk.CLOSE_VERB:
                break
            default:
                throw new Error(`unknown cmd ${cmds[i- 1]} at ${i}`)
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

const marclip = (one: Coord[], two: Coord[]): Coord[][] | null => {
    const rawoverlap = martinez.intersection(
        [one.map(({x, y}) => [x, y])],
        [two.map(({x, y}) => [x, y])],
    );
    const overlap = rawoverlap?.flatMap((shapes) =>
        shapes.map((shape) => (shape as [number, number][]).map(([x, y]) => ({x, y}))),
    );
    return overlap;
};

export const getPatternData = (tiling: Tiling) => {
    const pts = tilingPoints(tiling.shape);
    const tx = getTransform(pts);
    const bounds = pts.map((pt) => applyMatrices(pt, tx));

    const marks: number[] = [];
    const ttt = tilingTransforms(tiling.shape, bounds[2], bounds);
    let eigenSegments = tiling.cache.segments.map((s) => [s.prev, s.segment.to] as [Coord, Coord]);
    // eigenSegments = splitOverlappingSegs(eigenSegments, marks);
    const eigenPoints = unique(eigenSegments.flat(), coordKey);

    const allSegments = applyTilingTransforms(eigenSegments, ttt);

    // console.log(eigenSegments.length);
    // console.log(allSegments[147], allSegments[151]);
    // const allSegments = eigenSegments;
    // const splitted = cutSegments(allSegments);

    const shapes = shapesFromSegments(allSegments, eigenPoints);
    const canons = shapes.map(canonicalShape).map((canon) => {
        const overlap = pklip(canon.points, bounds) as null | Coord[][];
        const full = calcPolygonArea(canon.points);
        const showing = overlap ? overlap.map(calcPolygonArea).reduce((a, b) => a + b, 0) : 0;
        const percentage = showing / full;
        return {
            ...canon,
            percentage,
            overlap: overlap?.map((shape) => shape.map((coord) => applyMatrices(coord, canon.tx))),
        };
    });

    return {bounds, shapes, pts, allSegments, marks, canons};
};

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
    // it's brute force, but it's honest work
    for (let num = 1; num < 100; num++) {
        for (let denom = 2; denom < 100; denom++) {
            if (closeEnough(num / denom, decimal)) {
                return {num: num + whole * denom, denom};
            }
        }
    }
}

export const humanReadableFraction = (value: number) => {
    if (closeEnough(Math.round(value), value)) return Math.round(value) + '';
    const fract = findCommonFractions(value);
    if (fract) {
        const whole = Math.floor(fract.num / fract.denom);
        if (whole) {
            return `${whole} ${fract.num - whole * fract.denom}/${fract.denom}`;
        }
        return `${fract.num}/${fract.denom}`;
    }
    return value.toFixed(4);
};

export const canonicalShape = (shape: Coord[]) => {
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

// const betweens = angleDifferences(angles)
// // converts 0..2PI to -PI..PI
// const relatives = betweens.map((between) =>
//     between > Math.PI ? between - Math.PI * 2 : between,
// );
// let total = relatives.reduce((a, b) => a + b);
// const isClockwise = total >= Math.PI - epsilon
// if (!isClockwise) {
//     throw new Error(`isntt clockwise`)
// }
// const angles: number[] = shape.map((p, i) => angleTo(shape[i === 0 ? shape.length - 1 : i - 1], p))
