import {resolve} from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
    // ...
    build: {
        target: 'esnext', // you can also use 'es2020' here
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                editor: resolve(__dirname, 'editor/index.html'),
            },
        },
    },

    optimizeDeps: {
        esbuildOptions: {
            target: 'esnext', // you can also use 'es2020' here
        },
    },
});
