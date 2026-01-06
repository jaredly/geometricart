import {encodeChunks, extractChunks, insertMetadata} from 'png-metadata';

export async function addMetadata(blob: Blob | null, data: {[key: string]: string}) {
    const buffer = await blob!.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    const chunks = extractChunks(uint8Array);
    insertMetadata(chunks, {tEXt: data});
    const newBuffer = new Uint8Array(encodeChunks(chunks));

    const newBlob = new Blob([newBuffer], {type: blob!.type});
    return newBlob;
}
