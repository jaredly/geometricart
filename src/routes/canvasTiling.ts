import {getPatternData} from './getPatternData';
import {pk, resetCanvasKit} from './pk';
import {readFileSync} from 'fs';
import {join} from 'path';

function hslToHex(h: number, s: number, l: number) {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return color;
    };
    return [f(0), f(8), f(4)];
}

type ColorScheme = (i: number) => string;

let fontCache = null as null | NonSharedBuffer;

export const canvasTiling = async (
    data: ReturnType<typeof getPatternData>,
    size: number,
    flipped: boolean,
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

    const paint = new pk.Paint();
    paint.setColor(pk.BLACK);
    paint.setStyle(pk.PaintStyle.Fill);
    paint.setAntiAlias(true);
    ctx.drawRect(pk.LTRBRect(0, 0, size, size), paint);

    const margin = 0.5;

    ctx.scale(size / (2 + margin * 2), size / (2 + margin * 2));
    ctx.translate(1 + margin, 1 + margin);

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
        ctx.drawPath(
            pk.Path.MakeFromCmds([
                pk.MOVE_VERB,
                shape[0].x,
                shape[0].y,
                ...shape.slice(1).flatMap(({x, y}) => [pk.LINE_VERB, x, y]),
            ])!,
            paint,
        );
    });

    if (flipped) {
        if (!fontCache) {
            fontCache = readFileSync(join(import.meta.dirname, 'Roboto-Regular.ttf'));
        }

        const typeface = pk.Typeface.MakeTypefaceFromData(fontCache.buffer)!;

        const paint = new pk.Paint();
        paint.setStyle(pk.PaintStyle.Fill);
        paint.setColor([1, 1, 1]);
        paint.setAlphaf(0.1);
        ctx.drawPath(
            pk.Path.MakeFromCmds([
                pk.MOVE_VERB,
                data.bounds[0].x,
                data.bounds[0].y,
                ...data.bounds.slice(1).flatMap(({x, y}) => [pk.LINE_VERB, x, y]),
            ])!,
            paint,
        );

        paint.setStyle(pk.PaintStyle.Fill);
        paint.setColor([0, 0, 0]);

        const fonto = new pk.Font(typeface, 0.1);
        data.bounds.forEach((coord, i) => {
            ctx.drawText(i + '', coord.x, coord.y, paint, fonto);
        });
    }

    const showLines = false;
    if (showLines) {
        const byColor = data.allSegments
            .map((seg, i) => ({seg, path: data.paths[i].pathId}))
            .sort((a, b) => a.path! - b.path!);

        byColor.forEach(({seg: [a, b], path}) => {
            const paint = new pk.Paint();
            paint.setStyle(pk.PaintStyle.Stroke);
            paint.setStrokeWidth(data.minSegLength / 2);
            paint.setStrokeCap(pk.StrokeCap.Round);
            paint.setColor(path == null ? [0, 0, 0] : hslToHex((path % 12) * 30, 100, 50));

            // paint.setAlphaf(0.1);
            ctx.drawPath(
                pk.Path.MakeFromCmds([pk.MOVE_VERB, a.x, a.y, pk.LINE_VERB, b.x, b.y])!,
                paint,
            );
        });
    }
    if (2 > 1) {
        const back = new pk.Paint();
        back.setStyle(pk.PaintStyle.Stroke);
        back.setColor([0, 0, 0]);
        back.setStrokeWidth(data.minSegLength / 1.5);
        back.setAntiAlias(true);
        const front = new pk.Paint();
        front.setStyle(pk.PaintStyle.Stroke);
        front.setColor([1, 1, 1]);
        front.setStrokeWidth(data.minSegLength / 3);
        front.setAntiAlias(true);
        front.setStrokeCap(pk.StrokeCap.Round);

        data.woven?.forEach(({points, pathId}) => {
            front.setColor(pathId == null ? [1, 1, 1] : hslToHex((pathId % 12) * 30, 100, 50));

            const path = pk.Path.MakeFromCmds(
                points.flatMap((path) =>
                    path.flatMap((p, i) => [i === 0 ? pk.MOVE_VERB : pk.LINE_VERB, p.x, p.y]),
                ),
            )!;
            ctx.drawPath(path, back);
            ctx.drawPath(path, front);
        });
    }

    const img = surface.makeImageSnapshot();
    const bytes = img.encodeToBytes()!;
    return bytes;
};

export function dataURItoBlob(dataURI: string) {
    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
    const [mime, data] = dataURI.split(',');
    var byteString = atob(data);

    // separate out the mime component
    var mimeString = mime.split(':')[1].split(';')[0];

    // write the bytes of the string to an ArrayBuffer
    var ab = new ArrayBuffer(byteString.length);

    // create a view into the buffer
    var ia = new Uint8Array(ab);

    // set the bytes of the buffer to the correct values
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    // write the ArrayBuffer to a blob, and you're done
    var blob = new Blob([ab], {type: mimeString});
    return blob;
}
