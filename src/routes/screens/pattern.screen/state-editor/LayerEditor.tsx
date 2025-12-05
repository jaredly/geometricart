import React, {useMemo} from 'react';
import {Color, Layer} from '../export-types';
import {JsonEditor} from './JsonEditor';
import {NumberField} from './NumberField';
import {parseAnimatable, createGroup, createPattern} from './createLayerTemplate';
import {EntityEditor} from './EntityEditor';
import {TextField} from './TextField';
import {SharedEditor} from './PatternEditor';

export const LayerEditor = ({
    layer,
    onChange,
    onRemove,
    palette,
}: {
    palette: Color[];
    layer: Layer;
    onChange: (next: Layer, nextKey?: string) => void;
    onRemove: () => void;
}) => {
    const entries = useMemo(() => Object.entries(layer.entities), [layer.entities]);

    return (
        <div className="bg-base-200 border border-base-300 shadow-sm">
            <div className="space-y-3 p-4">
                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                    <NumberField
                        label="Order"
                        value={layer.order}
                        onChange={(order) => onChange({...layer, order})}
                    />
                    <TextField
                        label="Opacity"
                        value={String(layer.opacity)}
                        onChange={(opacity) =>
                            onChange({...layer, opacity: parseAnimatable(opacity)})
                        }
                    />
                    <div className="flex-1" />
                    <button className="btn btn-ghost btn-sm text-error" onClick={onRemove}>
                        Remove
                    </button>
                </div>

                <SharedEditor
                    shared={layer.shared}
                    onChange={(shared) => onChange({...layer, shared})}
                />

                <div className="flex flex-col gap-4">
                    <JsonEditor
                        label="Guides"
                        value={layer.guides}
                        onChange={(guides) => onChange({...layer, guides})}
                    />
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="font-semibold text-sm">Entities</div>
                            <div className="flex gap-2">
                                <button
                                    className="btn btn-outline btn-xs"
                                    onClick={() => {
                                        const id = `entity-${entries.length + 1}`;
                                        onChange({
                                            ...layer,
                                            entities: {
                                                ...layer.entities,
                                                [id]: createGroup(id),
                                            },
                                        });
                                    }}
                                >
                                    Add group
                                </button>
                                <button
                                    className="btn btn-outline btn-xs"
                                    onClick={() => {
                                        const id = `pattern-${entries.length + 1}`;
                                        onChange({
                                            ...layer,
                                            entities: {
                                                ...layer.entities,
                                                [id]: createPattern(id),
                                            },
                                        });
                                    }}
                                >
                                    Add pattern
                                </button>
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
                                    onChange={(next, nextKey) => {
                                        const entities = {...layer.entities};
                                        delete entities[entityKey];
                                        entities[nextKey ?? entityKey] = next;
                                        onChange({...layer, entities});
                                    }}
                                    onRemove={() => {
                                        const entities = {...layer.entities};
                                        delete entities[entityKey];
                                        onChange({...layer, entities});
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
