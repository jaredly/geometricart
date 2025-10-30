import {Route} from './+types/gallery';
import {getAllPatterns} from './db.server';
import {getPatternData} from './getPatternData';
import {getUniqueShapes} from './getUniqueShapes';

export async function loader(data: Route.LoaderArgs) {
    const limit = new URL(data.request.url).searchParams.get('limit');
    let plain = getAllPatterns();
    // .filter((t) => t.hash === '3ec9815442a44a060745e6e3388f64f7c14a3787')
    // .filter((t) => t.hash === '2fe167ca7e5e06c71b0bbf555a7db33897dd2422')
    // .filter((t) => t.hash === '11e20b0b5c2acf8fbe077271c9dab02fd69ea419')
    if (limit) {
        if ((+limit).toString() === limit) {
            plain = plain.slice(0, +limit);
        } else [(plain = plain.filter((t) => t.hash === limit))];
    }
    const patterns = plain.map((pattern) => ({...pattern, data: getPatternData(pattern.tiling)}));

    return {
        patterns: patterns.map(({hash, data: {bounds}, tiling}) => ({
            hash,
            tiling,
            data: {bounds},
        })),
        shapes: getUniqueShapes(patterns),
    };
}
