import {tilingPoints} from '../editor/tilingPoints';
import {
    angleTo,
    translationMatrix,
    scaleMatrix,
    rotationMatrix,
    applyMatrices,
} from '../rendering/getMirrorTransforms';
import {angleBetween} from '../rendering/isAngleBetween';
import {transformSegment} from '../rendering/points';
import {Tiling} from '../types';
import {getPatternData} from './getPatternData';
import {shouldFlipTriangle, getRectangleTransform, rectPointsInOrder} from './shapesFromSegments';

export const flipPattern = (tiling: Tiling): Tiling => {
    let {shape, cache} = tiling;
    if (shape.type === 'right-triangle') {
        const pts = tilingPoints(tiling.shape);
        const bounds = pts;
        let [start, corner, end] = bounds;

        let internalAngle = angleBetween(angleTo(start, corner), angleTo(start, end), true);
        if (!shouldFlipTriangle(shape.rotateHypotenuse, internalAngle, tiling, start, end)) {
            return tiling;
        }

        const tx = [
            translationMatrix({x: -end.x, y: -end.y}),
            scaleMatrix(1, -1),
            rotationMatrix(Math.PI / 2),
            scaleMatrix(-1 / end.y, -1 / end.y),
        ];

        shape = {...shape};
        cache = {...cache};

        start = applyMatrices(start, tx);
        end = applyMatrices(end, tx);
        corner = applyMatrices(corner, tx);

        cache.segments = cache.segments.map((seg) => ({
            prev: applyMatrices(seg.prev, tx),
            segment: transformSegment(seg.segment, tx),
        }));
        return {...tiling, cache, shape: {...shape, start: end, corner, end: start}};
    }
    if (shape.type === 'parallellogram') {
        const data = getPatternData(tiling);
        const tx = getRectangleTransform(tiling, data);
        if (!tx?.length) return tiling;

        console.log('transform para', tx);

        shape = {...shape};
        cache = {...cache};

        const points = shape.points.map((p) => applyMatrices(p, tx));

        console.log('transformed points', points, 'ordered', rectPointsInOrder(points));

        cache.segments = cache.segments.map((seg) => ({
            prev: applyMatrices(seg.prev, tx),
            segment: transformSegment(seg.segment, tx),
        }));
        return {
            ...tiling,
            cache,
            shape: {
                ...shape,
                points: rectPointsInOrder(points),
            },
        };
    }
    return tiling;
};
