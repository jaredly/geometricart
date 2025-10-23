import {useMemo, useState} from 'react';
import {Coord} from '../types';
import {Route} from './+types/gallery';
import {canonicalShape} from './getPatternData';
import {addToMap} from './shapesFromSegments';
import {ShowShape} from './ShowShape';

export const ShapeDialog = ({
    data: {patterns, shapes},
}: {
    data: Route.ComponentProps['loaderData'];
}) => {
    const {patternsWithShapes, uniqueShapes, shapesOrganized} = shapes;
    const [selected, setSelected] = useState([] as string[]);

    return (
        <div className="modal-box flex flex-col w-11/12 max-w-5xl">
            <h3 className="font-bold text-lg">Filter by shape</h3>
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
                                        }}
                                        className="bg-base-300 rounded-md"
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
                                                <div
                                                    key={key}
                                                    className={
                                                        `relative cursor-pointer rounded-sm hover:bg-base-200` +
                                                        (selected.includes(key)
                                                            ? ' bg-base-200'
                                                            : '')
                                                    }
                                                    onClick={() =>
                                                        setSelected(
                                                            selected.includes(key)
                                                                ? selected.filter((k) => k !== key)
                                                                : selected.concat([key]),
                                                        )
                                                    }
                                                >
                                                    <ShowShape
                                                        highlight={selected.includes(key)}
                                                        shape={uniqueShapes[key]}
                                                        size={100}
                                                    />
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
            <div className="modal-action">
                <form method="dialog">
                    {/* if there is a button in form, it will close the modal */}
                    <button className="btn">Close</button>
                </form>
            </div>
        </div>
    );
};

// const shapePatternKey = (angles: number[]) => {
//     const larges = angles.map((a) => a > Math.PI);
//     let k = larges.map((a) => (a ? 1 : 0)).join('');
//     let best = k;
//     for (let i = 1; i < k.length; i++) {
//         const n = k.slice(i) + k.slice(0, i);
//         if (n < best) best = n;
//     }
//     return best;
// };
