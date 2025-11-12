export {type Path, type Path as PKPath} from 'canvaskit-wasm';
import CKI from 'canvaskit-wasm';

const getPk = () =>
    CKI({
        locateFile: (file) =>
            typeof window !== 'undefined'
                ? '/node_modules/canvaskit-wasm/bin/' + file
                : // @ts-ignore
                  typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope
                  ? '/node_modules/canvaskit-wasm/bin/' + file
                  : import.meta.dirname + '/../../node_modules/canvaskit-wasm/bin/' + file,
    });

export let pk = await getPk();

export const resetCanvasKit = async () => {
    pk = await getPk();
};
