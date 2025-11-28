import React, {useEffect, useMemo, useState} from 'react';
import {
    AnimatableBoolean,
    AnimatableColor,
    AnimatableCoord,
    AnimatableNumber,
    Box,
    BaseKind,
    Entity,
    Group,
    Fill,
    Line,
    Layer,
    Mods,
    Pattern,
    PatternContents,
    ShapeStyle,
    State,
    Color,
    colorToRgb,
} from './export-types';
import {Coord, Segment} from '../../../types';
import {rgbToString} from '../../../editor/PalettesForm';
import {colorToString, parseColor} from './colors';

type StateEditorProps = {
    value: State;
    onChange: (next: State) => void;
};

export const StateEditor = ({value, onChange}: StateEditorProps) => {
    const layers = useMemo(
        () => Object.entries(value.layers).sort(([, a], [, b]) => a.order - b.order),
        [value.layers],
    );
    const crops = useMemo(() => Object.entries(value.crops), [value.crops]);

    return (
        <div className="flex flex-col gap-6 items-stretch">
            <Section
                title="Layers"
                actions={
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                            const nextId = `layer-${layers.length + 1}`;
                            const nextLayers = {
                                ...value.layers,
                                [nextId]: createLayerTemplate(nextId),
                            };
                            onChange({...value, layers: nextLayers});
                        }}
                    >
                        Add Layer
                    </button>
                }
            >
                <div className="space-y-4">
                    {layers.length === 0 ? (
                        <div className="text-sm opacity-70">No layers defined.</div>
                    ) : null}
                    {layers.map(([key, layer]) => (
                        <LayerEditor
                            key={key}
                            layer={layer}
                            onChange={(nextLayer) => {
                                const nextLayers = {...value.layers};
                                delete nextLayers[key];
                                nextLayers[key] = nextLayer;
                                onChange({...value, layers: nextLayers});
                            }}
                            onRemove={() => {
                                const nextLayers = {...value.layers};
                                delete nextLayers[key];
                                onChange({...value, layers: nextLayers});
                            }}
                        />
                    ))}
                </div>
            </Section>

            <Section title="View">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <NumberField
                        label="PPI"
                        value={value.view.ppi}
                        onChange={(ppi) => onChange({...value, view: {...value.view, ppi}})}
                    />
                    {/* <TextField
                        label="Background"
                        value={value.view.background ?? ''}
                        placeholder="color or expression"
                        onChange={(background) =>
                            onChange({
                                ...value,
                                view: {...value.view, background: background || undefined},
                            })
                        }
                    /> */}
                    <BoxField
                        label="View Box"
                        value={value.view.box}
                        onChange={(box) => onChange({...value, view: {...value.view, box}})}
                    />
                </div>
            </Section>

            <Section title="Style Config" alignStart>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <TextField
                            label="Seed"
                            value={String(value.styleConfig.seed)}
                            onChange={(seed) =>
                                onChange({
                                    ...value,
                                    styleConfig: {
                                        ...value.styleConfig,
                                        seed: parseAnimatable(seed),
                                    },
                                })
                            }
                        />
                        <PaletteEditor
                            palette={value.styleConfig.palette}
                            onChange={(palette) =>
                                onChange({...value, styleConfig: {...value.styleConfig, palette}})
                            }
                        />
                    </div>
                    <ClocksEditor
                        clocks={value.styleConfig.clocks}
                        onChange={(clocks) =>
                            onChange({...value, styleConfig: {...value.styleConfig, clocks}})
                        }
                    />
                </div>
            </Section>

            <Section
                title="Crops"
                actions={
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                            const nextKey = `crop-${crops.length + 1}`;
                            const next = {...value.crops};
                            next[nextKey] = {id: nextKey, shape: defaultCropShape()};
                            onChange({...value, crops: next});
                        }}
                    >
                        Add Crop
                    </button>
                }
            >
                <div className="space-y-3">
                    {crops.length === 0 ? (
                        <div className="text-sm opacity-70">No crops configured.</div>
                    ) : null}
                    {crops.map(([key, crop]) => (
                        <div
                            key={key}
                            className="card bg-base-200 border border-base-300 shadow-sm"
                        >
                            <div className="card-body space-y-3">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                    <TextField
                                        label="Id"
                                        value={key}
                                        onChange={(nextKey) => {
                                            if (!nextKey) return;
                                            const next = {...value.crops};
                                            delete next[key];
                                            next[nextKey] = {...crop};
                                            onChange({...value, crops: next});
                                        }}
                                    />
                                    <div className="flex-1" />
                                    <button
                                        className="btn btn-ghost btn-sm text-error"
                                        onClick={() => {
                                            const next = {...value.crops};
                                            delete next[key];
                                            onChange({...value, crops: next});
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                                <JsonEditor
                                    label="Segments"
                                    value={crop.shape}
                                    onChange={(shape) =>
                                        onChange({
                                            ...value,
                                            crops: {...value.crops, [key]: {...crop, shape}},
                                        })
                                    }
                                />
                                {/* <ModsEditor
                                    value={crop.mods}
                                    onChange={(mods) =>
                                        onChange({
                                            ...value,
                                            crops: {...value.crops, [key]: {...crop, mods}},
                                        })
                                    }
                                /> */}
                            </div>
                        </div>
                    ))}
                </div>
            </Section>
        </div>
    );
};

const Section = ({
    title,
    children,
    actions,
    alignStart,
}: {
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
    alignStart?: boolean;
}) => {
    return (
        <details>
            <summary className="text-xl cursor-pointer hover:underline">
                {title}
                <div
                    className={`inline-flex ml-4 gap-3 ${alignStart ? 'items-start' : 'items-center'} justify-between`}
                >
                    {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
                </div>
            </summary>
            <div className="card bg-base-100 shadow-md border border-base-300">
                <div className="card-body space-y-4">{children}</div>
            </div>
        </details>
    );
};

const NumberField = ({
    label,
    value,
    onChange,
    step = 1,
}: {
    label: string;
    value: number;
    step?: number;
    onChange: (next: number) => void;
}) => (
    <label className="form-control w-full">
        <div className="label">
            <span className="label-text font-semibold">{label}</span>
        </div>
        <input
            className="input input-bordered w-full"
            type="number"
            value={value}
            step={step}
            onChange={(evt) => onChange(+evt.target.value)}
        />
    </label>
);

const TextField = ({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    placeholder?: string;
    onChange: (next: string) => void;
}) => (
    <label className="form-control w-full">
        <div className="label">
            <span className="label-text font-semibold">{label}</span>
        </div>
        <input
            className="input input-bordered w-full"
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(evt) => onChange(evt.target.value)}
        />
    </label>
);

const BoxField = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value: Box;
    onChange: (box: Box) => void;
}) => {
    const update = (key: keyof Box, next: number) => onChange({...value, [key]: next});
    return (
        <div className="bg-base-200 rounded-lg p-3 border border-base-300 space-y-2">
            <div className="font-semibold text-sm">{label}</div>
            <div className="grid grid-cols-2 gap-3">
                {(['x', 'y', 'width', 'height'] as const).map((key) => (
                    <NumberField
                        key={key}
                        label={key.toUpperCase()}
                        value={value[key]}
                        step={0.01}
                        onChange={(val) => update(key, val)}
                    />
                ))}
            </div>
        </div>
    );
};

const PaletteEditor = ({
    palette,
    onChange,
}: {
    palette: Color[];
    onChange: (next: Color[]) => void;
}) => {
    return (
        <div className="bg-base-200 rounded-lg border border-base-300 p-3 space-y-3">
            <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">Palette</div>
                <button
                    className="btn btn-sm btn-outline"
                    onClick={() => onChange([...palette, {r: 255, g: 255, b: 255}])}
                >
                    Add color
                </button>
            </div>
            <div className="space-y-2">
                {palette.map((color, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded border border-base-300"
                            style={{background: rgbToString(colorToRgb(color)) || 'transparent'}}
                        />
                        <BlurInput
                            value={colorToString(color)}
                            onChange={(v) => {
                                const c = parseColor(v);
                                if (!c) return;
                                const next = [...palette];
                                next[i] = c;
                                onChange(next);
                            }}
                        />
                        <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => onChange(palette.filter((_, idx) => idx !== i))}
                        >
                            Remove
                        </button>
                    </div>
                ))}
                {palette.length === 0 ? (
                    <div className="text-sm opacity-60">No colors yet. Add your first swatch.</div>
                ) : null}
            </div>
        </div>
    );
};

const ClocksEditor = ({
    clocks,
    onChange,
}: {
    clocks: State['styleConfig']['clocks'];
    onChange: (next: State['styleConfig']['clocks']) => void;
}) => {
    return (
        <div className="bg-base-200 rounded-lg border border-base-300 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-sm">Clocks</div>
                <button
                    className="btn btn-sm btn-outline"
                    onClick={() =>
                        onChange(
                            clocks.concat([
                                {
                                    name: `clock-${clocks.length + 1}`,
                                    t0: 0,
                                    t1: 1,
                                },
                            ]),
                        )
                    }
                >
                    Add clock
                </button>
            </div>
            <div className="space-y-2">
                {clocks.map((clock, idx) => (
                    <div
                        key={idx}
                        className="p-3 rounded bg-base-100 border border-base-300 space-y-2"
                    >
                        <div className="flex items-center gap-2">
                            <input
                                className="input input-bordered input-sm flex-1"
                                value={clock.name ?? ''}
                                placeholder="Name (optional)"
                                onChange={(evt) => {
                                    const next = [...clocks];
                                    next[idx] = {...clock, name: evt.target.value || undefined};
                                    onChange(next);
                                }}
                            />
                            <input
                                className="input input-bordered input-sm flex-1"
                                value={clock.ease ?? ''}
                                placeholder="Ease (optional)"
                                onChange={(evt) => {
                                    const next = [...clocks];
                                    next[idx] = {...clock, ease: evt.target.value || undefined};
                                    onChange(next);
                                }}
                            />
                            <button
                                className="btn btn-ghost btn-xs text-error"
                                onClick={() => onChange(clocks.filter((_, i) => i !== idx))}
                            >
                                Remove
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <NumberField
                                label="t0"
                                value={clock.t0}
                                step={0.01}
                                onChange={(t0) => {
                                    const next = [...clocks];
                                    next[idx] = {...clock, t0};
                                    onChange(next);
                                }}
                            />
                            <NumberField
                                label="t1"
                                value={clock.t1}
                                step={0.01}
                                onChange={(t1) => {
                                    const next = [...clocks];
                                    next[idx] = {...clock, t1};
                                    onChange(next);
                                }}
                            />
                        </div>
                    </div>
                ))}
                {clocks.length === 0 ? (
                    <div className="text-sm opacity-60">No clocks defined yet.</div>
                ) : null}
            </div>
        </div>
    );
};

const LayerEditor = ({
    layer,
    onChange,
    onRemove,
}: {
    layer: Layer;
    onChange: (next: Layer, nextKey?: string) => void;
    onRemove: () => void;
}) => {
    const entries = useMemo(() => Object.entries(layer.entities), [layer.entities]);

    return (
        <div className="card bg-base-200 border border-base-300 shadow-sm">
            <div className="card-body space-y-3">
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

                <div className="flex flex-col gap-4">
                    {/* <JsonEditor
                        label="Guides"
                        value={layer.guides}
                        onChange={(guides) => onChange({...layer, guides})}
                    /> */}
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
                                    key={entityKey}
                                    entityKey={entityKey}
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

const EntityEditor = ({
    entityKey,
    value,
    onChange,
    onRemove,
}: {
    entityKey: string;
    value: Entity;
    onChange: (next: Entity, nextKey?: string) => void;
    onRemove: () => void;
}) => {
    const [type, setType] = useState<Entity['type']>(value.type);

    useEffect(() => {
        setType(value.type);
    }, [value.type]);

    return (
        <details className="rounded border border-base-300 bg-base-100 p-3 space-y-3">
            <summary className="cursor-pointer hover:text-accent">
                <div className="inline-flex">
                    {value.type}
                    <div className="flex-1" />

                    <button className="btn btn-ghost btn-xs text-error" onClick={onRemove}>
                        Remove
                    </button>
                </div>
            </summary>

            {value.type === 'Group' ? (
                <GroupEditor value={value} onChange={(next) => onChange(next)} />
            ) : null}
            {value.type === 'Pattern' ? (
                <PatternEditor value={value} onChange={(next) => onChange(next)} />
            ) : null}
            {value.type === 'Object' ? (
                <div className="space-y-2">
                    <label className="form-control">
                        <div className="label">
                            <span className="label-text font-semibold">Open</span>
                        </div>
                        <input
                            className="toggle toggle-primary"
                            type="checkbox"
                            checked={value.open ?? false}
                            onChange={(evt) => onChange({...value, open: evt.target.checked})}
                        />
                    </label>
                    <JsonEditor
                        label="Segments"
                        value={value.segments}
                        onChange={(segments) =>
                            onChange({...value, segments: segments as Segment[]})
                        }
                    />
                    <JsonEditor
                        label="Style"
                        value={value.style}
                        onChange={(style) => onChange({...value, style})}
                    />
                </div>
            ) : null}
        </details>
    );
};

const GroupEditor = ({value, onChange}: {value: Group; onChange: (next: Group) => void}) => {
    const entries = useMemo(() => Object.entries(value.entities), [value.entities]);

    return (
        <div className="space-y-3">
            <TextField
                label="Name"
                value={value.name ?? ''}
                onChange={(name) => onChange({...value, name: name || undefined})}
            />
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">Child order</div>
                    <button
                        className="btn btn-outline btn-xs"
                        onClick={() =>
                            onChange({
                                ...value,
                                entities: {
                                    ...value.entities,
                                    [`child-${entries.length + 1}`]: entries.length,
                                },
                            })
                        }
                    >
                        Add child ref
                    </button>
                </div>
                {entries.length === 0 ? (
                    <div className="text-sm opacity-60">No members linked.</div>
                ) : null}
                <div className="space-y-2">
                    {entries.map(([key, order]) => (
                        <div key={key} className="flex flex-col md:flex-row gap-2">
                            <TextField
                                label="Id"
                                value={key}
                                onChange={(nextKey) => {
                                    const entities = {...value.entities};
                                    delete entities[key];
                                    entities[nextKey] = order;
                                    onChange({...value, entities});
                                }}
                            />
                            <NumberField
                                label="Order"
                                value={order}
                                onChange={(next) =>
                                    onChange({...value, entities: {...value.entities, [key]: next}})
                                }
                            />
                            <div className="flex-1" />
                            <button
                                className="btn btn-ghost btn-xs text-error"
                                onClick={() => {
                                    const entities = {...value.entities};
                                    delete entities[key];
                                    onChange({...value, entities});
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">Crops</div>
                    <button
                        className="btn btn-outline btn-xs"
                        onClick={() =>
                            onChange({
                                ...value,
                                crops: value.crops.concat([{id: `crop-${value.crops.length + 1}`}]),
                            })
                        }
                    >
                        Add crop ref
                    </button>
                </div>
                {value.crops.length === 0 ? (
                    <div className="text-sm opacity-60">No crops applied.</div>
                ) : null}
                <div className="space-y-2">
                    {value.crops.map((crop, i) => (
                        <div key={i} className="flex flex-col md:flex-row gap-2 md:items-center">
                            <TextField
                                label="Crop id"
                                value={crop.id}
                                onChange={(id) => {
                                    const crops = [...value.crops];
                                    crops[i] = {...crop, id};
                                    onChange({...value, crops});
                                }}
                            />
                            <label className="label cursor-pointer gap-2">
                                <span className="label-text text-sm">Hole</span>
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    checked={crop.hole ?? false}
                                    onChange={(evt) => {
                                        const crops = [...value.crops];
                                        crops[i] = {...crop, hole: evt.target.checked || undefined};
                                        onChange({...value, crops});
                                    }}
                                />
                            </label>
                            <label className="label cursor-pointer gap-2">
                                <span className="label-text text-sm">Rough</span>
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    checked={crop.rough ?? false}
                                    onChange={(evt) => {
                                        const crops = [...value.crops];
                                        crops[i] = {
                                            ...crop,
                                            rough: evt.target.checked || undefined,
                                        };
                                        onChange({...value, crops});
                                    }}
                                />
                            </label>
                            <div className="flex-1" />
                            <button
                                className="btn btn-ghost btn-xs text-error"
                                onClick={() =>
                                    onChange({
                                        ...value,
                                        crops: value.crops.filter((_, idx) => idx !== i),
                                    })
                                }
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            </div> */}
        </div>
    );
};

const PatternEditor = ({value, onChange}: {value: Pattern; onChange: (next: Pattern) => void}) => {
    return (
        <div className="space-y-3">
            {typeof value.psize === 'number' ? (
                <NumberField
                    label="Size"
                    value={value.psize}
                    onChange={(v) => onChange({...value, psize: v})}
                />
            ) : (
                <CoordField
                    label="Pattern size"
                    value={value.psize}
                    onChange={(psize) => onChange({...value, psize})}
                />
            )}
            {/* <ModsEditor
                value={value.mods}
                onChange={(mods) => (mods ? onChange({...value, mods}) : undefined)}
            /> */}
            <PatternContentsEditor
                value={value.contents}
                onChange={(contents) => onChange({...value, contents})}
            />
        </div>
    );
};

const PatternContentsEditor = ({
    value,
    onChange,
}: {
    value: PatternContents;
    onChange: (next: PatternContents) => void;
}) => {
    const [type, setType] = useState<PatternContents['type']>(value.type);

    useEffect(() => {
        setType(value.type);
    }, [value.type]);

    const swapType = (nextType: PatternContents['type']) => {
        setType(nextType);
        if (nextType === value.type) return;
        switch (nextType) {
            case 'shapes':
                onChange({type: 'shapes', styles: {}});
                break;
            case 'weave':
                onChange({type: 'weave', orderings: {}, styles: {}});
                break;
            case 'lines':
                onChange({type: 'lines', styles: {}});
                break;
            case 'layers':
                onChange({type: 'layers', origin: {x: 0, y: 0}, reverse: false, styles: {}});
                break;
        }
    };

    return (
        <div className="rounded border border-base-300 p-3 bg-base-100 space-y-3">
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <div className="font-semibold text-sm">Contents</div>
                <select
                    className="select select-bordered w-full md:w-auto"
                    value={type}
                    onChange={(evt) => swapType(evt.target.value as PatternContents['type'])}
                >
                    <option value="shapes">Shapes</option>
                    <option value="weave">Weave</option>
                    <option value="lines">Lines</option>
                    <option value="layers">Layers</option>
                </select>
            </div>
            {value.type === 'layers' ? (
                <div className="space-y-2">
                    <AnimCoordInput
                        label="Origin"
                        value={value.origin}
                        onChange={(origin: AnimatableCoord | undefined | null) =>
                            origin != null ? onChange({...value, origin}) : undefined
                        }
                    />
                    <label className="label cursor-pointer gap-2">
                        <span className="label-text text-sm">Reverse</span>
                        <input
                            className="checkbox"
                            type="checkbox"
                            checked={!!value.reverse}
                            onChange={(evt) => onChange({...value, reverse: evt.target.checked})}
                        />
                    </label>
                    {/* <JsonEditor
                        label="Styles"
                        value={value.styles}
                        onChange={(styles) =>
                            onChange({
                                ...value,
                                styles: styles as typeof value.styles,
                            })
                        }
                    /> */}
                </div>
            ) : null}
            {value.type === 'weave' ? (
                <div className="space-y-2">
                    <NumberField
                        label="Flip"
                        value={value.flip ?? 0}
                        onChange={(flip) => onChange({...value, flip})}
                    />
                    <JsonEditor
                        label="Orderings"
                        value={value.orderings}
                        onChange={(orderings) =>
                            onChange({...value, orderings: orderings as Record<string, number[]>})
                        }
                    />
                    <JsonEditor
                        label="Styles"
                        value={value.styles}
                        onChange={(styles) =>
                            onChange({...value, styles: styles as typeof value.styles})
                        }
                    />
                </div>
            ) : null}
            {value.type === 'shapes' ? (
                <ShapeStylesEditor
                    styles={value.styles}
                    onChange={(styles) =>
                        onChange({
                            ...value,
                            styles,
                        })
                    }
                />
            ) : null}
            {value.type === 'lines' ? (
                <JsonEditor
                    label="Styles"
                    value={value.styles}
                    onChange={(styles) =>
                        onChange({
                            ...value,
                            styles: styles as typeof value.styles,
                        })
                    }
                />
            ) : null}
        </div>
    );
};

const ModsEditor = ({
    value,
    onChange,
}: {
    value?: Mods;
    onChange: (next: Mods | undefined) => void;
}) => {
    const mods = value ?? {};
    const setField = (key: keyof Mods, val: Mods[typeof key]) => {
        const next = {...mods, [key]: val};
        // const cleaned = Object.entries(next).reduce((acc, [k, v]) => {
        //     if (v !== undefined && v !== '') acc[k as keyof Mods] = v as Mods[keyof Mods];
        //     return acc;
        // }, {} as Mods);
        // onChange(Object.keys(cleaned).length ? cleaned : undefined);
    };

    return (
        <details className="bg-base-200 rounded-lg border border-base-300 p-3 space-y-2">
            <summary className="font-semibold text-sm">Mods</summary>
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <AnimInput
                    label="Inset"
                    value={mods.inset}
                    onChange={(v) => setField('inset', v)}
                />
                <AnimCoordInput
                    label="Scale"
                    value={mods.scale}
                    onChange={(v) => setField('scale', v as AnimatableCoord | AnimatableNumber)}
                />
                <AnimCoordInput
                    label="Scale origin"
                    value={mods.scaleOrigin}
                    onChange={(v) => setField('scaleOrigin', v)}
                />
                <AnimCoordInput
                    label="Offset"
                    value={mods.offset}
                    onChange={(v) => setField('offset', v)}
                />
                <AnimInput
                    label="Rotation"
                    value={mods.rotation}
                    onChange={(v) => setField('rotation', v)}
                />
                <AnimCoordInput
                    label="Rotation origin"
                    value={mods.rotationOrigin}
                    onChange={(v) => setField('rotationOrigin', v)}
                />
                <AnimInput
                    label="Opacity"
                    value={mods.opacity}
                    onChange={(v) => setField('opacity', v)}
                />
                <AnimInput label="Tint" value={mods.tint} onChange={(v) => setField('tint', v)} />
                <AnimInput
                    label="Thickness"
                    value={mods.thickness}
                    onChange={(v) => setField('thickness', v)}
                />
            </div> */}
            {value && Object.keys(value).length ? (
                <button className="btn btn-ghost btn-xs" onClick={() => onChange(undefined)}>
                    Clear mods
                </button>
            ) : null}
        </details>
    );
};

const AnimColor = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value?: AnimatableColor;
    onChange: (next?: AnimatableColor) => void;
}) => (
    <label className="form-control">
        <div className="label">
            <span className="label-text text-sm font-semibold">{label}</span>
        </div>
        <BlurInput
            value={
                value != null
                    ? typeof value === 'string' || typeof value === 'number'
                        ? '' + value
                        : colorToString(value)
                    : ''
            }
            placeholder="number | expression"
            onChange={(value) => {
                const parsed = parseAnimatable(value);
                onChange(value.trim() ? parsed : undefined);
            }}
        />
    </label>
);

const AnimInput = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value?: AnimatableNumber | AnimatableBoolean | AnimatableColor;
    onChange: (next?: AnimatableNumber | AnimatableBoolean | AnimatableColor) => void;
}) => (
    <label className="form-control">
        <div className="label">
            <span className="label-text text-sm font-semibold">{label}</span>
        </div>
        <BlurInput
            value={value != null ? String(value) : ''}
            placeholder="number | expression"
            onChange={(value) => {
                const parsed = parseAnimatable(value);
                onChange(value.trim() ? parsed : undefined);
            }}
        />
    </label>
);

const AnimCoordOrNumberInput = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value?: AnimatableCoord | AnimatableNumber;
    onChange: (next?: AnimatableCoord | AnimatableNumber) => void;
}) => {
    const isCoord = value && typeof value === 'object' && 'x' in value && 'y' in value;
    const [mode, setMode] = useState<'coord' | 'raw'>(isCoord ? 'coord' : 'raw');

    useEffect(() => {
        if (isCoord && mode !== 'coord') {
            setMode('coord');
        }
        if (!isCoord && mode !== 'raw') {
            setMode('raw');
        }
    }, [isCoord, mode]);

    return (
        <div className="form-control">
            <div className="label flex gap-2 items-center">
                <span className="label-text text-sm font-semibold">{label}</span>
                <div className="join join-vertical md:join-horizontal">
                    <button
                        className={`btn btn-xs join-item ${mode === 'coord' ? 'btn-active' : ''}`}
                        onClick={(evt) => {
                            evt.preventDefault();
                            setMode('coord');
                            if (!isCoord) {
                                onChange({x: 0, y: 0});
                            }
                        }}
                    >
                        x/y
                    </button>
                    <button
                        className={`btn btn-xs join-item ${mode === 'raw' ? 'btn-active' : ''}`}
                        onClick={(evt) => {
                            evt.preventDefault();
                            setMode('raw');
                            if (isCoord) {
                                onChange(`({x: ${(value as Coord).x}, y: ${(value as Coord).y}})`);
                            }
                        }}
                    >
                        Raw
                    </button>
                </div>
            </div>
            {mode === 'coord' ? (
                <CoordField
                    label=""
                    value={isCoord ? (value as Coord) : {x: 0, y: 0}}
                    onChange={(coord) => onChange(coord)}
                />
            ) : (
                <BlurInput
                    value={value != null && !isCoord ? String(value) : ''}
                    placeholder="number | expression"
                    onChange={(value) => onChange(parseAnimatable(value))}
                />
            )}
        </div>
    );
};

const AnimCoordInput = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value?: AnimatableCoord;
    onChange: (next?: AnimatableCoord) => void;
}) => {
    const isCoord = value && typeof value === 'object' && 'x' in value && 'y' in value;
    const [mode, setMode] = useState<'coord' | 'raw'>(isCoord ? 'coord' : 'raw');

    useEffect(() => {
        if (isCoord && mode !== 'coord') {
            setMode('coord');
        }
        if (!isCoord && mode !== 'raw') {
            setMode('raw');
        }
    }, [isCoord, mode]);

    return (
        <div className="form-control">
            <div className="label flex gap-2 items-center">
                <span className="label-text text-sm font-semibold">{label}</span>
                <div className="join join-vertical md:join-horizontal">
                    <button
                        className={`btn btn-xs join-item ${mode === 'coord' ? 'btn-active' : ''}`}
                        onClick={(evt) => {
                            evt.preventDefault();
                            setMode('coord');
                            if (!isCoord) {
                                onChange({x: 0, y: 0});
                            }
                        }}
                    >
                        x/y
                    </button>
                    <button
                        className={`btn btn-xs join-item ${mode === 'raw' ? 'btn-active' : ''}`}
                        onClick={(evt) => {
                            evt.preventDefault();
                            setMode('raw');
                            if (isCoord) {
                                onChange(`({x: ${(value as Coord).x}, y: ${(value as Coord).y}})`);
                            }
                        }}
                    >
                        Raw
                    </button>
                </div>
            </div>
            {mode === 'coord' ? (
                <CoordField
                    label=""
                    value={isCoord ? (value as Coord) : {x: 0, y: 0}}
                    onChange={(coord) => onChange(coord)}
                />
            ) : (
                <BlurInput
                    value={value != null && !isCoord ? String(value) : ''}
                    placeholder="expression"
                    onChange={(value) => onChange(value)}
                />
            )}
        </div>
    );
};

const BlurInput = ({
    value,
    onChange,
    placeholder,
}: {
    placeholder?: string;
    value: string;
    onChange: (v: string) => void;
}) => {
    const [text, setText] = useState<string | null>(null);
    return (
        <input
            className={
                'input input-sm ' + (text != null && text !== value ? 'outline-blue-400' : '')
            }
            value={text ?? value}
            onBlur={() => {
                if (text != null) {
                    if (text !== value) onChange(text);
                    setText(null);
                }
            }}
            onKeyDown={(evt) => {
                if (evt.key === 'Enter') {
                    if (text != null) {
                        if (text !== value) onChange(text);
                        setText(null);
                    }
                }
            }}
            placeholder={placeholder}
            onChange={(evt) => setText(evt.target.value)}
        />
    );
};

const CoordField = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value: Coord;
    onChange: (next: Coord) => void;
}) => {
    return (
        <div className="bg-base-200 rounded-lg p-3 border border-base-300 space-y-2">
            {label ? <div className="font-semibold text-sm">{label}</div> : null}
            <div className="grid grid-cols-2 gap-2">
                <NumberField
                    label="X"
                    value={value.x}
                    step={0.01}
                    onChange={(x) => onChange({...value, x})}
                />
                <NumberField
                    label="Y"
                    value={value.y}
                    step={0.01}
                    onChange={(y) => onChange({...value, y})}
                />
            </div>
        </div>
    );
};

const JsonEditor = <T,>({
    label,
    value,
    onChange,
}: {
    label: string;
    value: T;
    onChange: (next: T) => void;
}) => {
    const [draft, setDraft] = useState(() => JSON.stringify(value, null, 2));
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setDraft(JSON.stringify(value, null, 2));
    }, [value]);

    return (
        <div className="form-control">
            <div className="label">
                <span className="label-text font-semibold">{label}</span>
                {error ? <span className="label-text-alt text-error">{error}</span> : null}
            </div>
            <textarea
                className={`textarea textarea-bordered font-mono text-xs min-h-[120px] ${error ? 'textarea-error' : ''}`}
                value={draft}
                onChange={(evt) => setDraft(evt.target.value)}
                onBlur={() => {
                    try {
                        onChange(JSON.parse(draft));
                        setError(null);
                    } catch (err) {
                        setError('Invalid JSON');
                    }
                }}
            />
            <div className="label">
                <span className="label-text-alt">Paste JSON for quick edits</span>
            </div>
        </div>
    );
};

const createLayerTemplate = (id: string): Layer => ({
    id,
    order: 0,
    opacity: 1,
    rootGroup: 'root',
    entities: {},
    guides: [],
    shared: {},
});

const createGroup = (id: string): Group => ({
    type: 'Group',
    id,
    name: id,
    entities: {},
});

const createPattern = (id: string): Pattern => ({
    type: 'Pattern',
    id,
    psize: {x: 1, y: 1},
    contents: {type: 'shapes', styles: {}},
    mods: [],
});

const defaultCropShape = (): Segment[] => [
    {type: 'Line', to: {x: 1, y: 0}},
    {type: 'Line', to: {x: 1, y: 1}},
    {type: 'Line', to: {x: 0, y: 1}},
    {type: 'Line', to: {x: 0, y: 0}},
];

const parseAnimatable = (value: string): AnimatableNumber => {
    const trimmed = value.trim();
    if (!trimmed) return '' as unknown as AnimatableNumber;
    const num = Number(trimmed);
    return Number.isFinite(num) ? (num as AnimatableNumber) : (trimmed as AnimatableNumber);
};

const ShapeStylesEditor = ({
    styles,
    onChange,
}: {
    styles: Record<string, ShapeStyle>;
    onChange: (next: Record<string, ShapeStyle>) => void;
}) => {
    const entries = useMemo(
        () => Object.entries(styles).sort(([, a], [, b]) => a.order - b.order),
        [styles],
    );

    const upsert = (key: string, style: ShapeStyle, nextKey?: string) => {
        const record = {...styles};
        delete record[key];
        record[nextKey ?? key] = style;
        onChange(record);
    };

    return (
        <div className="bg-base-200 rounded-lg border border-base-300 p-3 space-y-3">
            <div className="flex items-center justify-between">
                <div className="font-semibold">Shape Styles</div>
                <button
                    className="btn btn-xs btn-outline"
                    onClick={() => {
                        const id = `style-${entries.length + 1}`;
                        upsert(id, createShapeStyle(id));
                    }}
                >
                    Add style
                </button>
            </div>
            {entries.length === 0 ? <div className="text-sm opacity-60">No styles yet.</div> : null}
            <div className="space-y-3">
                {entries.map(([key, style]) => (
                    <ShapeStyleCard
                        key={key}
                        value={style}
                        onChange={(next, nextKey) => upsert(key, next, nextKey)}
                        onRemove={() => {
                            const record = {...styles};
                            delete record[key];
                            onChange(record);
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

const ShapeStyleCard = ({
    value,
    onChange,
    onRemove,
}: {
    value: ShapeStyle;
    onChange: (next: ShapeStyle, nextKey?: string) => void;
    onRemove: () => void;
}) => {
    return (
        <div className="card bg-base-100 border border-base-300">
            <div className="card-body space-y-3">
                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                    <NumberField
                        label="Order"
                        value={value.order}
                        onChange={(order) => onChange({...value, order})}
                    />
                    <div className="flex-1" />
                    <button className="btn btn-ghost btn-xs text-error" onClick={onRemove}>
                        Remove
                    </button>
                </div>
                <BaseKindEditor
                    label="Kind"
                    value={value.kind}
                    onChange={(kind) => onChange({...value, kind})}
                />
                <div className="flex flex-col gap-3">
                    <SubStyleList
                        label="Fills"
                        emptyLabel="No fills"
                        items={value.fills}
                        createItem={createFill}
                        render={(key, fill, update, remove) => (
                            <FillEditor
                                objectKey={key}
                                value={fill}
                                onChange={update}
                                onRemove={remove}
                            />
                        )}
                        onChange={(fills) => onChange({...value, fills})}
                    />
                    <SubStyleList
                        label="Lines"
                        emptyLabel="No lines"
                        items={value.lines}
                        createItem={createLine}
                        render={(key, line, update, remove) => (
                            <LineEditor
                                objectKey={key}
                                value={line}
                                onChange={update}
                                onRemove={remove}
                            />
                        )}
                        onChange={(lines) => onChange({...value, lines})}
                    />
                </div>
                {/* <ModsEditor value={value.mods} onChange={(mods) => onChange({...value, mods})} /> */}
            </div>
        </div>
    );
};

const BaseKindEditor = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value: BaseKind | {type: 'shape'; key: string; rotInvariant: boolean};
    onChange: (next: BaseKind | {type: 'shape'; key: string; rotInvariant: boolean}) => void;
}) => {
    const type = value.type;
    return (
        <div className="bg-base-200 rounded-lg p-3 border border-base-300 space-y-2">
            <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">{label}</div>
                <div className="flex flex-wrap gap-2">
                    <select
                        value={type}
                        onChange={(evt) => {
                            switch (evt.target.value) {
                                case 'everything':
                                    onChange({type: 'everything'});
                                    return;
                                case 'alternating':
                                    onChange(
                                        value.type === 'alternating'
                                            ? value
                                            : {type: 'alternating', index: 0},
                                    );
                                    return;
                                case 'explicit':
                                    onChange(
                                        value.type === 'explicit'
                                            ? value
                                            : {type: 'explicit', ids: {}},
                                    );
                                    return;
                                case 'shape':
                                    onChange(
                                        value.type === 'shape'
                                            ? value
                                            : {type: 'shape', key: '', rotInvariant: false},
                                    );
                                    return;
                            }
                        }}
                    >
                        {(['everything', 'alternating', 'explicit', 'shape'] as const).map((t) => (
                            <option
                                key={t}
                                value={t}
                                // className={`btn btn-xs ${type === t ? 'btn-active' : 'btn-outline'}`}
                            >
                                {t}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            {type === 'alternating' ? (
                <NumberField
                    label="Index"
                    value={value.index}
                    onChange={(index) => onChange({...value, index})}
                />
            ) : null}
            {type === 'explicit' ? (
                <TextField
                    label="Ids (comma separated)"
                    value={Object.keys(value.ids).join(',')}
                    onChange={(text) => {
                        const ids = text
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean)
                            .reduce(
                                (acc, key) => {
                                    acc[key] = true;
                                    return acc;
                                },
                                {} as Record<string, true>,
                            );
                        onChange({...value, ids});
                    }}
                />
            ) : null}
            {type === 'shape' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <TextField
                        label="Shape key"
                        value={value.key}
                        onChange={(key) => onChange({...value, key})}
                    />
                    <label className="label cursor-pointer gap-2">
                        <span className="label-text text-sm">Rotation invariant</span>
                        <input
                            className="checkbox"
                            type="checkbox"
                            checked={value.rotInvariant}
                            onChange={(evt) =>
                                onChange({...value, rotInvariant: evt.target.checked})
                            }
                        />
                    </label>
                </div>
            ) : null}
        </div>
    );
};

const SubStyleList = <T,>({
    label,
    emptyLabel,
    items,
    createItem,
    render,
    onChange,
}: {
    label: string;
    emptyLabel: string;
    items: Record<string, T>;
    createItem: (id: string) => T;
    render: (
        key: string,
        value: T,
        update: (next: T, nextKey?: string) => void,
        remove: () => void,
    ) => React.ReactNode;
    onChange: (next: Record<string, T>) => void;
}) => {
    const entries = useMemo(() => Object.entries(items), [items]);

    const upsert = (key: string, value: T, nextKey?: string) => {
        const record = {...items};
        delete record[key];
        record[nextKey ?? key] = value;
        onChange(record);
    };

    return (
        <div className="bg-base-100 rounded-lg border border-base-300 p-3 space-y-2">
            <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">{label}</div>
                <button
                    className="btn btn-xs btn-outline"
                    onClick={() => {
                        const id = `${label.toLowerCase()}-${entries.length + 1}`;
                        upsert(id, createItem(id));
                    }}
                >
                    Add
                </button>
            </div>
            {entries.length === 0 ? <div className="text-xs opacity-60">{emptyLabel}</div> : null}
            <div className="space-y-2">
                {entries.map(([key, value]) => (
                    <div key={key} className="rounded border border-base-300 p-2">
                        {render(
                            key,
                            value,
                            (next, nextKey) => upsert(key, next, nextKey),
                            () => {
                                const record = {...items};
                                delete record[key];
                                onChange(record);
                            },
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const FillEditor = ({
    objectKey,
    value,
    onChange,
    onRemove,
}: {
    objectKey: string;
    value: Fill;
    onChange: (next: Fill, nextKey?: string) => void;
    onRemove: () => void;
}) => {
    return (
        <div className="space-y-2 relative">
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <div className="flex-1" />
                <button
                    className="btn btn-ghost btn-xs text-error absolute top-0 right-0"
                    onClick={onRemove}
                >
                    &times;
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <AnimInput
                    label="zIndex"
                    value={value.zIndex}
                    onChange={(zIndex) => onChange({...value, zIndex: zIndex as AnimatableNumber})}
                />
                <AnimColor
                    label="Color"
                    value={value.color}
                    onChange={(color) => onChange({...value, color: color as AnimatableColor})}
                />
                <AnimInput
                    label="Rounded"
                    value={value.rounded}
                    onChange={(rounded) =>
                        onChange({...value, rounded: rounded as AnimatableNumber})
                    }
                />
            </div>
            {/* <ModsEditor value={value.mods} onChange={(mods) => onChange({...value, mods})} /> */}
        </div>
    );
};

const LineEditor = ({
    objectKey,
    value,
    onChange,
    onRemove,
}: {
    objectKey: string;
    value: Line;
    onChange: (next: Line, nextKey?: string) => void;
    onRemove: () => void;
}) => {
    return (
        <div className="space-y-2">
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <TextField
                    label="Key"
                    value={objectKey}
                    onChange={(nextKey) => onChange({...value, id: nextKey}, nextKey)}
                />
                <TextField
                    label="Id"
                    value={value.id}
                    onChange={(id) => onChange({...value, id})}
                />
                <div className="flex-1" />
                <button className="btn btn-ghost btn-xs text-error" onClick={onRemove}>
                    Remove
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <AnimInput
                    label="zIndex"
                    value={value.zIndex}
                    onChange={(zIndex) => onChange({...value, zIndex: zIndex as AnimatableNumber})}
                />
                <AnimColor
                    label="Color"
                    value={value.color}
                    onChange={(color) => onChange({...value, color: color as AnimatableColor})}
                />
                <AnimInput
                    label="Width"
                    value={value.width}
                    onChange={(width) => onChange({...value, width: width as AnimatableNumber})}
                />
                <AnimInput
                    label="Sharp"
                    value={value.sharp}
                    onChange={(sharp) => onChange({...value, sharp: sharp as AnimatableBoolean})}
                />
            </div>
            {/* <ModsEditor value={value.mods} onChange={(mods) => onChange({...value, mods})} /> */}
        </div>
    );
};

const createShapeStyle = (id: string): ShapeStyle => ({
    id,
    order: 0,
    kind: {type: 'everything'},
    fills: {},
    lines: {},
    mods: [],
});

const createFill = (id: string): Fill => ({
    id,
    mods: [],
});

const createLine = (id: string): Line => ({
    id,
    mods: [],
});
