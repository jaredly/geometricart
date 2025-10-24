import {renderToStaticMarkup} from 'react-dom/server';
import type {Route} from './+types/pattern-svg';
import {getPattern} from './db.server';
import {canvasTiling} from './canvasTiling';
import {getPatternData} from './getPatternData';
import {TilingPattern} from './ShowTiling';
import {flipPattern} from './shapesFromSegments';

const pngCache: Record<string, Buffer<ArrayBuffer>> = {};

export async function loader({params, request}: Route.LoaderArgs) {
    if (!params.id) {
        return null;
    }
    const search = new URL(request.url).searchParams;
    const size = +params.size;
    const format = params.format;
    const pattern = getPattern(params.id);
    if (!pattern) {
        return null;
    }

    if (format === 'svg') {
        const tiling = renderToStaticMarkup(
            <TilingPattern
                tiling={pattern.tiling}
                size={size}
                data={getPatternData(pattern.tiling)}
            />,
        );
        return new Response(tiling, {headers: {'Content-Type': 'image/svg+xml'}});
    }

    const k = `${size}:${format}:${params.id}`;

    // if (pngCache[k]) {
    //     return new Response(pngCache[k], {headers: {'Content-type': 'image/png'}});
    // }

    const font = await fetch('https://cdn.skia.org/misc/Roboto-Regular.ttf').then((s) =>
        s.arrayBuffer(),
    );

    const flip = search.get('flip') === 'no' ? pattern.tiling : flipPattern(pattern.tiling);
    const dataUri = canvasTiling(getPatternData(flip), size * 2, flip !== pattern.tiling, font)!;
    // return dataUri;
    // const [mime, data] = dataUri.split(',');
    const buffer = Buffer.from(dataUri);
    pngCache[k] = buffer;
    return new Response(buffer, {headers: {'Content-type': 'image/png'}});
}
