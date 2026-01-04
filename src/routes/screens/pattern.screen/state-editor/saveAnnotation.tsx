import {DiffBuilderA} from '../../../../json-diff/helper2';
import {ExportAnnotation} from '../ExportHistory';
import {genid} from '../utils/genid';

export async function saveAnnotation(
    snapshotUrl: (id: string, ext: string) => string,
    blob: Blob,
    tip: string,
    updateAnnotations: DiffBuilderA<Record<string, ExportAnnotation[]>, 'type', void, null>,
) {
    const aid = genid();
    await fetch(snapshotUrl(aid, 'png'), {
        method: 'POST',
        body: blob,
        headers: {'Content-type': 'application/binary'},
    });

    const an: ExportAnnotation = {type: 'img', id: aid};
    updateAnnotations[tip]((v, up) => (v ? up.push(an) : up([an])));
}

export async function deleteAnnotation(
    snapshotUrl: (id: string, ext: string) => string,
    tip: string,
    aid: string,
    updateAnnotations: DiffBuilderA<Record<string, ExportAnnotation[]>, 'type', void, null>,
) {
    await fetch(snapshotUrl(aid, 'png'), {method: 'DELETE'});
    updateAnnotations[tip]((v, up) => {
        const at = v.findIndex((n) => n.id === aid);
        if (at === -1) {
            console.warn(`COuldnt find it`, v, aid);
            return [];
        }
        return up[at].remove();
    });
}
