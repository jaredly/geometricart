import {useState} from 'react';
import {useExportState} from '../ExportHistory';
import {WorkerSend} from '../render/render-client';
import {runPNGExport} from '../render/runPNGExport';
import {saveAnnotation, deleteAnnotation, lsprefix} from './saveAnnotation';
import {AnnotationView} from './AnnotationView';

const maybeLocalStorage = (url: string) =>
    url.startsWith(lsprefix) ? localStorage[url.slice(lsprefix.length)] : url;

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
                                <AnnotationView an={an} snapshotUrl={snapshotUrl} />
                                {/*{an.type === 'img' ? (
                                    <LoadSrc key={i} src={snapshotUrl(an.id, 'png')}>
                                        {(url) =>
                                            url ? (
                                                <img
                                                    key={i}
                                                    style={{width: 100, height: 100}}
                                                    src={url}
                                                />
                                            ) : (
                                                <div
                                                    style={{width: 100, height: 100}}
                                                    className="flex items-center justify-center"
                                                >
                                                    <SpinnerEarring className="animate-spin" />
                                                </div>
                                            )
                                        }
                                    </LoadSrc>
                                ) : (
                                    <video
                                        key={i}
                                        src={maybeLocalStorage(snapshotUrl(an.id, 'mp4'))}
                                    />
                                )}*/}
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
