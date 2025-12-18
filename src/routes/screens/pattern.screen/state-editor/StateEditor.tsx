import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Box, State} from '../export-types';
import {genid} from '../genid';
import {useEditState, usePendingState} from '../editState';
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
import {JsonPatchOp, Path} from '../../../../json-diff/helper2';
import {Updater} from '../../../../json-diff/Updater';
import {ModsEditor} from './FillEditor';
import {ExportAnnotation, useExportState} from '../ExportHistory';
import {History} from '../../../../json-diff/history';
import {WorkerSend} from '../render-client';
import {Patterns} from '../evaluate';
import {runPNGExport} from '../runPNGExport';

type StateEditorProps = {
    value: State;
    update: Updater<State>;
    id: string;
    worker: WorkerSend;
    patterns: Patterns;
};

export const StateEditor = ({value, worker, patterns, update, id}: StateEditorProps) => {
    const layers = useMemo(
        () => Object.entries(value.layers).sort(([, a], [, b]) => a.order - b.order),
        [value.layers],
    );
    const crops = useMemo(() => Object.entries(value.crops), [value.crops]);
    const pendingState = usePendingState();
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
        <div className="flex flex-col gap-6 items-stretch p-4">
            <Section
                title="Layers"
                actions={
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                            const nextId = `layer-${layers.length + 1}`;
                            update.layers[nextId].add(createLayerTemplate(nextId));
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
                            update={update.layers[key]}
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
                            pendingState.update.pending.replace({
                                type: 'shape',
                                onDone(points, open) {
                                    const nextId = genid();
                                    update.shapes[nextId].add({
                                        origin: points[0],
                                        segments: points.slice(1).map((to) => ({type: 'Line', to})),
                                        open,
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
                            key={id}
                            shape={shape}
                            update={update.shapes[id]}
                            onCrop={() => {
                                const cid = genid();
                                update.crops[cid].add({id: cid, shape: id});
                            }}
                            onDup={(pt) => {
                                const id = genid();
                                update.shapes[id].add(
                                    transformBarePath(shape, [
                                        translationMatrix({
                                            x: pt.x - shape.origin.x,
                                            y: pt.y - shape.origin.y,
                                        }),
                                    ]),
                                );
                            }}
                            onHover={onHover}
                        />
                    ))}
                </div>
            </Section>

            <Section title="View">
                <div className="flex flex-col gap-4">
                    <div className="flex gap-4">
                        <NumberField
                            label="PPI"
                            value={value.view.ppi}
                            onChange={update.view.ppi}
                        />
                        <AnimColor
                            label="Background"
                            value={value.view.background}
                            palette={value.styleConfig.palette}
                            onChange={update.view.background}
                        />
                    </div>
                    <BoxField label="View Box" value={value.view.box} update={update.view.box} />
                </div>
            </Section>

            <Section title="Style Config" alignStart>
                <div className="flex flex-col">
                    <div className="space-y-3">
                        <TextField
                            label="Seed"
                            value={String(value.styleConfig.seed)}
                            onChange={(seed) => update.styleConfig.seed(parseAnimatable(seed))}
                        />
                        <PaletteEditor
                            palette={value.styleConfig.palette}
                            update={update.styleConfig.palette}
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
                // actions={
                //     <button
                //         className="btn btn-outline btn-sm"
                //         onClick={() => {
                //             const id = genid()
                //             update.crops[id].add({
                //                 id,
                //                 shape:
                //             })
                //             // const nextKey = `crop-${crops.length + 1}`;
                //             // const next = {...value.crops};
                //             // next[nextKey] = {id: nextKey, shape: defaultCropShape()};
                //             // onChange({...value, crops: next});
                //         }}
                //     >
                //         Add Crop
                //     </button>
                // }
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
                                    <span>{key}</span>
                                    <div className="flex-1" />
                                    <button
                                        className="btn btn-ghost btn-sm text-error"
                                        onClick={() => {
                                            update.crops[key].remove();
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                                {/* <JsonEditor
                                    label="Segments"
                                    value={crop.shape}
                                    onChange={update.crops[key].shape}
                                /> */}
                                <ModsEditor
                                    palette={value.styleConfig.palette}
                                    mods={crop.mods ?? []}
                                    update={update.crops[key].mods}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </Section>
            <Section title="Timelines">
                <TimelineEditor
                    timeline={value.styleConfig.timeline}
                    onChange={update.styleConfig.timeline}
                />
            </Section>
            <Section title="History & Snapshots">
                <SnapshotAnnotations id={id} worker={worker} patterns={patterns} />
                <HistoryView />
            </Section>
        </div>
    );
};

const SnapshotAnnotations = ({
    id,
    worker,
    patterns,
}: {
    id: string;
    worker: WorkerSend;
    patterns: Patterns;
}) => {
    const ctx = useExportState();
    const history = ctx.useHistory();
    const [loading, setLoading] = useState(false);

    return (
        <div>
            {Object.entries(history.annotations).map(([key, ans]) => (
                <div key={key}>
                    {ans.map((an) =>
                        an.type === 'img' ? (
                            <img src={`/assets/exports/${id}-${an.id}.png`} />
                        ) : (
                            <video src={`/assets/exports/${id}-${an.id}.mp4`} />
                        ),
                    )}
                </div>
            ))}
            <button
                className="btn"
                onClick={() => {
                    const aid = genid();
                    worker({type: 'frame', patterns, state: ctx.latest(), t: 0}, (res) => {
                        if (res.type !== 'frame') return setLoading(false);
                        const blob = runPNGExport(100, ctx.latest().view.box, res.items, res.bg);
                        fetch(`/fs/exports/${id}-${aid}.png`, {
                            method: 'POST',
                            body: blob,
                            headers: {'Content-type': 'application/binary'},
                        }).then((res) => {
                            setLoading(false);
                            const an: ExportAnnotation = {type: 'img', id: aid};
                            ctx.updateAnnotations[history.tip]((v, up) =>
                                v ? up.push(an) : up([an]),
                            );
                        });
                    });
                }}
            >
                Take Snapshot
            </button>
        </div>
    );
};

const linearHistory = (v: History<State, unknown>) => {
    let res: JsonPatchOp<State>[] = [];
    let id = v.tip;
    while (id !== v.root) {
        res.unshift(...v.nodes[id].changes);
        id = v.nodes[id].pid;
    }
    return res;
};

const showPath = (p: Path) => {
    return p
        .map((p) =>
            p.type === 'single'
                ? '[]'
                : p.type === 'tag'
                  ? `[${p.value}]`
                  : typeof p.key === 'number'
                    ? `[${p.key}]`
                    : `.${p.key}`,
        )
        .join('');
};

const showOp = (op: JsonPatchOp<State>) => {
    switch (op.op) {
        case 'add':
            return `add ${showPath(op.path)}`;
        case 'replace':
            return `repl ${showPath(op.path)}`;
        case 'remove':
            return `rem ${showPath(op.path)}`;
        case 'move':
            return `mv ${showPath(op.from)} ${showPath(op.path)}`;
        case 'copy':
            return `copy`;
    }
};

const HistoryView = () => {
    const ctx = useExportState();
    const history = ctx.useHistory();
    const res = useMemo(() => (history ? linearHistory(history) : []), [history]);

    return (
        <div>
            {history.root} - {history.tip}
            {res.map((item, i) => (
                <div key={i}>
                    <pre>{showOp(item)}</pre>
                </div>
            ))}
        </div>
    );
};
