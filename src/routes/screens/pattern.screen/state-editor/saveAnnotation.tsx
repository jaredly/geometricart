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
