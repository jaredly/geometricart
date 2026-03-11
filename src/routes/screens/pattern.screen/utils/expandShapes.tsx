import {eigenShapeTransform} from '../../../../editor/eigenShapeTransform';
import {tilingPoints, applyTilingTransformsG} from '../../../../editor/tilingPoints';
import {coordKey} from '../../../../rendering/coordKey';
import {isClockwise, reversePath} from '../../../../rendering/pathToPoints';
import {transformBarePath} from '../../../../rendering/points';
import {segmentKey} from '../../../../rendering/segmentKey';
import {Coord, Segment, BarePath} from '../../../../types';
import {centroid} from '../../../findReflectionAxes';
import {coordsFromBarePath, simpleSize} from '../../../getPatternData';
import {State} from '../types/state-type';

const findPattern = (entities: State['entities'], id: string) => {
    for (let entity of Object.values(entities)) {
        if (entity.type === 'Pattern' && entity.id === id) {
            return entity;
        }
    }
};
const segmentsKey = (origin: Coord, segments: Segment[]) =>
    segments.map((seg, i) => segmentKey(i === 0 ? origin : segments[i - 1].to, seg)).join('-');
const barePathKey = (path: BarePath) => {
    if (!path.open) return segmentsKey(path.origin, path.segments);
    let segments = path.segments;
    if (!isClockwise(path.segments)) {
        segments = reversePath(path.segments);
    }
    const keys: string[] = [];
    for (let i = 0; i < path.segments.length; i++) {
        const items = [...path.segments.slice(i), ...path.segments.slice(0, i)];
        keys.push(segmentsKey(items[items.length - 1].to, items));
    }
    keys.sort();
    return keys[0];
};

export const multiplyShape = (value: State['shapes'][''], entities: State['entities']) => {
    if (value.multiply == null) return;
    const pattern = findPattern(entities, value.multiply);
    if (!pattern) return;

    const shape = pattern.tiling.tiling.shape;
    const size = pattern.psize;

    const bounds = tilingPoints(shape);

    const usedKeys = [coordKey(centroid(coordsFromBarePath(value)))];

    const ttt = eigenShapeTransform(
        shape,
        bounds[2],
        bounds,
        size.type === 'uniform' ? simpleSize(shape, size.size) : size.coord,
    );
    const transformedShapes = applyTilingTransformsG([value], ttt, transformBarePath);

    const shapes: Record<string, State['shapes']['']> = {};
    transformedShapes.forEach((shape, i) => {
        const k = coordKey(centroid(coordsFromBarePath(shape)));
        if (!usedKeys.includes(k)) {
            shapes[k] = shape;
            usedKeys.push(k);
        }
    });

    return shapes;
};

export const expandShapes = (shapes: State['shapes'], entities: State['entities']) => {
    let changed = false;

    Object.entries(shapes).forEach(([key, value]) => {
        const expanded = multiplyShape(value, entities);
        if (!expanded) return;
        if (!changed) {
            changed = true;
            shapes = {...shapes};
        }
        Object.entries(expanded).forEach(([k, v]) => {
            shapes[`${key}:${k}`] = v;
        });
        // Object.assign(
        //     shapes,
        //     Object.entries(expanded).map(([k, v]) => [`${key}:${k}`, v]),
        // );
    });
    return shapes;
};
