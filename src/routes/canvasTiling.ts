import {Canvas} from 'canvaskit-wasm';
import {applyTilingTransformsG} from '../editor/tilingPoints';
import {applyMatrices} from '../rendering/getMirrorTransforms';
import {getPatternData} from './getPatternData';
import {pk} from './pk';
import {readFileSync} from 'fs';
import {join} from 'path';
import {drawLines, drawShapes, drawWoven} from './canvasDraw';

type ColorScheme = (i: number) => string;

let fontCache = null as null | NonSharedBuffer;

const drawSegmentsEndpoints = (ctx: Canvas, data: ReturnType<typeof getPatternData>) => {
    const paint = new pk.Paint();
    paint.setColor(pk.BLACK);
    paint.setStyle(pk.PaintStyle.Fill);
    paint.setAntiAlias(true);

    data.allSegments.flat().forEach((pt) => {
        ctx.drawCircle(pt.x, pt.y, data.minSegLength / 4, paint);
    });

    const front = new pk.Paint();
    front.setStyle(pk.PaintStyle.Fill);
    front.setColor([1, 1, 1]);
    data.eigenPoints.forEach((pt) => {
        ctx.drawCircle(pt.x, pt.y, data.minSegLength / 5, front);
    });
};

const drawBoundsTransform = (ctx: Canvas, data: ReturnType<typeof getPatternData>) => {
    const front = new pk.Paint();
    front.setStyle(pk.PaintStyle.Stroke);
    front.setColor([1, 1, 1]);
    front.setColor([205 / 255, 127 / 255, 1 / 255]);
    // 205, 127, 5
    front.setStrokeWidth(data.minSegLength / 3);
    front.setAntiAlias(true);
    front.setStrokeCap(pk.StrokeCap.Butt);

    applyTilingTransformsG([data.bounds], data.ttt, (pt, tx) =>
        pt.map((p) => applyMatrices(p, tx)),
    ).forEach((paths) => {
        const path = pk.Path.MakeFromCmds(
            paths
                .flatMap((p, i) => [i === 0 ? pk.MOVE_VERB : pk.LINE_VERB, p.x, p.y])
                .concat([pk.CLOSE_VERB]),
        )!;
        front.setStrokeWidth(data.minSegLength / 10);
        ctx.drawPath(path, front);
        path.delete();
    });
    front.delete();
};

const drawFlips = (ctx: Canvas, data: ReturnType<typeof getPatternData>) => {
    if (!fontCache) {
        fontCache = readFileSync(join(import.meta.dirname, 'Roboto-Regular.ttf'));
    }

    const typeface = pk.Typeface.MakeTypefaceFromData(fontCache.buffer)!;

    const paint = new pk.Paint();
    paint.setStyle(pk.PaintStyle.Fill);
    paint.setColor([1, 1, 1]);
    paint.setAlphaf(0.1);
    const path = pk.Path.MakeFromCmds([
        pk.MOVE_VERB,
        data.bounds[0].x,
        data.bounds[0].y,
        ...data.bounds.slice(1).flatMap(({x, y}) => [pk.LINE_VERB, x, y]),
    ]);
    ctx.drawPath(path!, paint);
    path?.delete();

    paint.setStyle(pk.PaintStyle.Fill);
    paint.setColor([0, 0, 0]);

    const fonto = new pk.Font(typeface, 0.1);
    data.bounds.forEach((coord, i) => {
        ctx.drawText(i + '', coord.x, coord.y, paint, fonto);
    });
    paint.delete();
};

export const canvasTiling = async (
    data: ReturnType<typeof getPatternData>,
    size: number,
    flipped: boolean,
    config: {woven?: number; lines?: number; shapes?: number; margin?: number},
) => {
    let surface = pk.MakeSurface(size, size);

    if (!surface) {
        // console.error(`Canvaskit is dead!!!`);
        // // await resetCanvasKit();
        // surface = pk.MakeSurface(size, size);
        // if (!surface) {
        throw new Error('canvaskit is dead and refuses to reset');
        // }
    }

    const ctx = surface.getCanvas();
    ctx.clear(pk.BLACK);

    const margin = config.margin ?? 0.5;
    ctx.scale(size / (2 + margin * 2), size / (2 + margin * 2));
    ctx.translate(1 + margin, 1 + margin);

    if (config.shapes || (!config.lines && !config.woven)) {
        drawShapes(
            ctx,
            data,
            flipped,
            config.shapes ? data.minSegLength * config.shapes : undefined,
        );
    }

    // if (flipped) {
    //     drawFlips(ctx, data);
    // }

    // const showLines = true;
    if (config.lines) {
        drawLines(ctx, data, data.minSegLength * config.lines);
    }

    if (data.woven && config.woven) {
        drawWoven(ctx, data, data.minSegLength * config.woven);
    }

    // const showBoundsTransforms = false;
    // if (showBoundsTransforms) {
    //     drawBoundsTransform(ctx, data);
    // }

    // const showSegmentsEndpoints = false;
    // if (showSegmentsEndpoints) {
    //     drawSegmentsEndpoints(ctx, data);
    // }

    const img = surface.makeImageSnapshot();
    const bytes = img.encodeToBytes()!;
    return bytes;
};
