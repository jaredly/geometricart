import {useState} from 'react';
import {useExportState} from '../ExportHistory';
import {WorkerSend} from '../render/render-client';
import {runPNGExport} from '../render/runPNGExport';
import {saveAnnotation, deleteAnnotation, lsprefix} from './saveAnnotation';
import {AnnotationView, anSnapshot} from './AnnotationView';

export const SnapshotAnnotations = ({
    worker,
    snapshotUrl,
}: {
    worker: WorkerSend;
    snapshotUrl: (id: string, ext: string) => string;
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
                    worker({type: 'frame', state: ctx.latest(), t: 0}, (res) => {
                        if (res.type !== 'frame') return setLoading(false);
                        const blob = runPNGExport(100, ctx.latest().view.box, res.items, res.bg);
                        saveAnnotation(snapshotUrl, blob, history.tip, ctx.updateAnnotations).then(
                            () => {
                                setLoading(false);
                            },
                            (err) => {
                                console.error('Failed to save');
                                console.error(err);
                            },
                        );
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
                                <AnnotationView
                                    src={anSnapshot(an, snapshotUrl)}
                                    image={an.type === 'img'}
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
