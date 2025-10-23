import {renderToStaticMarkup} from 'react-dom/server';
import type {Route} from './+types/pattern-svg';
import {getPattern} from './db.server';
import {canvasTiling} from './canvasTiling';
import {getPatternData} from './getPatternData';
import {TilingPattern} from './ShowTiling';
import {flipPattern} from './shapesFromSegments';

const pngCache: Record<string, Buffer<ArrayBuffer>> = {};

export async function loader({params}: Route.LoaderArgs) {
    if (!params.id) {
        return null;
    }
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
    if (pngCache[k]) {
        return new Response(pngCache[k], {headers: {'Content-type': 'image/png'}});
    }

    const flip = flipPattern(pattern.tiling);
    const dataUri = canvasTiling(getPatternData(flip), size * 2);
    // return dataUri;
    const [mime, data] = dataUri.split(',');
    const buffer = Buffer.from(data, 'base64');
    pngCache[k] = buffer;
    return new Response(buffer, {headers: {'Content-type': 'image/png'}});
}
