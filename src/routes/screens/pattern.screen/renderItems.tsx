import {Surface, ImageFilter} from 'canvaskit-wasm';
import {pk} from '../../pk';
import {segmentsCmds} from '../animator.screen/cropPath';
import {RenderItem} from './evaluate';
import {Box, Color, colorToRgb} from './export-types';

export const renderItems = (
    surface: Surface,
    box: Box,
    items: RenderItem[],
    bg: Color,
    fontBuffer?: ArrayBuffer,
    t?: number,
) => {
    const ctx = surface.getCanvas();
    const bgc = colorToRgb(bg);
    ctx.clear(pk.Color(bgc.r, bgc.g, bgc.b));

    ctx.save();
    ctx.scale(surface.width() / box.width, surface.height() / box.height);
    ctx.translate(-box.x, -box.y);
    items.forEach((item) => {
        if (item.type === 'point') {
            return;
        }
        const pkp =
            item.pk ??
            pk.Path.MakeFromCmds(
                item.shapes.flatMap((shape) =>
                    segmentsCmds(shape.origin, shape.segments, shape.open),
                ),
            )!;
        const paint = new pk.Paint();
        paint.setAntiAlias(true);
        if (item.strokeWidth == null) {
            paint.setStyle(pk.PaintStyle.Fill);
            paint.setColor([item.color.r / 255, item.color.g / 255, item.color.b / 255]);
        } else if (item.strokeWidth) {
            paint.setStyle(pk.PaintStyle.Stroke);
            paint.setStrokeWidth(item.strokeWidth!);
            paint.setColor([item.color.r / 255, item.color.g / 255, item.color.b / 255]);
        } else {
            return;
        }

        let imf: null | ImageFilter = null;
        if (item.shadow) {
            imf = pk.ImageFilter.MakeDropShadow(
                // 0,
                // 0,
                item.shadow.offset.x,
                item.shadow.offset.y,
                item.shadow.blur.x,
                item.shadow.blur.y,
                // 0.01,
                // 0.01,
                pk.Color(item.shadow.color.r, item.shadow.color.g, item.shadow.color.b),
                null,
            );
            paint.setImageFilter(imf);
        }

        if (item.opacity != null) {
            paint.setAlphaf(item.opacity);
        }
        ctx.drawPath(pkp, paint);
        paint.delete();
        if (!item.pk) {
            pkp.delete();
        }
        // if (imf != null) imf.delete();
    });
    ctx.restore();

    if (fontBuffer && t != null) {
        // console.log('darwingg');
        const fontMgr = pk.FontMgr.FromData(fontBuffer)!;
        const typeface = fontMgr.matchFamilyStyle('Roboto', {
            weight: pk.FontWeight.Bold,
        });

        const font = new pk.Font(typeface, 100);
        const paint = new pk.Paint();
        paint.setColor(pk.BLACK);
        paint.setStyle(pk.PaintStyle.Stroke);
        paint.setStrokeWidth(10);

        const text = `t = ${t.toFixed(4)}`; //'Hello CanvasKit';
        const widths = font.getGlyphWidths(font.getGlyphIDs(text));
        const w = [...widths].reduce((a, b) => a + b);

        ctx.drawText(text, surface.width() / 2 - w / 2, surface.height() / 2, paint, font);

        paint.setColor(pk.WHITE);
        paint.setStyle(pk.PaintStyle.Fill);
        ctx.drawText(text, surface.width() / 2 - w / 2, surface.height() / 2, paint, font);
    }
    // const font = new pk.Font();
    // pk.FontMgr
    // font.setSize(10);
    // ctx.drawText('hello', surface.width() / 2, surface.height() / 2, paint, font);

    surface.flush();
};
