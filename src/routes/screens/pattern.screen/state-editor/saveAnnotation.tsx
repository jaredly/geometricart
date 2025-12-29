import {DiffBuilderA} from '../../../../json-diff/helper2';
import {ExportAnnotation} from '../ExportHistory';
import {genid} from '../genid';

export async function saveAnnotation(
    exportID: string,
    blob: Blob,
    tip: string,
    updateAnnotations: DiffBuilderA<Record<string, ExportAnnotation[]>, 'type', void, null>,
) {
    const aid = genid();
    await fetch(`/fs/exports/${exportID}-${aid}.png`, {
        method: 'POST',
        body: blob,
        headers: {'Content-type': 'application/binary'},
    });

    const an: ExportAnnotation = {type: 'img', id: aid};
    updateAnnotations[tip]((v, up) => (v ? up.push(an) : up([an])));
}

export async function deleteAnnotation(
    exportID: string,
    tip: string,
    aid: string,
    updateAnnotations: DiffBuilderA<Record<string, ExportAnnotation[]>, 'type', void, null>,
) {
    await fetch(`/fs/exports/${exportID}-${aid}.png`, {method: 'DELETE'});
    updateAnnotations[tip]((v, up) => {
        const at = v.findIndex((n) => n.id === aid);
        if (at === -1) {
            console.warn(`COuldnt find it`, v, aid);
            return [];
        }
        return up[at].remove();
    });
}
