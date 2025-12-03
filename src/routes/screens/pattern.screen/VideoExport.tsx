import {useState} from 'react';
import {Patterns, Ctx} from './evaluate';
import {State, Box} from './export-types';
import {recordVideo} from './recordVideo';

export function VideoExport({
    state,
    box,
    size,
    patterns,
    duration,
    statusRef,
    cropCache,
}: {
    state: State;
    box: Box;
    size: number;
    patterns: Patterns;
    duration: number;
    statusRef: React.RefObject<HTMLDivElement | null>;
    cropCache: Ctx['cropCache'];
}) {
    const [video, setVideo] = useState(null as null | number | string);
    return (
        <>
            <div className="flex gap-2 items-center">
                <button
                    className={'btn'}
                    onClick={() =>
                        recordVideo(
                            state,
                            size,
                            box,
                            patterns,
                            duration,
                            statusRef,
                            cropCache,
                        ).then((url) => setVideo(url))
                    }
                >
                    Record Video
                </button>
                <div ref={statusRef} className="w-20 text-right" />
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
