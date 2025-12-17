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
    const [video, setVideo] = useState(null as null | number | string);
    const [exSize, setExSize] = useState(size);
    const [status, setStatus] = useState<null | number>(null);

    return (
        <>
            <div className="flex gap-2 items-center">
                <button
                    className={'btn'}
                    disabled={status !== null}
                    onClick={() => {
                        // recordVideo(
                        //     state,
                        //     exSize,
                        //     box,
                        //     patterns,
                        //     duration,
                        //     (percent) => statusRef.current!.textContent = (percent * 100).toFixed(0) + '%,
                        //     cropCache,
                        // ).then((url) => setVideo(url));

                        setStatus(0);
                        worker({type: 'video', state, patterns, size, box, duration}, (res) => {
                            if (res.type === 'status') {
                                setStatus(res.progress);
                            } else if (res.type === 'video') {
                                setStatus(null);
                                if (res.url) {
                                    setVideo(res.url);
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
                        className="input"
                    />
                </label>
                {/* {typeof video === 'number' ? (
            <input type="range" value={video} onChange={() => {}} min={0} max={1} />
        ) : null} */}
            </div>
            {typeof video === 'string' ? (
                <div className="relative">
                    <video src={video} controls loop style={{width: size, height: size}} />
                    <button className={'btn absolute top-0 right-0'} onClick={() => setVideo(null)}>
                        &times;
                    </button>
                </div>
            ) : null}
        </>
    );
}
