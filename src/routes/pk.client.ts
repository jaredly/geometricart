import PathKitInit from 'pathkit-wasm';

export const pk = await PathKitInit({
    locateFile: (file) =>
        (process.env.NODE_ENV === 'development' ? '/node_modules/pathkit-wasm/bin/' : '/') + file,
});
