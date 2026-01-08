import React, {useState, useEffect, useMemo} from 'react';
import {Color, Entity, EObject} from '../export-types';
import {PatternEditor} from './PatternEditor';
import {GroupEditor} from './GroupEditor';
import {ExternalLinkIcon} from '../../../../icons/Icon';
import {Updater} from '../../../../json-diff/Updater';
import {SubStyleList} from './SubStyleList';
import {FillEditor, ModsEditor} from './FillEditor';
import {createFill, createLine} from './createLayerTemplate';
import {LineEditor} from './LineEditor';
import {useExportState} from '../ExportHistory';
import {notNull} from '../utils/notNull';
import {expandShapes} from '../utils/expandShapes';
import {useEditState} from '../utils/editState';

export const EntityEditor = ({
    palette,
    value,
    update,
}: {
    palette: Color[];
    value: Entity;
    update: Updater<Entity>;
}) => {
    const [type, setType] = useState<Entity['type']>(value.type);

    useEffect(() => {
        setType(value.type);
    }, [value.type]);

    return (
        <details className="rounded border border-base-300 bg-base-100 p-3 space-y-3">
            <summary className="cursor-pointer hover:text-accent">
                <div className="inline-flex items-center">
                    {value.type}
                    {value.type === 'Object' ? <span className="px-4">{value.shape}</span> : null}
                    <div className="flex-1" />
                    {value.type === 'Pattern' && (
                        <a
                            className="link text-sm mx-4"
                            target="_blank"
                            href={`/gallery/pattern/${typeof value.tiling === 'string' ? value.tiling : value.tiling.id}`}
                        >
                            <ExternalLinkIcon />
                        </a>
                    )}

                    <button className="btn btn-ghost btn-xs text-error" onClick={update.remove}>
                        Remove
                    </button>
                </div>
            </summary>

            {value.type === 'Group' ? (
                <GroupEditor value={value} update={update.variant('Group')} />
            ) : null}
            {value.type === 'Pattern' ? (
                <PatternEditor palette={palette} value={value} update={update.variant('Pattern')} />
            ) : null}
            {value.type === 'Object' ? (
                <ObjectEditor palette={palette} value={value} update={update.variant('Object')} />
            ) : null}
        </details>
    );
};

const ObjectEditor = ({
    value,
    update,
    palette,
}: {
    palette: Color[];
    value: EObject;
    update: Updater<EObject>;
}) => {
    const st = useExportState();
    const es = useEditState();
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
    const {shapes, layers} = st.use((state) => ({shapes: state.shapes, layers: state.layers}));

    const expandedShapes = useMemo(() => expandShapes(shapes, layers), [shapes, layers]);

    return (
        <div className="space-y-2">
            <div className="form-control">
                <label
                    onMouseEnter={() => es.update.hover({type: 'shape', id: value.shape})}
                    onMouseLeave={() => es.update.hover.remove()}
                >
                    Shape
                    <select
                        className="select w-40 ml-4"
                        onChange={(evt) => {
                            const id = evt.target.value;
                            if (id !== '') {
                                update.shape.replace(id);
                            } else {
                                update.shape.remove();
                            }
                        }}
                        value={value.shape ?? ''}
                    >
                        <option value="">Select a shape id</option>
                        {Object.keys(expandedShapes).map((id) => (
                            <option value={id} key={id}>
                                {id}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="mx-4">
                    Mulitply
                    <select
                        className="select w-40 ml-4"
                        onChange={(evt) => {
                            const id = evt.target.value;
                            if (id !== '') {
                                update.multiply.replace(id);
                            } else {
                                update.multiply.remove();
                            }
                        }}
                        value={value.multiply ?? ''}
                    >
                        <option value="">Select a pattern</option>
                        {tilingIds.map((id) => (
                            <option value={id} key={id}>
                                {id}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            <SubStyleList
                label="Fills"
                emptyLabel="No fills"
                items={value.style.fills}
                createItem={createFill}
                render={(key, fill, update, reId) => (
                    <FillEditor
                        key={key}
                        value={fill}
                        update={update}
                        reId={reId}
                        palette={palette}
                    />
                )}
                update={update.style.fills}
            />
            <SubStyleList
                label="Lines"
                emptyLabel="No lines"
                items={value.style.lines}
                createItem={createLine}
                render={(key, line, update, reId) => (
                    <LineEditor
                        key={key}
                        reId={reId}
                        palette={palette}
                        value={line}
                        update={update}
                    />
                )}
                update={update.style.lines}
            />
            <ModsEditor palette={palette} mods={value.style.mods} update={update.style.mods} />
        </div>
    );
};
