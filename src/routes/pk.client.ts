import CKI from 'canvaskit-wasm';

export const pk = await CKI({
    locateFile: (file) =>
        (process.env.NODE_ENV === 'development' ? '/node_modules/canvaskit-wasm/bin/' : '/') + file,
});
