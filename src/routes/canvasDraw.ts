import {Canvas} from 'canvaskit-wasm';
import {getPatternData} from './getPatternData';
import {pk} from './pk';
import {cmpCoords} from './shapesFromSegments';

export const drawBounds = (ctx: Canvas, data: ReturnType<typeof getPatternData>) => {
    const paint = new pk.Paint();
    paint.setStyle(pk.PaintStyle.Fill);
    paint.setColor([1, 1, 1]);
    paint.setAlphaf(0.2);
    ctx.drawPath(
        pk.Path.MakeFromCmds([
            pk.MOVE_VERB,
            data.bounds[0].x,
            data.bounds[0].y,
            ...data.bounds.slice(1).flatMap(({x, y}) => [pk.LINE_VERB, x, y]),
        ])!,
        paint,
    );
};

export function hslToHex(h: number, s: number, l: number) {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return color;
    };
    return [f(0), f(8), f(4)];
}

export const drawShapes = (
    ctx: Canvas,
    data: ReturnType<typeof getPatternData>,
    flipped: boolean,
    stroke?: number,
) => {
    const col = (i: number) => {
        const ci = data.colorInfo.colors[i];
        if (ci === -1) return [0, 0, 0];
        const percent = ci / (data.colorInfo.maxColor + 1);
        //   (data.colorInfo.colors[i] / (data.colorInfo.maxColor + 1)) *
        //       360,
        return hslToHex(100, flipped ? 50 : 0, percent * 40 + 30);
    };

    data.shapes.forEach((shape, i) => {
        const paint = new pk.Paint();
        paint.setStyle(pk.PaintStyle.Fill);
        paint.setColor(col(i));
        const path = pk.Path.MakeFromCmds([
            pk.MOVE_VERB,
            shape[0].x,
            shape[0].y,
            ...shape.slice(1).flatMap(({x, y}) => [pk.LINE_VERB, x, y]),
        ])!;
        ctx.drawPath(path, paint);
    });

    if (stroke) {
        data.shapes.forEach((shape, i) => {
            const paint = new pk.Paint();
            const path = pk.Path.MakeFromCmds([
                pk.MOVE_VERB,
                shape[0].x,
                shape[0].y,
                ...shape.slice(1).flatMap(({x, y}) => [pk.LINE_VERB, x, y]),
                pk.CLOSE_VERB,
            ])!;
            paint.setColor(pk.BLACK);
            paint.setStyle(pk.PaintStyle.Stroke);
            paint.setStrokeWidth(stroke);
            ctx.drawPath(path, paint);
        });
    }
};

export const drawLines = (
    ctx: Canvas,
    data: ReturnType<typeof getPatternData>,
    lineWidth: number,
) => {
    const byColor = data.allSegments
        .map((seg, i) => ({seg, path: data.paths[i].pathId}))
        .sort((a, b) =>
            a.path === b.path
                ? cmpCoords(a.seg[0], b.seg[0])
                : a.path == null
                  ? -1
                  : b.path == null
                    ? 1
                    : a.path - b.path,
        );

    byColor.forEach(({seg: [a, b], path}) => {
        const paint = new pk.Paint();
        paint.setStyle(pk.PaintStyle.Stroke);
        paint.setStrokeWidth(lineWidth);
        paint.setStrokeCap(pk.StrokeCap.Round);
        paint.setAntiAlias(true);
        paint.setColor(path == null ? [0, 0, 0] : hslToHex((path % 12) * 30, 100, 50));

        // paint.setAlphaf(0.1);
        ctx.drawPath(
            pk.Path.MakeFromCmds([pk.MOVE_VERB, a.x, a.y, pk.LINE_VERB, b.x, b.y])!,
            paint,
        );
    });
};

export const drawWoven = (
    ctx: Canvas,
    data: ReturnType<typeof getPatternData>,
    lineWidth: number,
) => {
    if (!data.woven) return;

    const front = new pk.Paint();
    front.setStyle(pk.PaintStyle.Stroke);
    front.setColor([1, 1, 1]);
    front.setColor([205 / 255, 127 / 255, 1 / 255]);
    // 205, 127, 5
    front.setStrokeWidth(lineWidth);
    front.setAntiAlias(true);
    front.setStrokeCap(pk.StrokeCap.Butt);

    const back = new pk.Paint();
    back.setStyle(pk.PaintStyle.Stroke);
    // back.setColor([0.5, 0.5, 0.5]);
    back.setColor([0, 0, 0]);
    back.setStrokeWidth(lineWidth * 2);
    back.setAntiAlias(true);
    back.setStrokeCap(pk.StrokeCap.Butt);
    // back.setAlphaf(0.5);
    const off = 0; //data.minSegLength / 5;

    const orders = data.woven.map((w) => w.order);
    const minOrder = Math.min(...orders);
    const orderScale = Math.max(...orders) - minOrder;

    data.woven.forEach(({points, pathId, isBack, order}) => {
        // front.setColor(pathId == null ? [1, 1, 1] : hslToHex((pathId % 12) * 30, 100, 50));
        // front.setColor(hslToHex(0, 100, ((order - minOrder) / orderScale) * 100));
        // front.setColor(hslToHex(((order - minOrder) / orderScale) * 300, 100, 50));
        // front.setStrokeWidth(
        //     lineWidth * (isBack ? 1.2 : 1),
        //     // data.minSegLength / (isBack ? 1.5 : 3)
        // );
        // front.setStrokeWidth(data.minSegLength / (isBack ? 3 : 8));

        points.forEach((path) => {
            const pathb = pk.Path.MakeFromCmds(
                path.flatMap((p, i) => [i === 0 ? pk.MOVE_VERB : pk.LINE_VERB, p.x, p.y]),
            )!;
            // ctx.drawPath(pathb, front);
            ctx.drawPath(pathb, isBack ? back : front);
        });

        // const pathb = pk.Path.MakeFromCmds(
        //     points.flatMap((path) =>
        //         path.flatMap((p, i) => [
        //             i === 0 ? pk.MOVE_VERB : pk.LINE_VERB,
        //             p.x + off,
        //             p.y + off,
        //         ]),
        //     ),
        // )!;
        // ctx.drawPath(pathb, back);

        // const path = pk.Path.MakeFromCmds(
        //     points.flatMap((path) =>
        //         path.flatMap((p, i) => [i === 0 ? pk.MOVE_VERB : pk.LINE_VERB, p.x, p.y]),
        //     ),
        // )!;

        // points.forEach((path) => {
        //     const pathb = pk.Path.MakeFromCmds(
        //         path.flatMap((p, i) => [i === 0 ? pk.MOVE_VERB : pk.LINE_VERB, p.x, p.y]),
        //     )!;
        //     ctx.drawPath(pathb, front);
        // });

        // ctx.drawPath(path, front);
    });
};
