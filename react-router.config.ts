import type {Config} from '@react-router/dev/config';
import {getAllPatterns} from './src/routes/db.server';

const alls = getAllPatterns();

const config = {
    ssr: true,
    async prerender() {
        return [
            '/',
            '/animator/',
            '/gallery/',
            ...alls.map((tiling) => `/gallery/pattern/${tiling.hash}`),
            ...alls.map((tiling) => `/gallery/pattern/${tiling.hash}/600.png`),
            ...alls.map((tiling) => `/gallery/pattern/${tiling.hash}/400.png`),
            // ...(images.map((im) => im?.url).filter(Boolean) as string[]),
        ];
    },
    appDirectory: 'src/routes',
} satisfies Config;

const isolatedConfig = {
    ssr: false,
    appDirectory: 'src/routes/screens/pattern.screen/isolated',
    buildDirectory: 'isolated-0',
} satisfies Config;

export default process.env.ISOLATED ? isolatedConfig : config;
