import {Canvas, InputColor} from 'canvaskit-wasm';
import {applyTilingTransformsG} from '../editor/tilingPoints';
import {applyMatrices} from '../rendering/getMirrorTransforms';
import {getPatternData, pkPathFromCoords} from './getPatternData';
import {pk, resetCanvasKit} from './pk';
import {readFileSync} from 'fs';
import {join} from 'path';
import {drawLines, drawShapes, drawWoven} from './canvasDraw';
import {Coord} from '../types';
import {allPairs} from './shapesFromSegments';

type ColorScheme = (i: number) => string;

let fontCache = null as null | NonSharedBuffer;

const drawPoints = (ctx: Canvas, pts: Coord[], color: InputColor, size: number) => {
    const paint = new pk.Paint();
    paint.setColor(color);
    paint.setStyle(pk.PaintStyle.Fill);
    paint.setAntiAlias(true);

    pts.forEach((pt) => {
        ctx.drawCircle(pt.x, pt.y, size, paint);
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
        console.error(`Canvaskit is dead!!!`);
        await resetCanvasKit();
        surface = pk.MakeSurface(size, size);
        if (!surface) {
            throw new Error('canvaskit is dead and refuses to reset');
        }
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

    // const showSegmentsEndpoints = true;
    // if (showSegmentsEndpoints) {
    //     // drawPoints(ctx, data.allSegments.flat(), pk.BLACK, data.minSegLength / 4);
    //     // drawPoints(ctx, data.eigenPoints, [1, 1, 1], data.minSegLength / 8);
    //     // drawPoints(ctx, data.initialShapes[0], [1, 0, 1], data.minSegLength / 4);
    //     const paint = new pk.Paint();
    //     // paint.setStyle(pk.PaintStyle.Stroke);
    //     // paint.setColor([1, 1, 1]);
    //     paint.setStrokeWidth(data.minSegLength / 4);
    //     // shapeSegs(data.initialShapes[0]).forEach((pts) => {
    //     //     const path = pkPathFromCoords(pts, false)!;
    //     //     ctx.drawPath(path, paint);
    //     //     path.delete();
    //     // });
    //     paint.setStyle(pk.PaintStyle.Fill);
    //     paint.setColor([0, 1, 1]);
    //     data.initialShapes.forEach((shape) => {
    //         ctx.drawPath(pkPathFromCoords(shape, false)!, paint);
    //     });
    //     paint.setColor([1, 0, 0]);
    //     data.shapes.forEach((shape) => {
    //         ctx.drawPath(pkPathFromCoords(shape, false)!, paint);
    //     });
    //     paint.delete();
    // }

    const img = surface.makeImageSnapshot();
    const bytes = img.encodeToBytes()!;
    surface.dispose();
    img.delete();
    return bytes;
};

const shapeSegs = (coords: Coord[]): [Coord, Coord][] => {
    return coords.map((pt, i) => [coords[i === 0 ? coords.length - 1 : i - 1], pt]);
};
