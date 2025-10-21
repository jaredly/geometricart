import {renderToStaticMarkup} from 'react-dom/server';
import type {Route} from './+types/pattern-svg';
import {getPattern} from './db.server';
import {canvasTiling} from './canvasTiling';
import {getPatternData} from './getPatternData';
import {TilingPattern} from './ShowTiling';

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
            <TilingPattern size={size} data={getPatternData(pattern.tiling)} />,
        );
        return new Response(tiling, {headers: {'Content-Type': 'image/svg+xml'}});
    }

    const dataUri = canvasTiling(getPatternData(pattern.tiling), size * 2);
    // return dataUri;
    const [mime, data] = dataUri.split(',');
    return new Response(Buffer.from(data, 'base64'), {headers: {'Content-type': 'image/png'}});
}
