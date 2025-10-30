import {State} from './types';
import {setupState} from './setupState';

export const getForeignState = async (image: string | null, load: string | null) => {
    if (load) {
        try {
            const state: State = await (await fetch(load)).json();
            Object.values(state.attachments).forEach((att) => {
                console.log(att.contents);
                if (att.contents.startsWith('/')) {
                    att.contents = 'http://localhost:3000' + att.contents;
                }
            });
            return state;
        } catch (err) {
            // ignore I think
        }
    }
    if (image) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = image;
        await new Promise((res) => (img.onload = res));

        const state = setupState(null);
        state.attachments['pattern'] = {
            id: 'pattern',
            name: 'pattern',
            width: img.naturalWidth,
            height: img.naturalHeight,
            contents: image,
        };
        state.overlays['overlay'] = {
            id: 'overlay',
            source: 'pattern',
            scale: {x: 1, y: 1},
            center: {x: 0, y: 0},
            hide: false,
            over: false,
            opacity: 1,
        };
        state.selection = null;
        return state;
    }
    return setupState(null);
};
