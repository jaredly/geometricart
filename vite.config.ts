import {reactRouter} from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import {defineConfig} from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import UnpluginTypia from '@ryoppippi/unplugin-typia/vite';

export default defineConfig({
    plugins: [UnpluginTypia({}), tailwindcss(), reactRouter(), tsconfigPaths()],
    worker: {
        format: 'es',
    },
});
