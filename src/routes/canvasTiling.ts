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
        // .toString(16)
        // .padStart(2, '0'); // convert to Hex and prefix "0" if needed
    };
    return [f(0), f(8), f(4)];
}

type ColorScheme = (i: number) => string;

// const schemes = {
//     'fall':
//     ctx.fillStyle = hslToHex(((i % 7) / 7) * 60, 100, ((i % 6) / 6) * 20 + 20);
// }

let fontCache = null as null | NonSharedBuffer;

export const canvasTiling = async (
    data: ReturnType<typeof getPatternData>,
    size: number,
    flipped: boolean,
) => {
    if (!fontCache) {
        fontCache = readFileSync(join(import.meta.dirname, 'Roboto-Regular.ttf'));
    }
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
    // const canvas = pk.MakeCanvas(size, size);
    // pk.MakeSurface
    // const ctx = canvas.getContext('2d');
    // if (!ctx) throw new Error(`no context`);
    // ctx.fillStyle = 'black';
    // ctx.fillRect(0, 0, size, size);

    const margin = 0.5;

    ctx.scale(size / (2 + margin * 2), size / (2 + margin * 2));
    ctx.translate(1 + margin, 1 + margin);

    data.shapes.forEach((shape, i) => {
        const paint = new pk.Paint();
        paint.setStyle(pk.PaintStyle.Fill);
        paint.setColor(
            data.colorInfo.colors[data.shapeIds[i]] === -1
                ? [0, 0, 0]
                : hslToHex(
                      //   (data.colorInfo.colors[data.shapeIds[i]] / (data.colorInfo.maxColor + 1)) *
                      //       360,
                      100,
                      flipped ? 50 : 0,
                      (data.colorInfo.colors[data.shapeIds[i]] / (data.colorInfo.maxColor + 1)) *
                          40 +
                          30,
                  ),
        );
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

    // data.shapes.forEach((shape) => {
    //     ctx.lineWidth = 0.003;
    //     // ctx.lineWidth = data.minSegLength / 3;
    //     ctx.beginPath();
    //     shape.forEach(({x, y}, i) => {
    //         if (i === 0) {
    //             ctx.moveTo(x, y);
    //         } else {
    //             ctx.lineTo(x, y);
    //         }
    //     });
    //     ctx.stroke();
    // });

    // pk.MakeImageFromCanvasImageSource(ctx)

    const img = surface.makeImageSnapshot();
    const bytes = img.encodeToBytes()!;
    img.delete();
    ctx.delete();
    surface.delete();
    return bytes;

    // const url = canvas.toDataURL();
    // canvas.dispose();
    // return url;
    // return ctx.save
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
