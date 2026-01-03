import {eigenShapeTransform} from '../../../editor/eigenShapeTransform';
import {tilingPoints, applyTilingTransformsG} from '../../../editor/tilingPoints';
import {coordKey} from '../../../rendering/coordKey';
import {isClockwise, reversePath} from '../../../rendering/pathToPoints';
import {transformBarePath} from '../../../rendering/points';
import {segmentKey} from '../../../rendering/segmentKey';
import {Coord, Segment, BarePath} from '../../../types';
import {centroid} from '../../findReflectionAxes';
import {coordsFromBarePath, simpleSize} from '../../getPatternData';
import {Patterns} from './evaluate';
import {State} from './types/state-type';

const findPattern = (layers: State['layers'], id: string) => {
    for (let layer of Object.values(layers)) {
        for (let entity of Object.values(layer.entities)) {
            if (entity.type === 'Pattern' && entity.id === id) {
                return entity;
            }
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
export const expandShapes = (
    shapes: State['shapes'],
    layers: State['layers'],
    patterns: Patterns,
) => {
    let changed = false;

    Object.entries(shapes).forEach(([key, value]) => {
        if (value.multiply == null) return;
        const pattern = findPattern(layers, value.multiply);
        if (!pattern) return;

        if (!changed) shapes = {...shapes};
        const shape =
            typeof pattern.tiling === 'string'
                ? patterns[pattern.tiling].shape
                : pattern.tiling.tiling.shape;
        const size = pattern.psize;

        const bounds = tilingPoints(shape);

        const usedKeys = [coordKey(centroid(coordsFromBarePath(value)))];

        const ttt = eigenShapeTransform(
            shape,
            bounds[2],
            bounds,
            typeof size === 'number' ? simpleSize(shape, size) : size,
        );
        const transformedShapes = applyTilingTransformsG([value], ttt, transformBarePath);
        transformedShapes.forEach((shape, i) => {
            const k = coordKey(centroid(coordsFromBarePath(shape)));
            if (!usedKeys.includes(k)) {
                shapes[key + `:${k}`] = shape;
                usedKeys.push(k);
            }
        });
    });
    return shapes;
};
