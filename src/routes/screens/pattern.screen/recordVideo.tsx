import {cmdsForCoords} from '../../getPatternData';
import {pk} from '../../pk';
import {generateVideo} from '../animator.screen/muxer';
import {Patterns, Ctx} from './evaluate';
import {State, Box} from './export-types';
import {svgItems} from './resolveMods';
import {pkPathWithCmds} from '../animator.screen/cropPath';
import {renderItems} from './renderItems';

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

    const fontData = await fetch('/assets/Roboto-Regular.ttf').then((r) => r.arrayBuffer());

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
        );
        const debugTime = false;
        if (debugTime) {
            renderItems(surface, box, items, bg, fontData, currentFrame / totalFrames);
        } else {
            renderItems(surface, box, items, bg);
        }
        // const ctx = surface.getCanvas();
        // const paint = new pk.Paint();
        // paint.setColor(pk.RED);
        // paint.setStyle(pk.PaintStyle.Fill);
        // const font = new pk.Font();
        // // font.setSize()
        // ctx.drawText(currentFrame / totalFrames + '', size / 2, size / 2, paint, font);
        // surface.flush();
    });
    onStatus.current!.textContent = '';
    return blob ? URL.createObjectURL(blob) : null;
};
