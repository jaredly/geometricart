import {DiffBuilderA} from '../../../../json-diff/helper2';
import {ExportAnnotation} from '../ExportHistory';
import {genid} from '../utils/genid';
import {del, set} from './kv-idb';

export const lsprefix = 'localstorage:';
export const idbprefix = 'idb:';

const blobToDataUrl = (blob: Blob) => {
    return new Promise((res, rej) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => {
            res(reader.result);
        });
        reader.addEventListener('error', () => {
            rej(reader.error);
        });
        reader.readAsDataURL(blob);
    });
};

export async function saveAnnotation(
    snapshotUrl: (id: string, ext: string) => string,
    blob: Blob,
    tip: string,
    updateAnnotations: DiffBuilderA<Record<string, ExportAnnotation[]>, 'type', void, null>,
) {
    const aid = genid();
    const url = snapshotUrl(aid, 'png');
    if (url.startsWith(lsprefix)) {
        localStorage[url.slice(lsprefix.length)] = await blobToDataUrl(blob);
    } else if (url.startsWith(idbprefix)) {
        console.log('saving now', url, blob);
        await set(url.slice(idbprefix.length), blob);
    } else {
        await fetch(url, {
            method: 'POST',
            body: blob,
            headers: {'Content-type': 'application/binary'},
        });
    }

    const an: ExportAnnotation = {type: 'img', id: aid};
    updateAnnotations[tip]((v, up) => (v ? up.push(an) : up([an])));
}

export async function deleteAnnotation(
    snapshotUrl: (id: string, ext: string) => string,
    tip: string,
    aid: string,
    updateAnnotations: DiffBuilderA<Record<string, ExportAnnotation[]>, 'type', void, null>,
) {
    const url = snapshotUrl(aid, 'png');
    if (url.startsWith(lsprefix)) {
        localStorage.removeItem(url.slice(lsprefix.length));
    } else if (url.startsWith(idbprefix)) {
        await del(url.slice(idbprefix.length));
    } else {
        await fetch(url, {method: 'DELETE'});
    }
    updateAnnotations[tip]((v, up) => {
        const at = v.findIndex((n) => n.id === aid);
        if (at === -1) {
            console.warn(`COuldnt find it`, v, aid);
            return [];
        }
        return up[at].remove();
    });
}
