import fs from 'fs';
import {join} from 'path';
import type {Route} from './+types/uploads-image';

export async function loader({params}: Route.LoaderArgs) {
    const full = join(import.meta.dirname, '../../../assets', params.fname!);
    if (!fs.existsSync(full)) {
        console.log('no path', full);
        return new Response('Does not exist', {status: 404});
    }
    const data = Bun.file(full);
    return data; // new Response(data, {headers: {'Content-type':data.type}});
}
