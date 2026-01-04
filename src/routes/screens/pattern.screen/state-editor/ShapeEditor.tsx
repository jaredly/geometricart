import React from 'react';
import {BarePath, Coord} from '../../../../types';
import {useEditState, usePendingState} from '../utils/editState';
import {JsonEditor} from './JsonEditor';
import {Updater} from '../../../../json-diff/Updater';
import {useExportState} from '../ExportHistory';
import {notNull} from '../utils/resolveMods';

export const ShapeEditor = ({
    shape,
    id,
    update,
    onHover,
    onDup,
    onCrop,
}: {
    shape: BarePath & {multiply?: string};
    id: string;
    onHover: (v: {type: 'shape'; id: string} | null) => void;
    update: Updater<BarePath & {multiply?: string}>;
    onCrop(): void;
    onDup: (p: Coord) => void;
}) => {
    const es = usePendingState();
    const st = useExportState();
    const tilingIds = st.use((state) => {
        if (!state) throw new Error('cant happen');
        const ids = Object.values(state.layers)
            .flatMap((layer) =>
                Object.values(layer.entities).map((entity) =>
                    entity.type === 'Pattern' ? entity.id : null,
                ),
            )
            .filter(notNull);
        return ids;
    }, false);

    return (
        <div
            className="p-4 cursor-pointer hover:bg-base-300"
            onMouseEnter={() => onHover({type: 'shape', id})}
            onMouseLeave={() => onHover(null)}
        >
            Shape
            <button
                className="btn btn-sm"
                onClick={() =>
                    es.update.pending.replace({
                        type: 'dup-shape',
                        id,
                        onDone(point) {
                            onDup(point);
                        },
                    })
                }
            >
                Dup
            </button>
            <button onClick={onCrop} className="btn">
                Crop
            </button>
            <div>
                <label>
                    Mulitply
                    <select
                        className="select"
                        onChange={(evt) => {
                            const id = evt.target.value;
                            if (id !== '') {
                                update.multiply.replace(id);
                            } else {
                                update.multiply.remove();
                            }
                        }}
                        value={shape.multiply ?? ''}
                    >
                        <option value="">Select a pattern</option>
                        {tilingIds.map((id) => (
                            <option value={id} key={id}>
                                {id}
                            </option>
                        ))}
                    </select>
                </label>
                <button className="btn btn-sm" onClick={() => update.remove()}>
                    &times;
                </button>
            </div>
        </div>
    );
};
