import fs from 'fs';
import {join} from 'path';
import type {Route} from './+types/uploads-image';

export async function loader({params}: Route.LoaderArgs) {
    if (!params.fname) return new Response('No fname provided', {status: 404});
    const full = join(import.meta.dirname, '../../../uploads', params.fname);
    if (!fs.existsSync(full)) {
        const withjpg = full + '.jpg';
        if (fs.existsSync(withjpg)) {
            const file = Bun.file(withjpg);
            return new Response(file, {headers: {'Content-type': file.type}});
        }
        console.error('no path', full);
        return new Response('Does not exist', {status: 404});
    }
    const file = Bun.file(full);
    return new Response(file, {headers: {'Content-type': file.type}});
}
