import {Canvas} from 'canvaskit-wasm';
import {boundsForCoords} from '../../../editor/Bounds';
import {tilingPoints, applyTilingTransformsG} from '../../../editor/tilingPoints';
import {getTilingTransforms} from '../../../editor/tilingTransforms';
import {coordKey} from '../../../rendering/coordKey';
import {closeEnough, epsilonToZero} from '../../../rendering/epsilonToZero';
import {applyMatrices} from '../../../rendering/getMirrorTransforms';
import {coordsEqual} from '../../../rendering/pathsAreIdentical';
import {Coord, Tiling, TilingShape} from '../../../types';
import {pk, Path as PKPath} from '../../pk';
import {Config} from '../animator';
import {calcMargin} from './calcMargin';
import {State, lineAt} from './animator.utils';
import {generateVideo} from './muxer';

export function fullPaths(
    full: {points: Coord[]; alpha: number}[],
    lineWidth: number,
    zoom: number,
    color: number[],
) {
    return full
        .map((line) => {
            if (closeEnough(line.alpha, 0)) return;
            const close = coordsEqual(line.points[0], line.points[line.points.length - 1], 3);
            const path = pk.Path.MakeFromCmds([
                pk.MOVE_VERB,
                line.points[0].x,
                line.points[0].y,
                ...line.points.slice(1).flatMap(({x, y}) => [pk.LINE_VERB, x, y]),
                ...(close ? [pk.CLOSE_VERB] : []),
            ])!;
            return {
                path,
                color,
                strokeWidth: (lineWidth / 200) * zoom * line.alpha,
                alpha: line.alpha * (color.length === 4 ? color[3] : 1),
            };
        })
        .filter(Boolean) as {path: PKPath; color: number[]; strokeWidth: number; alpha: number}[];
}

export const drawPaths = (
    ctx: Canvas,
    sharp: boolean,
    paths: {path: PKPath; color: number[]; strokeWidth: number; alpha: number}[],
) => {
    paths.forEach(({path, color, strokeWidth, alpha}) => {
        const paint = new pk.Paint();
        paint.setStyle(pk.PaintStyle.Stroke);
        paint.setStrokeWidth(strokeWidth);
        paint.setColor(color);
        paint.setAntiAlias(true);
        paint.setAlphaf(alpha);

        if (sharp) {
            paint.setStrokeJoin(pk.StrokeJoin.Miter);
            paint.setStrokeCap(pk.StrokeCap.Butt);
        } else {
            paint.setStrokeJoin(pk.StrokeJoin.Round);
            paint.setStrokeCap(pk.StrokeCap.Round);
        }

        ctx.drawPath(path, paint);
    });
};

export function drawFull(
    full: {points: Coord[]; alpha: number}[],
    lineWidth: number,
    zoom: number,
    ctx: Canvas,
    color: number[],
    sharp: boolean,
) {
    drawPaths(ctx, sharp, fullPaths(full, lineWidth, zoom, color));
}

const joinAdjacentLinesOld = (lines: Coord[][]) => {
    let joined = true;
    while (joined) {
        joined = false;
        for (let i = 0; i < lines.length; i++) {
            if (!lines[i].length) continue;
            for (let j = i + 1; j < lines.length; j++) {
                if (!lines[j].length) continue;
                if (coordsEqual(lines[i][0], lines[j][0])) {
                    lines[i] = lines[i].toReversed().concat(lines[j].slice(1));
                    lines[j] = [];
                    joined = true;
                } else if (coordsEqual(lines[i][lines[i].length - 1], lines[j][0])) {
                    lines[i] = lines[i].concat(lines[j].slice(1));
                    lines[j] = [];
                    joined = true;
                } else if (
                    coordsEqual(lines[i][lines[i].length - 1], lines[j][lines[j].length - 1])
                ) {
                    lines[i] = lines[i].concat(lines[j].toReversed().slice(1));
                    lines[j] = [];
                    joined = true;
                } else if (coordsEqual(lines[i][0], lines[j][lines[j].length - 1])) {
                    lines[i] = lines[j].concat(lines[i].slice(1));
                    lines[j] = [];
                    joined = true;
                }
            }
        }
    }
    return lines.filter((l) => l.length);
};

const joinAdjacentAlphaLines = (transformed: {points: Coord[]; alpha: number}[]) => {
    const byAlpha: Record<string, Coord[][]> = {};
    transformed.forEach((line) => {
        if (!byAlpha[line.alpha]) {
            byAlpha[line.alpha] = [];
        }
        byAlpha[line.alpha].push(line.points);
    });

    return Object.entries(byAlpha).flatMap(([alpha, lines]) => {
        return joinAdjacentLinesOld(lines).map((points) => ({
            alpha: +alpha,
            points,
        }));
    });
};

const calcFull = (
    state: State,
    preview: number,
    repl: number,
    shape: TilingShape,
    // patternMap: Record<string, Tiling>,
    joinLines: boolean,
) => {
    if (!state.layers.length) return {full: [], bounds: null};
    const ats = state.lines.map((line) => lineAt(line.keyframes, preview, line.fade));

    const tpts = tilingPoints(shape);
    const ttt = getTilingTransforms(shape, tpts, repl);
    const transformed = applyTilingTransformsG(
        ats.filter(Boolean) as {points: Coord[]; alpha: number}[],
        ttt,
        (line, tx) => ({
            points: line.points.map((coord) => applyMatrices(coord, tx)),
            alpha: line.alpha,
        }),
    );
    const bounds = boundsForCoords(...applyTilingTransformsG(tpts, ttt, applyMatrices));
    return {full: joinLines ? joinAdjacentAlphaLines(transformed) : transformed, bounds};
};

export const renderFrame = (
    state: State,
    shape: TilingShape,
    preview: number,
    ctx: Canvas,
    config: Config,
) => {
    if (config.multi) {
        renderMulti(config, preview, state, ctx, shape);
    } else {
        renderSingle(preview, config, state, ctx, shape);
    }
};

export const recordVideo = async (
    state: State,
    canvas: HTMLCanvasElement,
    shape: TilingShape,
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

        renderFrame(state, shape, preview, ctx, config);

        surface.flush();
    });
    return blob ? URL.createObjectURL(blob) : null;
};

export const combinedPath = (preview: number, config: Config, state: State, shape: TilingShape) => {
    const max = state.layers.length - 1;
    if (preview > max) {
        preview = max + (max - preview);
    }
    if (preview < 0) {
        preview = -preview;
    }
    const peggedZoom = (config.peg ? calcMargin(preview, state.lines[0]) : 1) * config.zoom;

    const {full, bounds} = calcFull(state, preview, config.repl, shape, config.sharp);

    const paths = fullPaths(full, config.lineWidth, peggedZoom, [205 / 255, 127 / 255, 1 / 255]);

    if (config.bounds && bounds) {
        paths.push({
            path: pk.Path.MakeFromCmds([
                pk.MOVE_VERB,
                bounds.x0,
                bounds.y0,
                pk.LINE_VERB,
                bounds.x0,
                bounds.y1,
                pk.LINE_VERB,
                bounds.x1,
                bounds.y1,
                pk.LINE_VERB,
                bounds.x1,
                bounds.y0,
                pk.CLOSE_VERB,
            ])!,
            alpha: 1,
            color: [205 / 255, 127 / 255, 1 / 255],
            strokeWidth: (config.lineWidth / 200) * peggedZoom,
        });
    }

    const onePath = new pk.Path();
    paths.forEach(({path, alpha, color, strokeWidth}) => {
        if (alpha !== 1) return; // ignore
        path.stroke({
            width: strokeWidth,
            cap: config.sharp ? pk.StrokeCap.Butt : pk.StrokeCap.Round,
            join: config.sharp ? pk.StrokeJoin.Miter : pk.StrokeJoin.Round,
        });
        onePath.op(path, pk.PathOp.Union);
        path.delete();
    });
    onePath.simplify();

    return onePath;
};

function renderSingle(
    preview: number,
    config: Config,
    state: State,
    ctx: Canvas,
    shape: TilingShape,
) {
    const max = state.layers.length - 1;
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

    const {full, bounds} = calcFull(state, preview, config.repl, shape, config.sharp);
    drawFull(
        full,
        config.lineWidth,
        peggedZoom,
        ctx,
        [205 / 255, 127 / 255, 1 / 255],
        config.sharp,
    );

    if (config.bounds && bounds) {
        const paint = new pk.Paint();
        paint.setColor([205 / 255, 127 / 255, 1 / 255]);
        paint.setStyle(pk.PaintStyle.Stroke);
        paint.setStrokeWidth((config.lineWidth / 200) * peggedZoom);
        ctx.drawPath(
            pk.Path.MakeFromCmds([
                pk.MOVE_VERB,
                bounds.x0,
                bounds.y0,
                pk.LINE_VERB,
                bounds.x0,
                bounds.y1,
                pk.LINE_VERB,
                bounds.x1,
                bounds.y1,
                pk.LINE_VERB,
                bounds.x1,
                bounds.y0,
                pk.CLOSE_VERB,
            ])!,
            paint,
        );
    }

    ctx.restore();
}

function renderMulti(
    config: Config,
    preview: number,
    state: State,
    ctx: Canvas,
    // patternMap: Record<string, Tiling>,
    shape: TilingShape,
) {
    const max = state.layers.length - 1;
    const {count, dist} =
        typeof config.multi === 'boolean' ? {count: 10, dist: 0.05} : config.multi;
    const amt = dist * count;
    for (let i = -amt; i <= 0; i += dist) {
        let p = preview + i;
        if (p > max) p = max + (max - p);
        if (p < 0) p = -p;
        p = epsilonToZero(p);

        const peggedZoom = (config.peg ? calcMargin(p, state.lines[0]) : 1) * config.zoom;

        ctx.save();
        ctx.scale((config.size * 2) / peggedZoom, (config.size * 2) / peggedZoom);
        ctx.translate(peggedZoom / 2, peggedZoom / 2);
        const {full, bounds} = calcFull(state, p, config.repl, shape, config.sharp);
        const alph = (i + amt) / amt; // * 0.8 + 0.2;
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
}
