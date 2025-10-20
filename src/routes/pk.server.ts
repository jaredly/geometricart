import CKI from 'canvaskit-wasm'

export const pk = await CKI({
    locateFile: (file) =>
        import.meta.dirname + '/../../node_modules/canvaskit-wasm/bin/' + file,
});
