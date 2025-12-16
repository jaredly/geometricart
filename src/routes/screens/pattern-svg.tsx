import {renderToStaticMarkup} from 'react-dom/server';
import type {Route} from './+types/pattern-svg';
import {getPattern} from '../db.server';
import {canvasTiling} from '../canvasTiling';
import {getNewPatternData, getPatternData} from '../getPatternData';
import {TilingPattern} from '../ShowTiling';
import {flipPattern} from '../flipPattern';
import {thinTiling} from './pattern.screen/renderPattern';

const pngCache: Record<string, Buffer<ArrayBuffer>> = {};

export async function loader({params, request}: Route.LoaderArgs) {
    if (!params.id || !params.img) {
        return null;
    }
    const url = new URL(request.url);
    const search = url.searchParams;
    const img = params.img;
    const pattern = getPattern(params.id);
    if (!pattern) {
        return null;
    }

    if (img === 'json') {
        return pattern.tiling;
    }

    const [size, format] = img.split('.');
    if (format === 'svg') {
        const tiling = renderToStaticMarkup(
            <TilingPattern
                tiling={pattern.tiling}
                size={+size}
                data={getNewPatternData(thinTiling(pattern.tiling))}
            />,
        );
        return new Response(tiling, {headers: {'Content-Type': 'image/svg+xml'}});
    }

    const k = url.pathname + url.search;

    if (pngCache[k]) {
        return new Response(pngCache[k], {headers: {'Content-type': 'image/png'}});
    }

    const flip = search.get('flip') === 'no' ? pattern.tiling : flipPattern(pattern.tiling);
    const psize = search.get('psize') ? +search.get('psize')! : 2;
    const crop = search.get('crop') ? +search.get('crop')! : undefined;
    const rawBytes = await canvasTiling(
        getNewPatternData(
            thinTiling(flip),
            psize,
            crop
                ? [
                      {
                          segments: [
                              {type: 'Line', to: {x: crop, y: -crop}},
                              {type: 'Line', to: {x: -crop, y: -crop}},
                              {type: 'Line', to: {x: -crop, y: crop}},
                              {type: 'Line', to: {x: crop, y: crop}},
                          ],
                      },
                  ]
                : undefined,
        ),
        +size * 2,
        flip !== pattern.tiling,
        {
            woven: search.get('woven') ? +search.get('woven')! : undefined,
            lines: search.get('lines') ? +search.get('lines')! : undefined,
            shapes: search.get('shapes') ? +search.get('shapes')! : undefined,
            margin: search.get('margin') ? +search.get('margin')! : undefined,
        },
    )!;

    const buffer = Buffer.from(rawBytes);
    pngCache[k] = buffer;
    return new Response(buffer, {headers: {'Content-type': 'image/png'}});
}
