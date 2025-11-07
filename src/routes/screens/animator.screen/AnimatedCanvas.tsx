import {Canvas} from 'canvaskit-wasm';
import {useRef, useMemo, useEffect, useState} from 'react';
import {applyTilingTransformsG} from '../../../editor/tilingPoints';
import {getTilingTransforms} from '../../../editor/tilingTransforms';
import {epsilonToZero, closeEnough} from '../../../rendering/epsilonToZero';
import {dist, applyMatrices} from '../../../rendering/getMirrorTransforms';
import {Tiling, Coord} from '../../../types';
import {drawWoven} from '../../canvasDraw';
import {getPatternData} from '../../getPatternData';
import {pk} from '../../pk';
import {State, lineAt} from './animator.utils';
import {generateVideo} from './muxer';
import {Config} from '../animator';

export const calcMargin = (preview: number, line: State['lines'][0]) => {
    const lat = lineAt(line.keyframes, preview, line.fade);
    const log = lineAt(line.keyframes, 0, line.fade);
    if (!lat || !log) return 1;
    const d1 = dist(lat.points[0], lat.points[1]);
    const d2 = dist(log.points[0], log.points[1]);
    return d1 / d2;
};

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
        return state.layers.map((l) => getPatternData(patternMap[l.pattern], false, config.repl));
    }, [state.layers, patternMap, config.repl]);

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
    );
};

function drawFull(
    full: {points: Coord[]; alpha: number}[],
    lineWidth: number,
    zoom: number,
    ctx: Canvas,
    color: number[],
    sharp: boolean,
) {
    full.forEach((line) => {
        if (closeEnough(line.alpha, 0)) return;
        const path = pk.Path.MakeFromCmds([
            pk.MOVE_VERB,
            line.points[0].x,
            line.points[0].y,
            ...line.points.slice(1).flatMap(({x, y}) => [pk.LINE_VERB, x, y]),
        ])!;
        const paint = new pk.Paint();
        paint.setStyle(pk.PaintStyle.Stroke);
        if (sharp) {
            paint.setStrokeJoin(pk.StrokeJoin.Miter);
            paint.setStrokeCap(pk.StrokeCap.Butt);
        } else {
            paint.setStrokeJoin(pk.StrokeJoin.Round);
            paint.setStrokeCap(pk.StrokeCap.Round);
        }
        paint.setStrokeWidth((lineWidth / 200) * zoom * line.alpha);
        paint.setColor(color);
        paint.setAntiAlias(true);
        paint.setAlphaf(line.alpha * (color.length === 4 ? color[3] : 1));
        ctx.drawPath(path, paint);
    });
}

const calcFull = (
    state: State,
    preview: number,
    repl: number,
    patternMap: Record<string, Tiling>,
) => {
    if (!state.layers.length) return [];
    const ats = state.lines.map((line) => lineAt(line.keyframes, preview, line.fade));
    const pt = patternMap[state.layers[0].pattern];
    const ttt = getTilingTransforms(pt.shape, undefined, repl);
    return applyTilingTransformsG(
        ats.filter(Boolean) as {points: Coord[]; alpha: number}[],
        ttt,
        (line, tx) => ({
            points: line.points.map((coord) => applyMatrices(coord, tx)),
            alpha: line.alpha,
        }),
    );
};

const renderFrame = (
    state: State,
    patternMap: Record<string, Tiling>,
    preview: number,
    ctx: Canvas,
    config: Config,
) => {
    const max = state.layers.length - 1;
    if (config.multi) {
        for (let i = -0.5; i <= 0; i += 0.05) {
            let p = preview + i;
            if (p > max) p = max + (max - p);
            if (p < 0) p = -p;
            p = epsilonToZero(p);

            const peggedZoom = (config.peg ? calcMargin(p, state.lines[0]) : 1) * config.zoom;

            ctx.save();
            ctx.scale((config.size * 2) / peggedZoom, (config.size * 2) / peggedZoom);
            ctx.translate(peggedZoom / 2, peggedZoom / 2);
            const full = calcFull(state, p, config.repl, patternMap);
            const alph = ((i + 0.5) / 0.5) * 0.8 + 0.2;
            drawFull(
                full,
                config.lineWidth,
                peggedZoom,
                ctx,
                [205 / 255, 127 / 255, 1 / 255, alph],
                config.sharp,
            );
            ctx.restore();
        }
    } else {
        if (preview > max) {
            preview = max + (max - preview);
        }
        if (preview < 0) {
            preview = -preview;
        }
        const peggedZoom = (config.peg ? calcMargin(preview, state.lines[0]) : 1) * config.zoom;
        ctx.save();
        ctx.scale((config.size * 2) / peggedZoom, (config.size * 2) / peggedZoom);
        ctx.translate(peggedZoom / 2, peggedZoom / 2);

        const full = calcFull(state, preview, config.repl, patternMap);
        drawFull(
            full,
            config.lineWidth,
            peggedZoom,
            ctx,
            [205 / 255, 127 / 255, 1 / 255],
            config.sharp,
        );

        ctx.restore();
    }
};

const recordVideo = async (
    state: State,
    canvas: HTMLCanvasElement,
    patternMap: Record<string, Tiling>,
    config: Config,
) => {
    const step = 0.05;
    const totalFrames = (state.layers.length - 1) / step + 1;
    const blob = await generateVideo(canvas, 15, totalFrames, (_, currentFrame) => {
        const surface = pk.MakeWebGLCanvasSurface(canvas)!;
        const ctx = surface.getCanvas();
        ctx.clear(pk.BLACK);

        const percent = currentFrame / totalFrames;
        const max = state.layers.length - 1;
        const preview = percent * max * 2;

        renderFrame(state, patternMap, preview, ctx, config);

        surface.flush();
    });
    return blob ? URL.createObjectURL(blob) : null;
};
