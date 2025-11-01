import fs from 'fs';
import {join} from 'path';
import type {Route} from './+types/uploads-image';

export async function loader({params}: Route.LoaderArgs) {
    const full = join(
        import.meta.dirname,
        '../../../../../apps/pattern-db/public/uploads',
        params.fname,
    );
    if (!fs.existsSync(full)) {
        console.log('no path', full);
        return new Response('Does not exist', {status: 404});
    }
    const data = fs.readFileSync(full);
    return new Response(data, {headers: {'Content-type': 'image/png'}});
}
