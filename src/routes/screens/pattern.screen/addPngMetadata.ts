import {encodeChunks, extractChunks, insertMetadata} from 'png-metadata';

export async function addMetadata(blob: Blob | null, data: {[key: string]: string}) {
    const buffer = await blob!.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    const chunks = extractChunks(uint8Array);
    insertMetadata(chunks, {
        tEXt: Object.fromEntries(
            Object.entries(data).map(([key, value]) => [fixAscii(key), fixAscii(value)]),
        ),
    });
    const newBuffer = new Uint8Array(encodeChunks(chunks));

    const newBlob = new Blob([newBuffer], {type: blob!.type});
    return newBlob;
}

const fixAscii = (v: string) => (isAscii(v) ? v : escapeNonAsciis(v));

function isAscii(text: string) {
    return /^[\x00-\x7F]*$/.test(text);
}

export function escapeNonAsciis(text: string) {
    const chars = [];
    let i = 0;
    while (i < text.length) {
        let code = text.charCodeAt(i);
        if (code < 128) {
            chars.push(text[i]);
        } else {
            if (code < 256) {
                chars.push('\\u00');
            } else if (code < 4096) {
                chars.push('\\u0');
            } else {
                chars.push('\\u');
            }
            chars.push(code.toString(16));
        }
        i++;
    }
    return chars.join('');
}
