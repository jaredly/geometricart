import {useMemo, useState} from 'react';
import {boundsForCoords} from '../editor/Bounds';
import {Coord} from '../types';
import {Route} from './+types/gallery';
import {canonicalShape} from './getPatternData';
import {addToMap} from './shapesFromSegments';
import {shapeD} from './ShowTiling';
import {Shape} from './getUniqueShapes';

export const ShapeDialog = ({
    data: {patterns, shapes},
}: {
    data: Route.ComponentProps['loaderData'];
}) => {
    const {patternsWithShapes, uniqueShapes, shapesOrganized} = shapes;
    const [selected, setSelected] = useState([] as string[]);

    return (
        <div className="flex flex-1 min-h-0">
            <div className="flex flex-col gap-10 flex-1 min-h-0 overflow-auto">
                {shapesOrganized.map((group, i) => {
                    return (
                        <div className="flex-1 " key={i}>
                            <h3>{group.title}</h3>
                            {group.children.map((subgroup, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: 'inline-flex',
                                        flexDirection: 'column',
                                        gap: '0.5rem',
                                        padding: '1rem',
                                        margin: '0.5rem',
                                        borderRadius: '0.5rem',
                                    }}
                                    className="bg-base-300"
                                >
                                    <div>{subgroup.title}</div>

                                    <div
                                        style={{
                                            gap: 12,
                                            flexDirection: 'row',
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        {subgroup.shapes.map((key) => (
                                            <div key={key} className="relative">
                                                <ShowShape shape={uniqueShapes[key]} size={100} />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    {patternsWithShapes[key].length}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
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

const ShowShape = ({shape, size}: {shape: Shape; size: number}) => {
    const bounds = boundsForCoords(...shape.rotated);
    const dim = Math.max(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0);
    const margin = dim / 10;

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`${(bounds.x0 - margin).toFixed(3)} ${(bounds.y0 - margin).toFixed(3)} ${(bounds.x1 - bounds.x0 + margin * 2).toFixed(3)} ${(
                bounds.y1 - bounds.y0 + margin * 2
            ).toFixed(3)}`}
            data-key={shape.key}
            style={{
                width: size,
                height: size,
                minWidth: size,
                minHeight: size,
            }}
        >
            <path d={shapeD(shape.rotated)} fill="#666" />
            {/* <path d={shapeD(shape.scaled)} stroke="red" fill="none" strokeWidth={dim / 50} />
                <circle
                    cx={shape.axes[0].point.x}
                    cy={shape.axes[0].point.y}
                    r={dim / 50}
                    fill="white"
                />
                <circle
                    cx={shape.axes[0].src.x}
                    cy={shape.axes[0].src.y}
                    r={dim / 20}
                    fill="yellow"
                />
                <circle
                    cx={shape.axes[0].dest.x}
                    cy={shape.axes[0].dest.y}
                    r={dim / 50}
                    fill="orange"
                /> */}
        </svg>
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
