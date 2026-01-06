import {DiffBuilderA} from '../../../../json-diff/helper2';
import {ExportAnnotation} from '../ExportHistory';
import {genid} from '../utils/genid';
import db from './kv-idb';

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

type FetchUrls = {type: 'remote-src'; src: string} | {type: 'localhost'; id: string};

export type SnapshotUrl = FetchUrls | {type: 'idb'; id: string};
// (id: string, ext: string) => string;

export const makeSnapshotUrl = (config: FetchUrls, aid: string, ext: string) =>
    config.type === 'remote-src'
        ? config.src.replace('.json', `-${aid}.${ext}`)
        : `/fs/exports/${config.id}-${aid}.${ext}`;

export async function saveAnnotation(
    snapshotUrl: SnapshotUrl,
    blob: Blob,
    tip: string,
    updateAnnotations: DiffBuilderA<Record<string, ExportAnnotation[]>, 'type', void, null>,
) {
    const aid = genid();
    if (snapshotUrl.type === 'idb') {
        await db.set('snapshots', [snapshotUrl.id, aid], blob);
        await db.set('snapshotMeta', [snapshotUrl.id, aid], {
            created: Date.now(),
            updated: Date.now(),
            size: blob.size,
        });
    } else {
        await fetch(makeSnapshotUrl(snapshotUrl, aid, 'png'), {
            method: 'POST',
            body: blob,
            headers: {'Content-type': 'application/binary'},
        });
    }

    const an: ExportAnnotation = {type: 'img', id: aid};
    updateAnnotations[tip]((v, up) => (v ? up.push(an) : up([an])));
}

export async function deleteAnnotation(
    snapshotUrl: SnapshotUrl,
    tip: string,
    aid: string,
    updateAnnotations: DiffBuilderA<Record<string, ExportAnnotation[]>, 'type', void, null>,
) {
    if (snapshotUrl.type === 'idb') {
        await db.del('snapshots', [snapshotUrl.id, aid]);
        await db.del('snapshotMeta', [snapshotUrl.id, aid]);
    } else {
        await fetch(makeSnapshotUrl(snapshotUrl, aid, 'png'), {method: 'DELETE'});
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
