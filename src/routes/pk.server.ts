import PathKitInit from 'pathkit-wasm';

export const pk = await PathKitInit({
    locateFile: (file) =>
        'file:///' + import.meta.dirname + '/../../node_modules/pathkit-wasm/bin/' + file,
});
