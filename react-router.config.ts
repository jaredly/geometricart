import type {Config} from '@react-router/dev/config';
import {getAllPatterns, getPattern} from './src/routes/db.server';
// import {Database} from 'bun:sqlite';

// const db = new Database(join(import.meta.dirname, 'data.db'));
// const query = db.query('select id, hash from Tiling');
// const alls = query.all() as {id: string; hash: string}[];
const alls = getAllPatterns();

// const images = alls.map((t) => getPattern(t.hash)).flatMap((p) => p?.images);

export default {
    // Config options...
    // Server-side render by default, to enable SPA mode set this to `false`
    ssr: true,
    // ssr: false,
    // prerender: ({getStaticPaths}) => {
    //     return [...getStaticPaths(), ...alls.map((tiling) => `gallery/pattern/${tiling.hash}`)];
    // },
    async prerender() {
        return [
            '/',
            '/animator/',
            '/gallery/',
            ...alls.map((tiling) => `/gallery/pattern/${tiling.hash}`),
            ...alls.map((tiling) => `/gallery/pattern/${tiling.hash}/600.png`),
            // ...alls.map((tiling) => `/gallery/pattern/${tiling.hash}/400.png`),
            // ...(images.map((im) => im?.url).filter(Boolean) as string[]),
        ];
    },
    appDirectory: 'src/routes',
} satisfies Config;
