import PathKitInit from 'pathkit-wasm';

export const PK = await PathKitInit({
    locateFile: (file) => '/node_modules/pathkit-wasm/bin/' + file,
});

// @ts-ignore
window.PK = PK;
