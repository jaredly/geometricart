import fs from 'fs';
import {join} from 'path';
import type {Route} from './+types/assets';

const assetsDir = join(import.meta.dirname, '../../../assets');

export async function loader({params}: Route.LoaderArgs) {
    const {'*': fname} = params;
    if (fname.includes('..')) return new Response('Invalid path', {status: 400});
    const full = join(assetsDir, fname);
    if (!fs.existsSync(full)) {
        console.log('no path', full);
        return new Response('Does not exist', {status: 404});
    }
    return Bun.file(full);
}

export async function action({params, request}: Route.LoaderArgs) {
    const {'*': fname} = params;
    const data = await request.arrayBuffer();
    await Bun.write(Bun.file(join(assetsDir, fname)), data);
}
