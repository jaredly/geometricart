import {Adjustment, Color, Pattern} from '../export-types';
import {CoordField} from './CoordField';
import {NumberField} from './NumberField';
import {PatternContentsEditor} from './PatternContentsEditor';
import {ModsEditor} from './FillEditor';
import {genid} from '../utils/genid';
import {useEditState, usePendingState} from '../utils/editState';
import {useLatest} from '../utils/useLatest';
import {ChunkEditor} from './ChunkEditor';
import {AnimInput} from './AnimInput';
import {Updater} from '../../../../json-diff/Updater';
import {SharedEditor} from './SharedEditor';

export const PatternEditor = ({
    value,
    update,
    palette,
}: {
    palette: Color[];
    value: Pattern;
    update: Updater<Pattern>;
}) => {
    return (
        <div className="space-y-3">
            {typeof value.psize === 'number' ? (
                <NumberField label="Size" value={value.psize} onChange={update.psize} />
            ) : (
                <CoordField label="Pattern size" value={value.psize} onChange={update.psize} />
            )}
            <ModsEditor mods={value.mods} palette={palette} update={update.mods} />
            <AdjustmentsEditor
                adjustments={value.adjustments}
                update={update.adjustments}
                palette={palette}
            />
            <PatternContentsEditor
                palette={palette}
                value={value.contents}
                update={update.contents}
            />
            <SharedEditor shared={value.shared} onChange={update.shared} />
        </div>
    );
};

const letters = 'abcdefghijklmnopqrstuvwxyz';

export const nextKey = (shared: Record<string, string>) => {
    for (let j = 0; j < 100; j++) {
        for (let i = 0; i < letters.length; i++) {
            const k = `${letters[i]}${j === 0 ? '' : j + 1}`;
            if (!(k in shared)) return k;
        }
    }
};

const AdjustmentEditor = ({
    adjustment: adj,
    palette,
    update,
}: {
    palette: Color[];
    adjustment: Adjustment;
    update: Updater<Adjustment>;
}) => {
    const edit = usePendingState();
    const es = useEditState();
    // const hover = es.use(es => es.hover?.type === 'shape' && adj.shapes.includes(es.hover.id))
    const pending = edit.use((v) => v.pending);
    const isAdding = pending?.type === 'select-shapes' && pending.key === `adj-${adj.id}`;
    return (
        <div className="border border-base-300 bg-base-200 rounded-md p-4 space-y-4">
            <div className="flex items-center">
                <div className="text-sm bg-base-300 rounded px-2 py-1 mr-4">{adj.id}</div>
                <details className="dropdown">
                    <summary
                        className="btn m-1 whitespace-nowrap"
                        onMouseEnter={() => es.update.hover({type: 'shapes', ids: adj.shapes})}
                        onMouseLeave={() => es.update.hover(null)}
                    >
                        {!adj.shapes.length
                            ? `No shapes selected`
                            : adj.shapes.length === 1
                              ? `1 shape`
                              : `${adj.shapes.length} shapes`}
                    </summary>
                    <ul className="menu dropdown-content bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
                        {adj.shapes.map((id, i) => (
                            <li
                                key={id}
                                onMouseEnter={() => es.update.hover({type: 'shape', id})}
                                onMouseLeave={() => es.update.hover(null)}
                                className="flex flex-row"
                            >
                                <div className="flex-1">{id}</div>
                                <button
                                    onClick={() => update.shapes[i].remove()}
                                    className="btn btn-square"
                                >
                                    &times;
                                </button>
                            </li>
                        ))}
                        <li className="flex flex-row">
                            <button
                                onClick={() => update.shapes.replace([])}
                                className="btn btn-square flex-1"
                            >
                                Clear all
                            </button>
                        </li>
                    </ul>
                </details>
                <button
                    className="btn btn-sm mx-4"
                    onClick={() => {
                        if (isAdding) {
                            edit.update.pending.replace(null);
                            update.shapes(pending.shapes);
                        } else {
                            edit.update.pending.replace({
                                type: 'select-shapes',
                                key: `adj-${adj.id}`,
                                shapes: adj.shapes,
                                onDone(shapes) {
                                    update.shapes(shapes);
                                },
                            });
                        }
                    }}
                >
                    {isAdding ? 'Finish' : 'Select shapes'}
                </button>
                <ChunkEditor chunk={adj.t} update={update.t} />
                <button onClick={update.remove} className="btn btn-sm btn-square">
                    &times;
                </button>
            </div>
            <SharedEditor shared={adj.shared} onChange={update.shared} />
            <ModsEditor mods={adj.mods} update={update.mods} palette={palette} />
        </div>
    );
};

const AdjustmentsEditor = ({
    adjustments,
    update,
    palette,
}: {
    palette: Color[];
    adjustments: Pattern['adjustments'];
    update: Updater<Pattern['adjustments']>;
}) => {
    return (
        <details className="space-y-4 p-4 border border-base-300">
            <summary className="font-semibold text-sm gap-4 items-center">
                Adjustments ({Object.keys(adjustments).length})
                <button
                    className="btn btn-sm"
                    value=""
                    onClick={() => {
                        const id = genid();
                        update[id].add({id, mods: [], shapes: []});
                    }}
                >
                    Add
                </button>
            </summary>
            {Object.values(adjustments).map((adj) => (
                <AdjustmentEditor
                    palette={palette}
                    key={adj.id}
                    adjustment={adj}
                    update={update[adj.id]}
                />
            ))}
        </details>
    );
};
