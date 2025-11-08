import React from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {Tiling} from '../../../types';
import {drawWoven} from '../../canvasDraw';
import {getPatternData} from '../../getPatternData';
import {pk} from '../../pk';
import {Config} from '../animator';
import {State} from './animator.utils';
import {recordVideo, renderFrame} from './renderFrame';

export const AnimatedCanvas = ({
    patternMap,
    state,
    config,
}: {
    config: Config;
    state: State;
    patternMap: Record<string, Tiling>;
}) => {
    const ref = useRef<HTMLCanvasElement>(null);

    const [videos, setVideos] = useState([] as {url: string; date: number}[]);
    const [recording, setRecording] = useState(false);

    const patternDatas = useMemo(() => {
        return config.showNice
            ? state.layers.map((l) => getPatternData(patternMap[l.pattern], false, config.repl))
            : [];
    }, [state.layers, patternMap, config.repl, config.showNice]);

    useEffect(() => {
        if (!ref.current) return;
        const surface = pk.MakeWebGLCanvasSurface(ref.current)!;
        const ctx = surface.getCanvas();
        ctx.clear(pk.BLACK);

        if (Number.isInteger(config.preview) && config.showNice) {
            ctx.save();
            ctx.scale((config.size * 2) / config.zoom, (config.size * 2) / config.zoom);
            ctx.translate(config.zoom / 2, config.zoom / 2);
            drawWoven(ctx, patternDatas[config.preview], (config.lineWidth / 200) * config.zoom);
            ctx.restore();
        } else {
            renderFrame(state, patternMap, config.preview, ctx, config);
        }

        surface.flush();
    }, [patternDatas, patternMap, config, state]);

    return (
        <div>
            <canvas
                ref={ref}
                width={config.size * 2}
                height={config.size * 2}
                style={{width: config.size, height: config.size}}
            />
            <div className="bg-base-100 p-4 rounded-md my-4">
                <div>
                    <button
                        className="btn"
                        disabled={recording}
                        onClick={() => {
                            // setRecording(true);
                            recordVideo(state, ref.current!, patternMap, config).then(
                                (url) => {
                                    if (url) {
                                        setVideos([...videos, {url, date: Date.now()}]);
                                    }
                                    // setRecording(false);
                                },
                                () => {
                                    // setRecording(false);
                                },
                            );
                        }}
                    >
                        Record Video
                    </button>
                </div>

                {videos.map(({url, date}, i) => (
                    <div key={url} className="relative">
                        <video src={url} loop controls />
                        <a key={i} href={url} download={`video_${date}.mp4`}>
                            Download
                        </a>
                        <button
                            className="btn btn-square absolute top-4 right-4"
                            onClick={() => {
                                setVideos(videos.filter((_, j) => j !== i));
                            }}
                        >
                            &times;
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
