import {useEffect, useState} from 'react';
import {ExternalLinkIcon} from '../../../../icons/Icon';
import {Updater} from '../../../../json-diff/Updater';
import {Color, Entity, EObject} from '../export-types';
import {useExportState} from '../ExportHistory';
import {useEditState} from '../utils/editState';
import {objectShapes} from '../utils/resolveMods';
import {createFill, createLine} from './createLayerTemplate';
import {FillEditor, ModsEditor} from './FillEditor';
import {GroupEditor} from './GroupEditor';
import {LineEditor} from './LineEditor';
import {PatternEditor} from './PatternEditor';
import {SubStyleList} from './SubStyleList';

export const EntityEditor = ({
    palette,
    value,
    update,
    expandedShapes,
}: {
    palette: Color[];
    value: Entity;
    update: Updater<Entity>;
    expandedShapes: string[];
}) => {
    const [type, setType] = useState<Entity['type']>(value.type);
    const es = useEditState();

    useEffect(() => {
        setType(value.type);
    }, [value.type]);

    return (
        <details className="rounded border border-base-300 bg-base-100 p-3 space-y-3">
            <summary className="cursor-pointer hover:text-accent">
                <div
                    className="inline-flex items-center"
                    onMouseEnter={() => {
                        if (value.type === 'Object') {
                            if (value.multiply) {
                                es.update.hover({
                                    type: 'shapes',
                                    ids: objectShapes(value.shape, expandedShapes),
                                });
                            } else {
                                es.update.hover({type: 'shape', id: value.shape});
                            }
                        }
                    }}
                    onMouseLeave={() => (value.type === 'Object' ? es.update.hover.remove() : null)}
                >
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
                <ObjectEditor
                    expandedShapes={expandedShapes}
                    palette={palette}
                    value={value}
                    update={update.variant('Object')}
                />
            ) : null}
        </details>
    );
};

const ObjectEditor = ({
    value,
    update,
    palette,
    expandedShapes,
}: {
    palette: Color[];
    value: EObject;
    update: Updater<EObject>;
    expandedShapes: string[];
}) => {
    return (
        <div className="space-y-2">
            <div className="form-control">
                <label>
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
                        {expandedShapes.map((id) => (
                            <option value={id} key={id}>
                                {id}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="mx-4">
                    Mulitply
                    <input
                        className="checkbox ml-4"
                        type="checkbox"
                        onChange={(evt) => {
                            if (evt.target.checked) {
                                update.multiply(true);
                            } else {
                                update.multiply.remove();
                            }
                        }}
                        checked={!!value.multiply}
                    />
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
