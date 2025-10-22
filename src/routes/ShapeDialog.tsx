import {useMemo, useState} from 'react';
import {boundsForCoords} from '../editor/Bounds';
import {closeEnoughAngle} from '../rendering/epsilonToZero';
import {angleBetween} from '../rendering/isAngleBetween';
import {pointsAngles} from '../rendering/pathToPoints';
import {Coord} from '../types';
import {Route} from './+types/gallery';
import {canonicalShape} from './getPatternData';
import {addToMap} from './shapesFromSegments';
import {shapeD} from './ShowTiling';

const shapeClasses = ['stars', 'regular', 'symmetrical', 'other'] as const;

const isAlternating = (thetas: boolean[]) => {
    return thetas.every((t, i) => t !== thetas[i === 0 ? thetas.length - 1 : i - 1]);
};

const classifyShape = (coords: Coord[]): (typeof shapeClasses)[number] => {
    const angles = pointsAngles(coords);
    const internalAngles = angles.map((a, i) =>
        angleBetween(angles[i === 0 ? angles.length - 1 : i - 1], a, true),
    );
    if (
        isAlternating(internalAngles.map((t) => t > Math.PI)) &&
        internalAngles.every((angle, i) =>
            closeEnoughAngle(angle, internalAngles[i <= 1 ? internalAngles.length - 2 + i : i - 2]),
        )
    ) {
        return 'stars';
    }
    if (closeEnoughAngle(Math.min(...internalAngles), Math.max(...internalAngles))) {
        return 'regular';
    }
    return 'other';
};

export const ShapeDialog = ({patterns}: {patterns: Route.ComponentProps['loaderData']}) => {
    const {patternsWithShapes, uniqueShapes, shapesOrganized} = useMemo(() => {
        const patternsWithShapes: Record<string, string[]> = {};
        const uniqueShapes: Record<string, ReturnType<typeof canonicalShape>> = {};
        const shapesOrganized: Record<(typeof shapeClasses)[number], string[]> = {
            stars: [],
            regular: [],
            symmetrical: [],
            other: [],
        };
        patterns.forEach(({data, hash}) => {
            data.canons.forEach((shape) => {
                if (!shape.percentage) return;
                addToMap(patternsWithShapes, shape.key, hash);
                if (!uniqueShapes[shape.key]) {
                    uniqueShapes[shape.key] = shape;
                    const cs = classifyShape(shape.scaled);
                    shapesOrganized[cs].push(shape.key);
                }
            });
        });
        Object.values(shapesOrganized).forEach((hashes) =>
            hashes.sort((a, b) =>
                uniqueShapes[a].scaled.length === uniqueShapes[b].scaled.length
                    ? Math.max(...uniqueShapes[a].angles) - Math.max(...uniqueShapes[b].angles)
                    : uniqueShapes[b].scaled.length - uniqueShapes[a].scaled.length,
            ),
        );
        return {patternsWithShapes, uniqueShapes, shapesOrganized};
    }, [patterns]);
    const [selected, setSelected] = useState([] as string[]);
    return (
        <div className="flex flex-1 min-h-0">
            <div className="flex flex-col gap-10 flex-1 min-h-0 overflow-auto">
                {Object.keys(shapesOrganized).map((k) => {
                    if (k === 'other') {
                        const bySize: Record<number, ReturnType<typeof canonicalShape>[]> = {};
                        shapesOrganized[k].forEach((k) => {
                            if (patternsWithShapes[k].length < 2) return;
                            const shape = uniqueShapes[k];
                            addToMap(bySize, shape.scaled.length, shape);
                        });
                        return Object.keys(bySize)
                            .sort((a, b) => +b - +a)
                            .map((k) => {
                                return (
                                    <div className="flex flex-row flex-wrap gap-10 flex-1 " key={k}>
                                        <h3>{k} sides</h3>
                                        {bySize[+k]
                                            .map((shape) => ({
                                                shape,
                                                key: shapePatternKey(shape.angles),
                                                ratio:
                                                    Math.max(
                                                        ...shape.angles.filter((a) => a < Math.PI),
                                                    ) / Math.min(...shape.angles),
                                                avg:
                                                    shape.angles
                                                        .map((a) => Math.abs(Math.PI - a))
                                                        .reduce((a, b) => a + b, 0) /
                                                    shape.angles.length,
                                            }))
                                            .sort((a, b) =>
                                                a.key < b.key
                                                    ? -1
                                                    : a.key > b.key
                                                      ? 1
                                                      : a.avg - b.avg,
                                            )
                                            .map(({shape}) => (
                                                <ShowShape shape={shape.scaled} size={100} />
                                            ))}
                                    </div>
                                );
                            });
                    }
                    return (
                        <div className="flex flex-row flex-wrap gap-10 flex-1 ">
                            <h3>{k}</h3>
                            {shapesOrganized[k as 'stars'].map((key) => (
                                <ShowShape shape={uniqueShapes[key].scaled} size={100} />
                            ))}
                        </div>
                    );
                })}
                {/* {Object.values(uniqueShapes).map((shape) => {
                const bounds = boundsForCoords(...shape.scaled);
                return (
                    <div key={shape.key}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox={`${bounds.x0.toFixed(3)} ${bounds.y0.toFixed(3)} ${(bounds.x1 - bounds.x0).toFixed(3)} ${(
                                bounds.y1 - bounds.y0
                            ).toFixed(3)}`}
                            style={{width: 100, height: 100, minWidth: 100, minHeight: 100}}
                        >
                            <path d={shapeD(shape.scaled)} fill="green" />
                        </svg>
                    </div>
                );
            })} */}
            </div>
        </div>
    );
};

const ShowShape = ({shape, size}: {shape: Coord[]; size: number}) => {
    const bounds = boundsForCoords(...shape);

    return (
        <div>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox={`${bounds.x0.toFixed(3)} ${bounds.y0.toFixed(3)} ${(bounds.x1 - bounds.x0).toFixed(3)} ${(
                    bounds.y1 - bounds.y0
                ).toFixed(3)}`}
                style={{
                    width: size,
                    height: size,
                    minWidth: size,
                    minHeight: size,
                }}
            >
                <path d={shapeD(shape)} fill="green" />
            </svg>
        </div>
    );
};

const shapePatternKey = (angles: number[]) => {
    const larges = angles.map((a) => a > Math.PI);
    let k = larges.map((a) => (a ? 1 : 0)).join('');
    let best = k;
    for (let i = 1; i < k.length; i++) {
        const n = k.slice(i) + k.slice(0, i);
        if (n < best) best = n;
    }
    return best;
};
