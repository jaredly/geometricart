import {useContext, useMemo, useState} from 'react';
import {useExportState} from '../ExportHistory';
import {WorkerSend} from '../render/render-client';
import {runPNGExport} from '../render/runPNGExport';
import {saveAnnotation, deleteAnnotation, SnapshotUrl} from './saveAnnotation';
import {AnnotationView, anSnapshot} from './AnnotationView';
import {ExportConfig2d} from '../types/state-type';
import {useValue} from '../../../../json-diff/react';
import {GlobalDependenciesCtx} from '../window/GlobalDependencies';

export const SnapshotAnnotations = () => {
    const ctx = useExportState();
    const history = ctx.useHistory();
    const [loading, setLoading] = useState(false);
    const exports = useValue(ctx.$.exports);
    const view = Object.keys(exports)[0];
    const {worker, snapshotUrl} = useContext(GlobalDependenciesCtx);
    const config = useMemo(() => {
        // okkk
    }, [view]);

    const [selectedExport, setSelectedExport] = useState(Object.keys(exports)[0] ?? null);

    return (
        <div>
            <button
                className="btn"
                onClick={() => {
                    if (!exports[selectedExport]) return;
                    setLoading(true);
                    // umm is it a videoable thing/
                    worker(
                        {
                            type: 'snapshot',
                            state: ctx.latest(),
                            config: exports[selectedExport].config,
                        },
                        (res) => {
                            if (res.type !== 'snapshot') return setLoading(false);
                            saveAnnotation(
                                snapshotUrl,
                                res.blob,
                                history.tip,
                                ctx.updateAnnotations,
                                res.ext === 'png',
                            ).then(
                                () => {
                                    setLoading(false);
                                },
                                (err) => {
                                    console.error('Failed to save');
                                    console.error(err);
                                },
                            );
                        },
                    );
                    // worker({type: 'frame', state: ctx.latest(), t: 0}, (res) => {
                    //     if (res.type !== 'frame') return setLoading(false);
                    //     const blob = runPNGExport(100, ctx.latest().view.box, res.items, res.bg);
                    //     saveAnnotation(snapshotUrl, blob, history.tip, ctx.updateAnnotations).then(
                    //         () => {
                    //             setLoading(false);
                    //         },
                    //         (err) => {
                    //             console.error('Failed to save');
                    //             console.error(err);
                    //         },
                    //     );
                    // });
                }}
            >
                {loading ? 'Loading...' : 'Take Snapshot'}
            </button>
            <select
                value={selectedExport ?? ''}
                onChange={(evt) => setSelectedExport(evt.target.value)}
            >
                <option value="">Select an export config</option>
                {Object.values(exports).map((ex) => (
                    <option key={ex.id} value={ex.id}>
                        {ex.name ?? ex.id}
                    </option>
                ))}
            </select>
            <div className="flex flex-row flex-wrap p-4 gap-4">
                {Object.entries(history.annotations).map(([key, ans]) => (
                    <div key={key} className="contents">
                        {Object.values(ans).map((an) => (
                            <div key={an.id} className="relative">
                                <AnnotationView
                                    src={anSnapshot(an, snapshotUrl)}
                                    image={an.type === 'img'}
                                    size={200}
                                />
                                <button
                                    className="btn btn-sm btn-square absolute top-0 right-0"
                                    onClick={() => {
                                        if (
                                            confirm(
                                                `Are you sure you want to delete this annotation?`,
                                            )
                                        ) {
                                            deleteAnnotation(
                                                snapshotUrl,
                                                key,
                                                an.id,
                                                ctx.updateAnnotations,
                                            );
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
