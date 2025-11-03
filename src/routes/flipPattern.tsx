import {tilingPoints} from '../editor/tilingPoints';
import {
    angleTo,
    translationMatrix,
    scaleMatrix,
    rotationMatrix,
    applyMatrices,
    dist,
} from '../rendering/getMirrorTransforms';
import {angleBetween} from '../rendering/isAngleBetween';
import {transformSegment} from '../rendering/points';
import {Coord, Tiling} from '../types';
import {getPatternData, preTransformTiling} from './getPatternData';
import {
    shouldFlipTriangle,
    getRectangleTransform,
    rectPointsInOrder,
    cutSegments,
    splitOverlappingSegs,
} from './shapesFromSegments';

export const normalizeTiling = (tiling: Tiling): Tiling => {
    tiling = preTransformTiling(tiling);
    tiling = flipPattern(tiling);
    tiling = cutTilingSegments(tiling);
    return tiling;
};

export const cutTilingSegments = (tiling: Tiling): Tiling => {
    let segs = tiling.cache.segments.map((s) => [s.prev, s.segment.to] as [Coord, Coord]);
    const lens = segs.map(([a, b]) => dist(a, b));
    const max = Math.max(...lens);
    const perc = lens.map((l) => Math.round((l / max) * 100));
    console.log(perc.sort((a, b) => a - b).join(', '));
    segs = cutSegments(segs);
    segs = splitOverlappingSegs(segs);
    return {
        ...tiling,
        cache: {
            ...tiling.cache,
            segments: segs.map(([a, b]) => ({
                prev: a,
                segment: {type: 'Line', to: b},
            })),
        },
    };
};

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
