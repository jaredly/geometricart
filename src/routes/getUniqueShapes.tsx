import {boundsForCoords} from '../editor/Bounds';
import {scalePos} from '../editor/scalePos';
import {transformShape} from '../editor/tilingPoints';
import {closeEnough, closeEnoughAngle} from '../rendering/epsilonToZero';
import {
    angleTo,
    applyMatrices,
    dist,
    rotationMatrix,
    scaleMatrix,
    translationMatrix,
} from '../rendering/getMirrorTransforms';
import {angleBetween} from '../rendering/isAngleBetween';
import {pointsAngles} from '../rendering/pathToPoints';
import {Coord} from '../types';
import {Axis, centroid, findReflectionAxes} from './findReflectionAxes';
import {canonicalShape} from './getPatternData';
import {addToMap, calcPolygonArea, joinAdjacentShapeSegments} from './shapesFromSegments';

const shapeClasses = ['Stars', 'Regular', 'Symmetrical', 'Other'] as const;

const isAlternating = (thetas: boolean[]) => {
    return thetas.every((t, i) => t !== thetas[i === 0 ? thetas.length - 1 : i - 1]);
};

const classifyShape = (coords: Coord[], lengths: number[]): (typeof shapeClasses)[number] => {
    const angles = pointsAngles(coords);
    const internalAngles = angles.map((a, i) =>
        angleBetween(angles[i === 0 ? angles.length - 1 : i - 1], a, true),
    );

    if (
        isAlternating(internalAngles.map((t) => t > Math.PI)) &&
        internalAngles.every((angle, i) =>
            closeEnoughAngle(
                angle,
                internalAngles[i <= 1 ? internalAngles.length - 2 + i : i - 2],
                0.001,
            ),
        )
    ) {
        return 'Stars';
    }

    if (
        closeEnoughAngle(Math.min(...internalAngles), Math.max(...internalAngles)) &&
        closeEnough(Math.min(...lengths), Math.max(...lengths))
    ) {
        return 'Regular';
    }

    return 'Other';
};

export type Shape = ReturnType<typeof canonicalShape> & {
    axes: Axis[];
    rotated: Coord[];
    area: number;
};

const rotateForAxis = (points: Coord[], axis: Axis) => {
    const ct = centroid(points);
    const rev = dist(axis.src, axis.point) < dist(axis.dest, axis.point);
    const tx = [
        translationMatrix(scalePos(axis.point, -1)),
        rotationMatrix(-angleTo(axis.src, ct) + (rev ? Math.PI : 0) + Math.PI / 2),
        translationMatrix(axis.point),
    ];
    return points.map((pt) => applyMatrices(pt, tx));
};

const scaleToUnitSquare = (coords: Coord[]) => {
    const bb = boundsForCoords(...coords);
    const dim = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0);
    return transformShape(coords, [scaleMatrix(1 / dim, 1 / dim)]);
};

const cmpOr = (a: number, b: number) => (a === 0 ? b : a);

export const getUniqueShapes = (
    patterns: {
        data: {canons: (ReturnType<typeof canonicalShape> & {percentage: number})[]};
        hash: string;
    }[],
) => {
    const patternsWithShapes: Record<string, string[]> = {};
    const uniqueShapes: Record<string, Shape> = {};
    const shapesOrganized: {title: string; children: {title?: string; shapes: string[]}[]}[] = [];
    const byClass: Record<string, string[]> = {};

    patterns.forEach(({data, hash}) => {
        data.canons.forEach((shape) => {
            if (!shape.percentage) return;
            addToMap(patternsWithShapes, shape.key, hash);
            if (!uniqueShapes[shape.key]) {
                const axes = findReflectionAxes(shape.scaled, 0.001).sort(
                    (a, b) => b.length - a.length,
                );
                const united = joinAdjacentShapeSegments(shape.scaled);
                uniqueShapes[shape.key] = {
                    ...shape,
                    axes,
                    rotated: axes.length ? rotateForAxis(united, axes[0]) : united,
                    area: calcPolygonArea(scaleToUnitSquare(shape.scaled)),
                };
                const cs = classifyShape(shape.scaled, shape.lengths);
                addToMap(byClass, cs, shape.key);
            }
        });
    });

    shapeClasses.forEach((sc) => {
        if (!byClass[sc]) return;
        if (sc === 'Stars') {
            const bySize: Record<number, string[]> = {};
            byClass[sc].forEach((hash) => {
                addToMap(bySize, uniqueShapes[hash].scaled.length, hash);
            });
            shapesOrganized.push({
                title: 'Stars',
                children: Object.keys(bySize)
                    .sort((a, b) => +b - +a)
                    .map((size) => ({
                        title: `${size} Sides`,
                        shapes: bySize[+size].sort(
                            (a, b) => uniqueShapes[b].area - uniqueShapes[a].area,

                            // Math.max(...uniqueShapes[a].angles) -
                            // Math.max(...uniqueShapes[b].angles),
                        ),
                    })),
            });
        } else if (sc === 'Other') {
            // axes + size
            const byAxes: Record<number, string[]> = {};
            byClass[sc].forEach((hash) => {
                addToMap(byAxes, uniqueShapes[hash].axes.length, hash);
            });
            Object.keys(byAxes)
                .sort((a, b) => +b - +a)
                .forEach((num) => {
                    const bySize: Record<number, string[]> = {};
                    byAxes[+num].forEach((hash) => {
                        addToMap(bySize, uniqueShapes[hash].scaled.length, hash);
                    });
                    shapesOrganized.push({
                        title:
                            +num === 0 ? 'Not symmetrical' : +num === 1 ? '1 Axis' : `${num} Axes`,
                        children: Object.keys(bySize)
                            .sort((a, b) => +b - +a)
                            .map((size) => ({
                                title: `${size} Sides`,
                                shapes: bySize[+size].sort((a, b) =>
                                    cmpOr(
                                        uniqueShapes[b].angles.filter((t) => t > Math.PI).length -
                                            uniqueShapes[a].angles.filter((t) => t > Math.PI)
                                                .length,
                                        uniqueShapes[b].area - uniqueShapes[a].area,
                                    ),
                                ),
                            })),
                    });
                });
        } else {
            shapesOrganized.push({
                title: sc,
                children: [
                    {
                        shapes: byClass[sc].sort((a, b) =>
                            uniqueShapes[a].scaled.length === uniqueShapes[b].scaled.length
                                ? //Math.max(...uniqueShapes[a].angles) -
                                  //Math.max(...uniqueShapes[b].angles)
                                  uniqueShapes[b].area - uniqueShapes[a].area
                                : uniqueShapes[b].scaled.length - uniqueShapes[a].scaled.length,
                        ),
                    },
                ],
            });
        }
    });

    return {patternsWithShapes, uniqueShapes, shapesOrganized};
};

// const bySize: Record<number, ReturnType<typeof canonicalShape>[]> = {};
// shapesOrganized[k][0].forEach((k) => {
//     if (patternsWithShapes[k].length < 2) return;
//     const shape = uniqueShapes[k];
//     addToMap(bySize, shape.scaled.length, shape);
// });
// return Object.keys(bySize)
//     .sort((a, b) => +b - +a)
//     .map((k) => {
//         return (
//             <div className="flex flex-row flex-wrap gap-10 flex-1 " key={k}>
//                 <h3>{k} sides</h3>
//                 {bySize[+k]
//                     .map((shape) => ({
//                         shape,
//                         key: shapePatternKey(shape.angles),
//                         ratio:
//                             Math.max(
//                                 ...shape.angles.filter((a) => a < Math.PI),
//                             ) / Math.min(...shape.angles),
//                         avg:
//                             shape.angles
//                                 .map((a) => Math.abs(Math.PI - a))
//                                 .reduce((a, b) => a + b, 0) /
//                             shape.angles.length,
//                     }))
//                     .sort((a, b) =>
//                         a.key < b.key
//                             ? -1
//                             : a.key > b.key
//                               ? 1
//                               : a.avg - b.avg,
//                     )
//                     .map(({shape}) => (
//                         <ShowShape shape={shape.scaled} size={100} />
//                     ))}
//             </div>
//         );
//     });
