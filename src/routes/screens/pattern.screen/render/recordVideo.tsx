import {cmdsForCoords} from '../../../getPatternData';
import {pk} from '../../../pk';
import {generateVideo} from '../../animator.screen/muxer';
import {Ctx} from '../eval/evaluate';
import {Box} from '../export-types';
import {State} from '../types/state-type';
import {svgItems} from './svgItems';
import {pkPathWithCmds} from '../../animator.screen/cropPath';
import {renderItems} from './renderItems';

export const recordVideo = async (
    state: State,
    size: number,
    box: Box,
    duration: number,
    onStatus: (progress: number) => void,
    cropCache: Ctx['cropCache'],
) => {
    const canvas = new OffscreenCanvas(size * 2, size * 2);
    const frameRate = 24;
    // const step = 0.01;
    const totalFrames = frameRate * duration;

    const animCache = new Map();

    const fontData = await fetch('/assets/Roboto-Regular.ttf').then((r) => r.arrayBuffer());

    let last = Date.now();
    const blob = await generateVideo(canvas, frameRate, totalFrames, (_, currentFrame) => {
        let now = Date.now();
        if (now - last > 200) {
            last = now;
            onStatus(currentFrame / totalFrames);
        }
        // if (currentFrame % 10 === 0)
        const surface = pk.MakeWebGLCanvasSurface(canvas)!;

        const {items, bg} = svgItems(state, animCache, cropCache, currentFrame / totalFrames);
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
    return blob ? URL.createObjectURL(blob) : null;
};
