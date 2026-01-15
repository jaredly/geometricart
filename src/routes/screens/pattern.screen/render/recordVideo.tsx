import {cmdsForCoords} from '../../../getPatternData';
import {pk} from '../../../pk';
import {generateVideo} from '../../animator.screen/muxer';
import {Ctx} from '../eval/evaluate';
import {Box} from '../export-types';
import {State} from '../types/state-type';
import {svgItems} from './svgItems';
import {pkPathWithCmds} from '../../animator.screen/cropPath';
import {renderItems} from './renderItems';

export const getConstrainedSurface = (node: HTMLCanvasElement | OffscreenCanvas) => {
    const MB = 1024 * 1024;

    // 1) Create WebGL context handle with explicit opts (important!)
    const glHandle = pk.GetWebGLContext(node, {
        antialias: 0, // avoid MSAA + Skia AA double-whammy
        stencil: 1,
        depth: 0,
        alpha: 1,
    });

    // 2) Create GrDirectContext
    const grContext = pk.MakeWebGLContext(glHandle)!;

    // 3) Cap Skia’s GPU resource cache
    grContext.setResourceCacheLimitBytes(256 * MB); // try 128–512MB

    // 4) Create the onscreen surface
    return {
        surface: pk.MakeOnScreenGLSurface(grContext, node.width, node.height, pk.ColorSpace.SRGB),
        grc: grContext,
    };
};

export const recordVideo = async (
    state: State,
    size: number,
    box: Box,
    duration: number,
    onStatus: (progress: number) => void,
    cropCache: Ctx['cropCache'],
    frameRate = 24,
) => {
    const canvas = new OffscreenCanvas(size * 2, size * 2);
    const totalFrames = frameRate * duration;

    const animCache = new Map();

    const fontData = await fetch('/assets/Roboto-Regular.ttf').then((r) => r.arrayBuffer());

    // const {items, bg} = svgItems(state, animCache, cropCache, 0);
    const {surface, grc} = getConstrainedSurface(canvas);

    let last = Date.now();
    const blob = await generateVideo(canvas, frameRate, totalFrames, (_, currentFrame) => {
        let now = Date.now();
        if (now - last > 200) {
            last = now;
            onStatus(currentFrame / totalFrames);
        }
        // surface.get

        // // if (currentFrame % 10 === 0)
        const {items, bg} = svgItems(state, animCache, cropCache, currentFrame / totalFrames);
        const debugTime = false;
        if (debugTime) {
            renderItems(surface!, box, items, bg, fontData, currentFrame / totalFrames);
        } else {
            renderItems(surface!, box, items, bg);
        }
    });
    surface?.delete();
    grc.releaseResourcesAndAbandonContext();
    return blob;
};
