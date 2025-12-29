import {useEffect, useMemo, useRef, useState} from 'react';
import {JsonPatchOp, Path} from '../../../../json-diff/helper2';
import {History} from '../../../../json-diff/history';
import {Updater} from '../../../../json-diff/Updater';
import {angleTo, dist, push, translationMatrix} from '../../../../rendering/getMirrorTransforms';
import {transformBarePath} from '../../../../rendering/points';
import {BarePath, Coord} from '../../../../types';
import {useEditState, usePendingState} from '../editState';
import {Patterns} from '../evaluate';
import {State} from '../export-types';
import {useExportState} from '../ExportHistory';
import {genid} from '../genid';
import {WorkerSend} from '../render-client';
import {runPNGExport} from '../runPNGExport';
import {AnimColor} from './AnimColor';
import {BoxField} from './BoxField';
import {createLayerTemplate, parseAnimatable} from './createLayerTemplate';
import {ModsEditor} from './FillEditor';
import {LayerEditor} from './LayerEditor';
import {NumberField} from './NumberField';
import {PaletteEditor} from './PaletteEditor';
import {deleteAnnotation, saveAnnotation} from './saveAnnotation';
import {Section} from './Section';
import {ShapeEditor} from './ShapeEditor';
import {TextField} from './TextField';
import {TimelineEditor} from './TimelineEditor';
import {barePathFromCoords} from '../resolveMods';
import {HistoryView} from './HistoryView';

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
                    <>
                        <button
                            className="btn btn-outline btn-sm"
                            popoverTarget="popover-add-shapes"
                            // @ts-ignore
                            style={{anchorName: '--anchor-add-shapes'}}
                            onClick={(evt) => evt.stopPropagation()}
                        >
                            Add Shape
                        </button>
                        <ul
                            popover={'auto'}
                            className="dropdown dropdown-end menu shadow-sm border border-base-300 rounded-box bg-base-100"
                            id={`popover-add-shapes`}
                            onClick={(evt) => evt.stopPropagation()}
                            // @ts-ignore
                            style={{positionAnchor: `--anchor-add-shapes`}}
                        >
                            <li>
                                <button
                                    onClick={(evt) => {
                                        pendingState.update.pending.replace({
                                            type: 'shape',
                                            onDone(points, open) {
                                                const nextId = genid();
                                                update.shapes[nextId].add({
                                                    origin: points[0],
                                                    segments: points
                                                        .slice(1)
                                                        .map((to) => ({type: 'Line', to})),
                                                    open,
                                                });
                                            },
                                            points: [],
                                        });
                                    }}
                                >
                                    Polygon
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => {
                                        const asCircle = (pts: Coord[]): BarePath => {
                                            const [c, r] = pts;
                                            // const d = dist(c, r);
                                            // const t = angleTo(c, r);
                                            // const res = [r];
                                            // const num = 20;
                                            // for (let i = 1; i < num; i++) {
                                            //     res.push(push(c, t + ((Math.PI * 2) / num) * i, d));
                                            // }
                                            const opp = {x: c.x * 2 - r.x, y: c.y * 2 - r.y};
                                            return {
                                                origin: r,
                                                segments: [
                                                    {
                                                        type: 'Arc',
                                                        center: c,
                                                        clockwise: true,
                                                        to: opp,
                                                    },
                                                    {
                                                        type: 'Arc',
                                                        center: c,
                                                        clockwise: true,
                                                        to: r,
                                                    },
                                                ],
                                            };
                                        };
                                        pendingState.update.pending.replace({
                                            type: 'shape',
                                            onDone(points) {
                                                const nextId = genid();
                                                update.shapes[nextId].add(asCircle(points));
                                            },
                                            points: [],
                                            asShape: asCircle,
                                        });
                                    }}
                                >
                                    Circle [center and radius]
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => {
                                        const asRect = (pts: Coord[]): BarePath => {
                                            const [c, a, b] = pts;
                                            let dx = Math.abs(a.x - c.x);
                                            let dy = Math.abs(a.y - c.y);
                                            if (b) {
                                                dx = Math.max(dx, Math.abs(b.x - c.x));
                                                dy = Math.max(dy, Math.abs(b.y - c.y));
                                            }
                                            return barePathFromCoords([
                                                {x: c.x - dx, y: c.y - dy},
                                                {x: c.x + dx, y: c.y - dy},
                                                {x: c.x + dx, y: c.y + dy},
                                                {x: c.x - dx, y: c.y + dy},
                                                {x: c.x - dx, y: c.y - dy},
                                            ]);
                                        };
                                        pendingState.update.pending.replace({
                                            type: 'shape',
                                            onDone(points) {
                                                update.shapes[genid()].add(asRect(points));
                                            },
                                            points: [],
                                            asShape: asRect,
                                        });
                                    }}
                                >
                                    Rect [center and 2 points]
                                </button>
                            </li>
                            <li>
                                <button>Rect [2 points]</button>
                            </li>
                        </ul>
                    </>
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
                <HistoryView id={id} />
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
            <button
                className="btn"
                onClick={() => {
                    setLoading(true);
                    worker({type: 'frame', patterns, state: ctx.latest(), t: 0}, (res) => {
                        if (res.type !== 'frame') return setLoading(false);
                        const blob = runPNGExport(100, ctx.latest().view.box, res.items, res.bg);
                        saveAnnotation(id, blob, history.tip, ctx.updateAnnotations).then(() => {
                            setLoading(false);
                        });
                    });
                }}
            >
                {loading ? 'Loading...' : 'Take Snapshot'}
            </button>
            <div className="flex flex-row flex-wrap p-4 gap-4">
                {Object.entries(history.annotations).map(([key, ans]) => (
                    <div key={key} className="contents">
                        {ans.map((an, i) => (
                            <div key={i} className="relative">
                                {an.type === 'img' ? (
                                    <img
                                        key={i}
                                        style={{width: 100, height: 100}}
                                        src={`/assets/exports/${id}-${an.id}.png`}
                                    />
                                ) : (
                                    <video key={i} src={`/assets/exports/${id}-${an.id}.mp4`} />
                                )}
                                <button
                                    className="btn btn-sm btn-square absolute top-0 right-0"
                                    onClick={() => {
                                        if (
                                            confirm(
                                                `Are you sure you want to delete this annotation?`,
                                            )
                                        ) {
                                            deleteAnnotation(id, key, an.id, ctx.updateAnnotations);
                                        }
                                    }}
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const linearHistory = (v: History<State, unknown>) => {
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
