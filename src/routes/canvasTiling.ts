import {getPatternData} from './getPatternData';
import {pk} from './pk';

function hslToHex(h: number, s: number, l: number) {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color)
            .toString(16)
            .padStart(2, '0'); // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

export const canvasTiling = (data: ReturnType<typeof getPatternData>, size: number) => {
    const canvas = pk.MakeCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error(`no context`);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, size, size);
    ctx.scale(size / 3, size / 3);
    ctx.translate(1.5, 1.5);
    ctx.strokeStyle = 'black';

    data.shapes.forEach((shape, i) => {
        ctx.fillStyle = hslToHex(90, 100, ((i % 6) / 6) * 80 + 20);
        ctx.beginPath();
        shape.forEach(({x, y}, i) => {
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.fill();
    });

    data.shapes.forEach((shape) => {
        ctx.lineWidth = data.minSegLength / 3;
        ctx.beginPath();
        shape.forEach(({x, y}, i) => {
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
    });

    return canvas.toDataURL();
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
