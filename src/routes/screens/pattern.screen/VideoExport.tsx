import {useState} from 'react';
import {Patterns, Ctx} from './evaluate';
import {State, Box} from './export-types';
import {recordVideo} from './recordVideo';
import {WorkerSend} from './render-client';
import {SpinnerEarring} from '../../../icons/Icon';

export function VideoExport({
    state,
    box,
    size,
    patterns,
    duration,
    statusRef,
    cropCache,
    worker,
}: {
    worker: WorkerSend;
    state: State;
    box: Box;
    size: number;
    patterns: Patterns;
    duration: number;
    statusRef: React.RefObject<HTMLDivElement | null>;
    cropCache: Ctx['cropCache'];
}) {
    const [video, setVideo] = useState<null | {url: string; time: number}>(null);
    const [exSize, setExSize] = useState(size);
    const [status, setStatus] = useState<null | number>(null);

    return (
        <>
            <div className="flex gap-2 items-center">
                <button
                    className={'btn'}
                    disabled={status !== null}
                    onClick={() => {
                        setStatus(0);
                        const start = Date.now();
                        worker({type: 'video', state, patterns, size, box, duration}, (res) => {
                            if (res.type === 'status') {
                                setStatus(res.progress);
                            } else if (res.type === 'video') {
                                setStatus(null);
                                if (res.url) {
                                    setVideo({url: res.url, time: Date.now() - start});
                                }
                            }
                        });
                    }}
                >
                    Record Video {status != null ? `${(status * 100).toFixed(0)}%` : ''}
                    {status != null ? <SpinnerEarring className="animate-spin" /> : null}
                </button>
                <div ref={statusRef} className="w-20 text-right" />
                <label>
                    Export size
                    <input
                        value={exSize}
                        onChange={(evt) => setExSize(+evt.target.value)}
                        type="number"
                        className="input w-30"
                    />
                </label>
                {/* {typeof video === 'number' ? (
            <input type="range" value={video} onChange={() => {}} min={0} max={1} />
        ) : null} */}
            </div>
            {video ? (
                <div className="relative">
                    <video src={video.url} controls loop style={{width: size, height: size}} />
                    <button className={'btn absolute top-0 right-0'} onClick={() => setVideo(null)}>
                        &times;
                    </button>
                    <div>Generated in {video.time / 1000}s</div>
                </div>
            ) : null}
        </>
    );
}
