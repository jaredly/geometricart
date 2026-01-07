import {renderToStaticMarkup} from 'react-dom/server';
import {pk} from '../../../pk';
import {colorToString} from '../utils/colors';
import {RenderItem} from '../eval/evaluate';
import {Box, Color} from '../export-types';
import {ExportSettings} from '../FrameExport';
import {renderItems} from './renderItems';
import {generateSvgItems} from '../generateSvgItems';

export const runSVGExport = (ex: ExportSettings, box: Box, items: RenderItem[], bg: Color) => {
    const lw = box.width / 10;
    const svgItems = generateSvgItems(
        items.filter((i) => i.type === 'path'),
        null,
        lw,
    );

    const text = renderToStaticMarkup(
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`${box.x.toFixed(7)} ${box.y.toFixed(7)} ${box.width.toFixed(7)} ${box.height.toFixed(7)}`}
            style={{background: colorToString(bg)}}
            width={ex.size}
            height={ex.size}
        >
            {svgItems}
        </svg>,
    );

    return new Blob([text], {type: 'image/svg+xml'});
};

export const runPNGExport = (size: number, box: Box, items: RenderItem[], bg: Color) => {
    const canvas = new OffscreenCanvas(size, size);
    const surface = pk.MakeWebGLCanvasSurface(canvas)!;

    renderItems(surface, box, items, bg);
    const img = surface.makeImageSnapshot();
    const bytes = img.encodeToBytes(pk.ImageFormat.PNG)!;
    surface.delete();
    return new Blob([bytes as BlobPart], {type: 'image/png'});
};
