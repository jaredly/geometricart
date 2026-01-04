import React, {useMemo} from 'react';
import {Color, Layer} from '../export-types';
import {JsonEditor} from './JsonEditor';
import {NumberField} from './NumberField';
import {parseAnimatable, createGroup, createPattern} from './createLayerTemplate';
import {EntityEditor} from './EntityEditor';
import {TextField} from './TextField';
import {SharedEditor} from './SharedEditor';
import {Updater} from '../../../../json-diff/Updater';
import {genid} from '../utils/genid';
import {usePendingState} from '../utils/editState';

export const LayerEditor = ({
    layer,
    update,
    palette,
}: {
    palette: Color[];
    layer: Layer;
    update: Updater<Layer>;
}) => {
    const entries = useMemo(() => Object.entries(layer.entities), [layer.entities]);
    const pend = usePendingState();

    return (
        <div className="bg-base-200 border border-base-300 shadow-sm">
            <div className="space-y-3 p-4">
                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                    <NumberField label="Order" value={layer.order} onChange={update.order} />
                    <TextField
                        label="Opacity"
                        value={String(layer.opacity)}
                        onChange={(opacity) => update.opacity(parseAnimatable(opacity))}
                    />
                    <div className="flex-1" />
                    <button className="btn btn-ghost btn-sm text-error" onClick={update.remove}>
                        Remove
                    </button>
                </div>

                <SharedEditor shared={layer.shared} onChange={update.shared} />

                <div className="flex flex-col gap-4">
                    <JsonEditor label="Guides" value={layer.guides} onChange={update.guides} />
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="font-semibold text-sm">Entities</div>
                            <div className="flex gap-2">
                                <button
                                    className="btn btn-outline btn-xs"
                                    onClick={() => {
                                        pend.update.pending.replace({
                                            type: 'select-shape',
                                            onDone(shape) {
                                                const id = genid();
                                                update.entities[id].add({
                                                    type: 'Object',
                                                    id,
                                                    shape,
                                                    style: {
                                                        fills: {},
                                                        lines: {
                                                            l1: {
                                                                id: 'l1',
                                                                mods: [],
                                                                color: 'red',
                                                                width: 2,
                                                            },
                                                        },
                                                        mods: [],
                                                    },
                                                });
                                                update.entities[layer.rootGroup]
                                                    .variant('Group')
                                                    .entities[id].add(1);
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
                                        update.entities[id].add(createGroup(id));
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
