import {ImageFilter, Surface} from 'canvaskit-wasm';
import {cmdsForCoords} from '../../getPatternData';
import {pk} from '../../pk';
import {generateVideo} from '../animator.screen/muxer';
import {Patterns, Ctx, RenderItem} from './evaluate';
import {State, Box, Color, colorToRgb} from './export-types';
import {svgItems} from './resolveMods';

export const recordVideo = async (
    state: State,
    size: number,
    box: Box,
    patterns: Patterns,
    duration: number,
    onStatus: {current: HTMLElement | null},
    cropCache: Ctx['cropCache'],
) => {
    const canvas = new OffscreenCanvas(size * 2, size * 2);
    const frameRate = 24;
    // const step = 0.01;
    const totalFrames = frameRate * duration;

    const animCache = new Map();

    const blob = await generateVideo(canvas, frameRate, totalFrames, (_, currentFrame) => {
        if (currentFrame % 10 === 0)
            onStatus.current!.textContent = ((currentFrame / totalFrames) * 100).toFixed(0) + '%';
        const surface = pk.MakeWebGLCanvasSurface(canvas)!;

        const {items, bg} = svgItems(
            state,
            animCache,
            cropCache,
            patterns,
            currentFrame / totalFrames,
            null,
        );
        renderItems(surface, box, items, bg);
    });
    onStatus.current!.textContent = '';
    return blob ? URL.createObjectURL(blob) : null;
};

export const renderItems = (surface: Surface, box: Box, items: RenderItem[], bg: Color) => {
    const ctx = surface.getCanvas();
    const bgc = colorToRgb(bg);
    ctx.clear(pk.Color(bgc.r, bgc.g, bgc.b));

    ctx.save();
    ctx.scale(surface.width() / box.width, surface.height() / box.height);
    ctx.translate(-box.x, -box.y);
    items.forEach((item) => {
        const pkp =
            item.pk ??
            pk.Path.MakeFromCmds(item.shapes.flatMap((shape) => cmdsForCoords(shape, false)))!;
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
                item.shadow.offset.x,
                item.shadow.offset.y,
                item.shadow.blur.x,
                item.shadow.blur.y,
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
    surface.flush();
};
