// import {pk as pkc} from './pk.client';
// import {pk as pks} from './pk.server';
// import { serverOnly$ } from "vite-env-only";
import CKI from 'canvaskit-wasm';

export let pk = await CKI({
    locateFile: (file) =>
        typeof window !== 'undefined'
            ? (process.env.NODE_ENV === 'development' ? '/node_modules/canvaskit-wasm/bin/' : '/') +
              file
            : import.meta.dirname + '/../../node_modules/canvaskit-wasm/bin/' + file,
});

export const resetCanvasKit = async () => {
    pk = await CKI({
        locateFile: (file) =>
            typeof window !== 'undefined'
                ? (process.env.NODE_ENV === 'development'
                      ? '/node_modules/canvaskit-wasm/bin/'
                      : '/') + file
                : import.meta.dirname + '/../../node_modules/canvaskit-wasm/bin/' + file,
    });
};

// export const pk = pkc ?? serverOnly$(pks);
