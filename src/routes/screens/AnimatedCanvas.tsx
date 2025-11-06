import {Canvas} from 'canvaskit-wasm';
import {useRef, useMemo, useEffect} from 'react';
import {applyTilingTransformsG} from '../../editor/tilingPoints';
import {getTilingTransforms} from '../../editor/tilingTransforms';
import {epsilonToZero, closeEnough} from '../../rendering/epsilonToZero';
import {dist, applyMatrices} from '../../rendering/getMirrorTransforms';
import {Tiling, Coord} from '../../types';
import {drawWoven} from '../canvasDraw';
import {getPatternData} from '../getPatternData';
import {pk} from '../pk';
import {State, lineAt} from './animator.screen/animator.utils';
import {generateVideo} from './animator.screen/muxer';

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
    preview,
    size,
    zoom,
    state,
    lineWidth,
    showNice,
    repl,
    cache,
    peg,
    multi,
}: {
    multi: boolean;
    peg: boolean;
    repl: number;
    showNice: boolean;
    lineWidth: number;
    state: State;
    size: number;
    zoom: number;
    patternMap: Record<string, Tiling>;
    preview: number;
    cache: Record<string, Uint8Array>;
}) => {
    // const full = useMemo(
    //     () => calcFull(state, preview, repl, patternMap),
    //     [state, preview, patternMap, repl],
    // );
    const ref = useRef<HTMLCanvasElement>(null);

    const patternDatas = useMemo(() => {
        return state.layers.map((l) => getPatternData(patternMap[l.pattern], false, repl));
    }, [state.layers, patternMap, repl]);

    const renderFrame = (preview: number, ctx: Canvas) => {
        const max = state.layers.length - 1;
        if (multi) {
            for (let i = -0.5; i <= 0; i += 0.05) {
                let p = preview + i;
                if (p > max) p = max + (max - p);
                if (p < 0) p = -p;
                p = epsilonToZero(p);

                const peggedZoom = (peg ? calcMargin(p, state.lines[0]) : 1) * zoom;

                ctx.save();
                ctx.scale((size * 2) / peggedZoom, (size * 2) / peggedZoom);
                ctx.translate(peggedZoom / 2, peggedZoom / 2);
                const full = calcFull(state, p, repl, patternMap);
                const alph = ((i + 0.5) / 0.5) * 0.8 + 0.2;
                drawFull(full, lineWidth, peggedZoom, ctx, [205 / 255, 127 / 255, 1 / 255, alph]);
                ctx.restore();
            }
        } else {
            const peggedZoom = (peg ? calcMargin(preview, state.lines[0]) : 1) * zoom;
            ctx.save();
            ctx.scale((size * 2) / peggedZoom, (size * 2) / peggedZoom);
            ctx.translate(peggedZoom / 2, peggedZoom / 2);

            const full = calcFull(state, preview, repl, patternMap);
            drawFull(full, lineWidth, peggedZoom, ctx, [205 / 255, 127 / 255, 1 / 255]);

            ctx.restore();
        }
    };

    const recordVideo = () => {
        const step = 0.05;
        const totalFrames = (state.layers.length - 1) / step + 1;
        generateVideo(ref.current!, 15, totalFrames, (_, currentFrame) => {
            const surface = pk.MakeWebGLCanvasSurface(ref.current!)!;
            const ctx = surface.getCanvas();
            ctx.clear(pk.BLACK);

            const percent = currentFrame / totalFrames;
            const max = state.layers.length - 1;
            const preview = percent * max * 2;

            renderFrame(preview, ctx);

            surface.flush();
        }).then((blob) => {
            if (!blob) {
                console.warn('failed I guess');
                return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.download = 'video.mp4';
            a.href = url;
            a.click();
        });
    };

    useEffect(() => {
        if (!ref.current) return;
        const surface = pk.MakeWebGLCanvasSurface(ref.current)!;
        const ctx = surface.getCanvas();
        ctx.clear(pk.BLACK);

        if (Number.isInteger(preview) && showNice) {
            ctx.save();
            ctx.scale((size * 2) / zoom, (size * 2) / zoom);
            ctx.translate(zoom / 2, zoom / 2);
            drawWoven(ctx, patternDatas[preview], (lineWidth / 200) * zoom);
            ctx.restore();
        } else {
            renderFrame(preview, ctx);
        }

        surface.flush();
    }, [
        multi,
        peg,
        preview,
        size,
        zoom,
        lineWidth,
        patternDatas,
        showNice,
        patternMap,
        repl,
        state,
    ]);

    return (
        <div>
            <canvas
                ref={ref}
                width={size * 2}
                height={size * 2}
                style={{width: size, height: size}}
            />
            <button className="btn" onClick={() => recordVideo()}>
                Record Video
            </button>
        </div>
    );
};
function drawFull(
    full: {points: Coord[]; alpha: number}[],
    lineWidth: number,
    zoom: number,
    ctx: Canvas,
    color: number[],
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
        paint.setStrokeJoin(pk.StrokeJoin.Round);
        paint.setStrokeCap(pk.StrokeCap.Round);
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
