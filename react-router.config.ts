import {join} from 'path';
import type {Config} from '@react-router/dev/config';
// import {Database} from 'bun:sqlite';

// const db = new Database(join(import.meta.dirname, 'data.db'));
// const query = db.query('select id, hash from Tiling');
// const alls = query.all() as {id: string; hash: string}[];

export default {
    // Config options...
    // Server-side render by default, to enable SPA mode set this to `false`
    ssr: true,
    // prerender: ({getStaticPaths}) => {
    //     return [...getStaticPaths(), ...alls.map((tiling) => `gallery/pattern/${tiling.hash}`)];
    // },
    appDirectory: 'src/routes',
} satisfies Config;
