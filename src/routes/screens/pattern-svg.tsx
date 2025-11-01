import {renderToStaticMarkup} from 'react-dom/server';
import type {Route} from './+types/pattern-svg';
import {getPattern} from '../db.server';
import {canvasTiling} from '../canvasTiling';
import {getPatternData} from '../getPatternData';
import {TilingPattern} from '../ShowTiling';
import {flipPattern} from '../flipPattern';

const pngCache: Record<string, Buffer<ArrayBuffer>> = {};

export async function loader({params, request}: Route.LoaderArgs) {
    if (!params.id) {
        return null;
    }
    const url = new URL(request.url);
    const search = url.searchParams;
    const img = params.img;
    const [size, format] = img.split('.');
    const pattern = getPattern(params.id);
    if (!pattern) {
        return null;
    }

    if (format === 'svg') {
        const tiling = renderToStaticMarkup(
            <TilingPattern
                tiling={pattern.tiling}
                size={+size}
                data={getPatternData(pattern.tiling)}
            />,
        );
        return new Response(tiling, {headers: {'Content-Type': 'image/svg+xml'}});
    }

    const k = url.pathname + url.search;

    if (pngCache[k]) {
        return new Response(pngCache[k], {headers: {'Content-type': 'image/png'}});
    }

    // pattern.tiling = preTransformTiling(pattern.tiling);

    // const flip = search.get('flip') === 'no' ? pattern.tiling : flipPattern(pattern.tiling);
    // const dataUri = await canvasTiling(getPatternData(flip), size * 2, flip !== pattern.tiling)!;
    // const font = await fetch('https://cdn.skia.org/misc/Roboto-Regular.ttf').then((s) =>
    //     s.arrayBuffer(),
    // );

    const flip = search.get('flip') === 'no' ? pattern.tiling : flipPattern(pattern.tiling);
    const dataUri = await canvasTiling(getPatternData(flip), +size * 2, flip !== pattern.tiling, {
        woven: search.get('woven') ? +search.get('woven')! : undefined,
        lines: search.get('lines') ? +search.get('lines')! : undefined,
        shapes: search.get('shapes') ? +search.get('shapes')! : undefined,
    })!;
    // return dataUri;
    // const [mime, data] = dataUri.split(',');
    const buffer = Buffer.from(dataUri);
    pngCache[k] = buffer;
    return new Response(buffer, {headers: {'Content-type': 'image/png'}});
}
