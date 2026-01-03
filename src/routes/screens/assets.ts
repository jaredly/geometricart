import fs, {unlinkSync} from 'fs';
import {join} from 'path';
import type {Route} from './+types/assets';

const assetsDir = join(import.meta.dirname, '../../../assets');

export async function loader({params}: Route.LoaderArgs) {
    console.log('LOADING');
    const {'*': fname} = params;
    if (fname!.includes('..')) return new Response('Invalid path', {status: 400});
    const full = join(assetsDir, fname!);
    if (!fs.existsSync(full)) {
        console.log('no path', full);
        return new Response('Does not exist', {status: 404});
    }
    if (fs.statSync(full).isDirectory()) {
        return new Response(
            JSON.stringify(
                fs
                    .readdirSync(full)
                    .sort()
                    .map((name) => {
                        const stat = fs.statSync(join(full, name));
                        return {name, created: stat.birthtimeMs, modified: stat.mtimeMs};
                    }),
            ),
            {
                headers: {
                    'Content-type': 'application/json',
                },
            },
        );
    }
    return new Response(Bun.file(full));
}

export async function action({params, request}: Route.LoaderArgs) {
    const {'*': fname} = params;
    if (fname!.includes('..')) throw new Error(`invalid file name`);
    if (request.method === 'POST') {
        const data = await request.arrayBuffer();
        await Bun.write(Bun.file(join(assetsDir, fname!)), data);
    } else if (request.method === 'DELETE') {
        unlinkSync(join(assetsDir, fname!));
    }
}
