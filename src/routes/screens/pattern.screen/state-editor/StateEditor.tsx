import React, {useEffect, useMemo, useRef} from 'react';
import {State} from '../export-types';
import {genid} from '../genid';
import {useEditState} from '../editState';
import {transformBarePath} from '../../../../rendering/points';
import {translationMatrix} from '../../../../rendering/getMirrorTransforms';
import {ShapeEditor} from './ShapeEditor';
import {JsonEditor} from './JsonEditor';
import {AnimColor} from './AnimColor';
import {TimelineEditor} from './TimelineEditor';
import {Section} from './Section';
import {NumberField} from './NumberField';
import {TextField} from './TextField';
import {BoxField} from './BoxField';
import {PaletteEditor} from './PaletteEditor';
import {LayerEditor} from './LayerEditor';
import {createLayerTemplate, parseAnimatable} from './createLayerTemplate';

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
    const editState = useEditState();
    const onHover = editState.update.hover.replace;
    const showShapes = editState.use((s) => s.showShapes);

    const latest = useRef(value);
    latest.current = value;
    useEffect(() => {
        // @ts-ignore
        window.state = value;
    }, [value]);

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
                            palette={value.styleConfig.palette}
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

            <Section
                title="Shapes"
                open={showShapes}
                onOpen={(open) => editState.update.showShapes.replace(open)}
                actions={
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={(evt) => {
                            evt.stopPropagation();
                            editState.update.pending.replace({
                                type: 'shape',
                                onDone(points, open) {
                                    const nextId = genid();
                                    onChange({
                                        ...value,
                                        shapes: {
                                            ...value.shapes,
                                            [nextId]: {
                                                origin: points[0],
                                                segments: points
                                                    .slice(1)
                                                    .map((to) => ({type: 'Line', to})),
                                                open,
                                            },
                                        },
                                    });
                                },
                                points: [],
                            });
                        }}
                    >
                        Add Shape
                    </button>
                }
            >
                <div className="flex flex-row flex-wrap">
                    {Object.entries(value.shapes).map(([id, shape]) => (
                        <ShapeEditor
                            id={id}
                            shape={shape}
                            onChange={(shape) => {
                                const shapes = {...value.shapes};
                                if (shape == null) {
                                    delete shapes[id];
                                } else {
                                    shapes[id] = shape;
                                }
                                onChange({...value, shapes});
                            }}
                            onDup={(pt) => {
                                const shapes = {...latest.current.shapes};
                                const id = genid();
                                shapes[id] = transformBarePath(shape, [
                                    translationMatrix({
                                        x: pt.x - shape.origin.x,
                                        y: pt.y - shape.origin.y,
                                    }),
                                ]);
                                onChange({...latest.current, shapes});
                            }}
                            onHover={onHover}
                        />
                    ))}
                    {/* <JsonEditor
                        value={value.shapes}
                        onChange={(shapes) => onChange({...value, shapes})}
                        label="Shapes"
                    /> */}
                </div>
            </Section>

            <Section title="View">
                <div className="flex flex-col gap-4">
                    <div className="flex gap-4">
                        <NumberField
                            label="PPI"
                            value={value.view.ppi}
                            onChange={(ppi) => onChange({...value, view: {...value.view, ppi}})}
                        />
                        <AnimColor
                            label="Background"
                            value={value.view.background}
                            palette={value.styleConfig.palette}
                            onChange={(background) =>
                                onChange({
                                    ...value,
                                    view: {...value.view, background: background || undefined},
                                })
                            }
                        />
                    </div>
                    <BoxField
                        label="View Box"
                        value={value.view.box}
                        onChange={(box) => onChange({...value, view: {...value.view, box}})}
                    />
                </div>
            </Section>

            <Section title="Style Config" alignStart>
                <div className="flex flex-col">
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
                    {/* <ClocksEditor
                        clocks={value.styleConfig.clocks}
                        onChange={(clocks) =>
                            onChange({...value, styleConfig: {...value.styleConfig, clocks}})
                        }
                    /> */}
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
                            // next[nextKey] = {id: nextKey, shape: defaultCropShape()};
                            // onChange({...value, crops: next});
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
            <Section title="Timelines">
                <TimelineEditor
                    timeline={value.styleConfig.timeline}
                    onChange={(timeline) => {
                        onChange({
                            ...value,
                            styleConfig: {
                                ...value.styleConfig,
                                timeline,
                            },
                        });
                    }}
                />
            </Section>
        </div>
    );
};
