import {makeImage} from '../rendering/CanvasRender';
import {State} from '../types';

export async function cacheOverlays(hstate: State) {
    const overlays: {[key: string]: HTMLImageElement} = {};
    for (let [id, overlay] of Object.entries(hstate.overlays)) {
        const key = hstate.attachments[overlay.source].contents;
        overlays[key] = await makeImage(hstate.attachments[overlay.source].contents);
    }
    return overlays;
}
