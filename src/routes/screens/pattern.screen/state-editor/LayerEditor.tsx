import React, {useMemo} from 'react';
import {Color} from '../export-types';
import {JsonEditor} from './JsonEditor';
import {parseAnimatable, createGroup} from './createLayerTemplate';
import {EntityEditor} from './EntityEditor';
import {SharedEditor} from './SharedEditor';
import {Updater} from '../../../../json-diff/Updater';
import {genid} from '../utils/genid';
import {usePendingState} from '../utils/editState';
import {useExportState} from '../ExportHistory';
import {expandShapes} from '../utils/expandShapes';
import {ExpandableEditor} from './ExpandableEditor';
import {useValue} from '../../../../json-diff/react';
import {State} from '../types/state-type';

export const LayerEditor = ({
    value,
    update,
    palette,
}: {
    palette: Color[];
    value: State;
    update: Updater<State>;
}) => {
    const entries = useMemo(() => Object.entries(value.entities), [value.entities]);
    const pend = usePendingState();

    const st = useExportState();
    const shapes = useValue(st.$.shapes);
    const entities = useValue(st.$.entities);
    const expandedShapes = useMemo(
        () => Object.keys(expandShapes(shapes, entities)),
        [shapes, entities],
    );

    return (
        <div className="bg-base-200 border border-base-300 shadow-sm">
            <div className="space-y-3 p-4">
                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                    <label className="form-control w-full">
                        <div className="label mr-4">
                            <span className="label-text font-semibold">Opacity</span>
                        </div>
                        {/*<ExpandableEditor
                            value={String(value.opacity)}
                            onChange={(opacity) => update.opacity(parseAnimatable(opacity))}
                        />*/}
                    </label>
                </div>

                {/*<SharedEditor shared={value.shared} onChange={update.shared.$replace} />*/}

                <div className="flex flex-col gap-4">
                    {/*<JsonEditor
                        label="Guides"
                        value={value.guides}
                        onChange={update.guides.$replace}
                    />*/}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="font-semibold text-sm">Entities</div>
                            <div className="flex gap-2">
                                <button
                                    className="btn btn-outline btn-xs"
                                    onClick={() => {
                                        pend.$.pending({
                                            type: 'select-shape',
                                            onDone(shape) {
                                                const id = genid();
                                                update.entities[id].$add({
                                                    type: 'Object',
                                                    id,
                                                    shape,
                                                    style: {
                                                        items: {
                                                            l1: {
                                                                id: 'l1',
                                                                mods: [],
                                                                color: 'red',
                                                                line: {width: 2},
                                                                order: 0,
                                                            },
                                                        },
                                                        mods: [],
                                                    },
                                                });
                                                update.entities[value.rootGroup]
                                                    .$variant('Group')
                                                    .entities[id].$add(1);
                                            },
                                        });
                                    }}
                                >
                                    Add Object
                                </button>
                                <button
                                    className="btn btn-outline btn-xs"
                                    onClick={() => {
                                        const id = `entity-${entries.length + 1}`;
                                        update.entities[id].$add(createGroup(id));
                                    }}
                                >
                                    Add group
                                </button>
                                {/*<button
                                    className="btn btn-outline btn-xs"
                                    onClick={() => {
                                        const id = `pattern-${entries.length + 1}`;
                                        update.entities[id].add(createPattern(id));
                                    }}
                                >
                                    Add pattern
                                </button>*/}
                            </div>
                        </div>
                        <div className="space-y-3">
                            {entries.length === 0 ? (
                                <div className="text-sm opacity-60">No entities yet.</div>
                            ) : null}
                            {entries.map(([entityKey, entity]) => (
                                <EntityEditor
                                    expandedShapes={expandedShapes}
                                    palette={palette}
                                    key={entityKey}
                                    value={entity}
                                    update={update.entities[entityKey]}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
