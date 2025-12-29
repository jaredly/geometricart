import {closeEnough, withinLimit} from '../../../rendering/epsilonToZero';
import {lineToSlope, SlopeIntercept} from '../../../rendering/intersect';
import {Coord} from '../../../types';

const sq = (v: number) => v * v;

const projectPointOntoLine = (
    point: Coord,
    line: SlopeIntercept,
): {projected: Coord; distSq: number} => {
    if (line.m === Infinity) {
        const projected = {x: line.b, y: point.y};
        return {projected, distSq: sq(point.x - projected.x)};
    }
    if (line.m === 0) {
        const projected = {x: point.x, y: line.b};
        return {projected, distSq: sq(point.y - projected.y)};
    }
    const denom = 1 + line.m * line.m;
    const x = (point.x + line.m * (point.y - line.b)) / denom;
    const y = line.m * x + line.b;
    const projected = {x, y};
    return {projected, distSq: sq(point.x - x) + sq(point.y - y)};
};

const projectionOnSegment = (
    point: Coord,
    line: SlopeIntercept,
    maxDistSq: number,
    eps?: number,
) => {
    const {projected, distSq} = projectPointOntoLine(point, line);
    if (distSq > maxDistSq) {
        return false;
    }
    if (!line.limit) {
        return true;
    }
    const limitValue = line.m === Infinity ? projected.y : projected.x;
    return withinLimit(line.limit, limitValue, eps);
};

export const coordPairOnShape = (
    pair: [Coord, Coord],
    shape: SlopeIntercept[],
    maxDistSq: number,
    eps?: number,
) => {
    return shape.some(
        (sline) =>
            projectionOnSegment(pair[0], sline, maxDistSq, eps) &&
            projectionOnSegment(pair[1], sline, maxDistSq, eps),
    );
};

export const overlapping = (one: SlopeIntercept, two: SlopeIntercept, eps: number) =>
    closeEnough(one.m, two.m, eps) &&
    closeEnough(one.b, two.b, eps) &&
    (withinLimit(one.limit!, two.limit![0], eps) ||
        withinLimit(one.limit!, two.limit![1], eps) ||
        withinLimit(two.limit!, one.limit![0], eps) ||
        withinLimit(two.limit!, one.limit![1], eps));

export const coordPairOnShape2 = (pair: [Coord, Coord], shape: SlopeIntercept[], eps: number) => {
    const line = lineToSlope(pair[0], pair[1], true);
    return shape.some((sline) => overlapping(line, sline, eps));
};
