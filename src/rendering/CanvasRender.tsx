import Prando from 'prando';
import { RoughCanvas } from 'roughjs/bin/canvas';
import { calcAllIntersections } from './calcAllIntersections';
import {
    calculateGuideElements,
    calculateInactiveGuideElements,
} from './calculateGuideElements';
import {
    AnimatedFunctions,
    evaluateAnimatedValues,
    imageCache,
} from '../editor/Canvas';
import { pathToPrimitives } from '../editor/findSelection';
import {
    getAnimatedPaths,
    getAnimationScripts,
} from '../animation/getAnimatedPaths';
import {
    angleTo,
    dist,
    getMirrorTransforms,
    push,
} from './getMirrorTransforms';
import { primitivesForElementsAndPaths } from '../editor/Guides';
import { Primitive } from './intersect';
import { isClockwise, pathToPoints, reversePath } from './pathToPoints';
import { calcPathD, idSeed, lightenedColor } from '../editor/RenderPath';
import { sortedVisibleInsetPaths } from './sortedVisibleInsetPaths';
import { ArcSegment, Overlay, Path, State } from '../types';

export const makeImage = (href: string): Promise<HTMLImageElement> => {
    return new Promise((res, rej) => {
        const img = new Image();
        img.src = href;
        img.onload = () => {
            res(img);
        };
        img.onerror = () => rej(new Error(`Failed to load image`));
    });
};

export const canvasRender = async (
    ctx: CanvasRenderingContext2D,
    state: State,
    sourceWidth: number,
    sourceHeight: number,
    extraZoom: number,
    animatedFunctions: AnimatedFunctions,
    animationPosition: number,
    backgroundAlpha?: number | null,
) => {
    const palette = state.palettes[state.activePalette];

    const images = await Promise.all(
        palette.map((c) =>
            c.startsWith('http') && imageCache[c]
                ? makeImage(imageCache[c] as string)
                : null,
        ),
    );

    const rough =
        state.view.sketchiness && state.view.sketchiness > 0
            ? new RoughCanvas(ctx.canvas)
            : null;

    const rand = new Prando('ok');

    const zoom = state.view.zoom * extraZoom;

    const xoff = sourceWidth / 2 + state.view.center.x * zoom;
    const yoff = sourceHeight / 2 + state.view.center.y * zoom;
    ctx.translate(xoff, yoff);

    if (state.view.background != null) {
        if (backgroundAlpha != null) {
            ctx.globalAlpha = backgroundAlpha;
        }
        const color =
            typeof state.view.background === 'number'
                ? palette[state.view.background]
                : state.view.background;
        if (color.startsWith('http')) {
            const img = images[state.view.background as number];
            if (img) {
                drawCenteredImage(img, sourceWidth, sourceHeight, ctx);
            }
        } else {
            ctx.fillStyle = color;
            ctx.fillRect(-xoff, -yoff, ctx.canvas.width, ctx.canvas.height);
        }
        ctx.globalAlpha = 1;
    } else {
        if (backgroundAlpha != null) {
            ctx.globalAlpha = backgroundAlpha;
        }
        ctx.clearRect(-xoff, -yoff, ctx.canvas.width, ctx.canvas.height);
        ctx.globalAlpha = 1;
    }

    const uids = Object.keys(state.overlays).filter(
        (id) => !state.overlays[id].hide && !state.overlays[id].over,
    );
    for (let id of uids) {
        const overlay = state.overlays[id];
        await renderOverlay(state, overlay, ctx);
    }

    const clip = state.view.activeClip
        ? state.clips[state.view.activeClip]
        : undefined;

    const currentAnimatedValues = evaluateAnimatedValues(
        animatedFunctions,
        animationPosition,
    );

    const scripts = getAnimationScripts(state);
    const animatedPaths = state.animations.timelines.some((t) => t.items.length)
        ? getAnimatedPaths(
              state,
              scripts,
              animationPosition,
              currentAnimatedValues,
          )
        : state.paths;

    sortedVisibleInsetPaths(
        animatedPaths,
        state.pathGroups,
        rand,
        clip,
    ).forEach((path) => {
        const style = path.style;

        style.fills.forEach((fill, i) => {
            if (!fill || fill.color == null) {
                return;
            }

            let pathInfos = [path];

            if (fill.inset) {
                throw new Error('inset');
            }

            let lighten = fill.lighten;

            const color = lightenedColor(palette, fill.color, lighten)!;

            if (fill.opacity != null) {
                ctx.globalAlpha = fill.opacity;
            }

            pathInfos.forEach((myPath) => {
                if (rough) {
                    if (!color.startsWith('http')) {
                        rough.path(calcPathD(myPath, zoom), {
                            fill: color,
                            fillStyle: 'solid',
                            stroke: 'none',
                            seed: idSeed(path.id),
                            roughness: state.view.sketchiness!,
                        });
                        ctx.globalAlpha = 1;
                        return;
                    } else {
                        const img = images[fill.color as number];
                        if (!img) {
                            return;
                        }
                        const data = rough.generator.path(
                            calcPathD(myPath, zoom),
                            {
                                fill: color,
                                fillStyle: 'solid',
                                stroke: 'none',
                                seed: idSeed(path.id),
                                roughness: state.view.sketchiness!,
                            },
                        );
                        rough.generator.toPaths(data).forEach((info) => {
                            const p2d = new Path2D(info.d);
                            ctx.save();
                            ctx.clip(p2d);
                            drawCenteredImage(
                                img,
                                sourceWidth,
                                sourceHeight,
                                ctx,
                            );
                            ctx.restore();
                        });
                        return;
                    }
                }

                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                ctx.beginPath();
                tracePath(ctx, myPath, zoom);

                if (color.startsWith('http')) {
                    const img = images[fill.color as number];
                    if (!img) {
                        ctx.closePath();
                        return;
                    }
                    ctx.save();
                    ctx.clip();

                    drawCenteredImage(img, sourceWidth, sourceHeight, ctx);
                    ctx.restore();
                } else {
                    ctx.fillStyle = color;
                    ctx.fill();
                }
            });

            ctx.globalAlpha = 1;
        });

        style.lines.forEach((line, i) => {
            if (!line || line.color == null || !line.width) {
                return;
            }

            if (line.opacity != null) {
                ctx.globalAlpha = line.opacity;
            }

            ctx.lineWidth = (line.width / 100) * zoom;
            ctx.lineJoin = 'bevel';
            ctx.lineCap = 'square';

            let myPath = path;
            const color = lightenedColor(palette, line.color, line.lighten)!;

            if (rough) {
                rough.path(calcPathD(myPath, zoom), {
                    fill: 'none',
                    fillStyle: 'solid',
                    stroke: color,
                    strokeWidth: (line.width / 100) * zoom,
                    seed: idSeed(path.id),
                    roughness: state.view.sketchiness!,
                });
                return;
            }

            if (color.startsWith('http')) {
                const img = images[line.color as number];
                if (!img) {
                    return;
                }
                ctx.save();
                ctx.beginPath();
                tracePathLine(ctx, myPath, zoom, line.width / 100);
                ctx.clip();
                drawCenteredImage(img, sourceWidth, sourceHeight, ctx);
                // ctx.drawImage(
                //     images[line.color as number]!,
                //     -500,
                //     -500,
                //     ctx.canvas.width,
                //     ctx.canvas.height,
                // );
                ctx.restore();

                // debugPath(myPath, ctx, zoom);
            } else {
                ctx.beginPath();
                tracePath(ctx, myPath, zoom);
                ctx.strokeStyle = color;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        });
    });

    const oids = Object.keys(state.overlays).filter(
        (id) => !state.overlays[id].hide && state.overlays[id].over,
    );
    for (let id of oids) {
        const overlay = state.overlays[id];
        await renderOverlay(state, overlay, ctx);
    }

    if (!state.view.guides) {
        return;
    }

    const mirrorTransforms = getMirrorTransforms(state.mirrors);
    const guideElements = calculateGuideElements(
        state.guides,
        mirrorTransforms,
    );
    const inativeGuideElements = calculateInactiveGuideElements(
        state.guides,
        mirrorTransforms,
    );
    // console.log(guideElements);

    const guidePrimitives = primitivesForElementsAndPaths(guideElements, []);
    const inativeGuidePrimitives = primitivesForElementsAndPaths(
        inativeGuideElements,
        [],
    );
    const allIntersections = calcAllIntersections(
        guidePrimitives.map((p) => p.prim),
    ).coords;

    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    inativeGuidePrimitives.forEach(({ prim }) => {
        renderPrimitive(ctx, prim, zoom, sourceHeight, sourceWidth);
    });
    guidePrimitives.forEach(({ prim }) => {
        renderPrimitive(ctx, prim, zoom, sourceHeight, sourceWidth);
    });
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.1;
    allIntersections.forEach((pos) => {
        ctx.beginPath();
        ctx.ellipse(
            pos.coord.x * zoom,
            pos.coord.y * zoom,
            5,
            5,
            0,
            0,
            Math.PI * 2,
        );
        ctx.fill();
    });

    ctx.globalAlpha = 1;

    if (clip) {
        ctx.strokeStyle = 'magenta';
        ctx.setLineDash([5, 15]);
        ctx.lineWidth = 10;
        pathToPrimitives(clip).forEach((prim) => {
            renderPrimitive(ctx, prim, zoom, sourceHeight, sourceWidth);
        });
    }
};

async function renderOverlay(
    state: State,
    overlay: Overlay,
    ctx: CanvasRenderingContext2D,
) {
    const attachment = state.attachments[overlay.source];

    const scale = Math.min(overlay.scale.x, overlay.scale.y);

    let iwidth = ((attachment.width * state.view.zoom) / 100) * scale;
    let iheight = ((attachment.height * state.view.zoom) / 100) * scale;

    const x = overlay.center.x * state.view.zoom;

    const y = overlay.center.y * state.view.zoom;

    const img = await makeImage(attachment.contents);

    ctx.globalAlpha = overlay.opacity;
    ctx.drawImage(img, -iwidth / 2 + x, -iheight / 2 + y, iwidth, iheight);
    ctx.globalAlpha = 1;
}

function drawCenteredImage(
    img: HTMLImageElement,
    sourceWidth: number,
    sourceHeight: number,
    ctx: CanvasRenderingContext2D,
) {
    const widthSmaller = img.naturalWidth < img.naturalHeight;
    const ratio = img.naturalWidth / img.naturalHeight;
    const targetWidth = widthSmaller ? sourceWidth : sourceHeight * ratio;
    const targetHeight = widthSmaller ? sourceWidth / ratio : sourceHeight;
    ctx.drawImage(
        img,
        -(sourceWidth / 2) - (targetWidth - sourceWidth) / 2,
        -(sourceHeight / 2) - (targetHeight - sourceHeight) / 2,
        targetWidth,
        targetHeight,
    );
}

function debugPath(path: Path, ctx: CanvasRenderingContext2D, zoom: number) {
    pathToPoints(path.segments).forEach((point) => {
        ctx.beginPath();
        ctx.ellipse(point.x * zoom, point.y * zoom, 10, 10, 0, Math.PI * 2, 0);
        ctx.fillStyle = 'blue';
        ctx.fill();
    });

    ctx.beginPath();
    ctx.ellipse(
        path.origin.x * zoom,
        path.origin.y * zoom,
        20,
        20,
        0,
        Math.PI * 2,
        0,
    );
    ctx.strokeStyle = isClockwise(path.segments) ? 'purple' : 'yellow';
    ctx.lineWidth = 4;
    ctx.stroke();

    const last = path.segments[path.segments.length - 2].to;

    ctx.beginPath();
    ctx.ellipse(last.x * zoom, last.y * zoom, 20, 20, 0, Math.PI * 2, 0);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 4;
    ctx.stroke();
}

export function renderPrimitive(
    ctx: CanvasRenderingContext2D,
    prim: Primitive,
    zoom: number,
    sourceHeight: number,
    sourceWidth: number,
) {
    ctx.beginPath();
    if (prim.type === 'line') {
        if (prim.m === Infinity) {
            if (prim.limit) {
                ctx.moveTo(prim.b * zoom, prim.limit[0] * zoom);
                ctx.lineTo(prim.b * zoom, prim.limit[1] * zoom);
            } else {
                ctx.moveTo(prim.b * zoom, -sourceHeight);
                ctx.lineTo(prim.b * zoom, sourceHeight);
            }
        } else {
            if (prim.limit) {
                ctx.moveTo(
                    prim.limit[0] * zoom,
                    prim.b * zoom + prim.m * (prim.limit[0] * zoom),
                );
                ctx.lineTo(
                    prim.limit[1] * zoom,
                    prim.m * (prim.limit[1] * zoom) + prim.b * zoom,
                );
            } else {
                ctx.moveTo(-sourceWidth, prim.b * zoom - prim.m * sourceWidth);
                ctx.lineTo(sourceWidth, prim.m * sourceWidth + prim.b * zoom);
            }
        }
    } else {
        const [t0, t1] = prim.limit || [0, Math.PI * 2];
        ctx.arc(
            prim.center.x * zoom,
            prim.center.y * zoom,
            prim.radius * zoom,
            t0,
            t1,
        );
    }
    ctx.stroke();
}

export function tracePath(
    ctx: CanvasRenderingContext2D,
    path: Path,
    zoom: number,
) {
    // ctx.lineJoin = 'round';
    // ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'square';
    if (
        path.segments.length === 1 &&
        path.segments[0].type === 'Arc' &&
        !path.open
    ) {
        const seg = path.segments[0] as ArcSegment;
        const radius = dist(seg.center, seg.to);
        ctx.arc(
            seg.center.x * zoom,
            seg.center.y * zoom,
            radius * zoom,
            0,
            Math.PI * 2,
            false,
        );
        return;
    }
    ctx.moveTo(path.origin.x * zoom, path.origin.y * zoom);
    path.segments.forEach((seg, i) => {
        if (seg.type === 'Line') {
            ctx.lineTo(seg.to.x * zoom, seg.to.y * zoom);
        } else {
            const radius = dist(seg.center, seg.to);
            const t0 = angleTo(
                seg.center,
                i === 0 ? path.origin : path.segments[i - 1].to,
            );
            const t1 = angleTo(seg.center, seg.to);
            ctx.arc(
                seg.center.x * zoom,
                seg.center.y * zoom,
                radius * zoom,
                t0,
                t1,
                !seg.clockwise,
            );
        }
    });
    if (!path.open) {
        ctx.closePath();
    }
}

// This is used for making a "clip" to the line of a path.
// for when the stroke is supposed to be an image.
export function tracePathLine(
    ctx: CanvasRenderingContext2D,
    path: Path,
    zoom: number,
    strokeWidth: number,
) {
    if (!isClockwise(path.segments)) {
        path = { ...path, segments: reversePath(path.segments) };
    }

    ctx.moveTo(path.origin.x * zoom, path.origin.y * zoom);
    ctx.ellipse(
        path.origin.x * zoom,
        path.origin.y * zoom,
        (strokeWidth / 2) * zoom,
        (strokeWidth / 2) * zoom,
        0,
        0,
        Math.PI * 2,
        // true,
    );

    path.segments.forEach((seg, i) => {
        const prev = i > 0 ? path.segments[i - 1].to : path.origin;
        if (seg.type === 'Line') {
            const t = angleTo(prev, seg.to);
            const p1 = push(prev, t + Math.PI / 2, strokeWidth / 2);
            const p2 = push(prev, t - Math.PI / 2, strokeWidth / 2);
            const p3 = push(seg.to, t + Math.PI / 2, strokeWidth / 2);
            const p4 = push(seg.to, t - Math.PI / 2, strokeWidth / 2);
            ctx.moveTo(p1.x * zoom, p1.y * zoom);
            ctx.lineTo(p2.x * zoom, p2.y * zoom);
            ctx.lineTo(p4.x * zoom, p4.y * zoom);
            ctx.lineTo(p3.x * zoom, p3.y * zoom);
            ctx.lineTo(p1.x * zoom, p1.y * zoom);
        } else {
            const radius = dist(seg.center, seg.to);
            const t0 = angleTo(seg.center, prev);
            const t1 = angleTo(seg.center, seg.to);
            const p1 = push(seg.center, t0, radius - strokeWidth / 2);
            const p2 = push(seg.center, t0, radius + strokeWidth / 2);
            const p3 = push(seg.center, t1, radius + strokeWidth / 2);
            const p4 = push(seg.center, t1, radius - strokeWidth / 2);
            ctx.moveTo(p1.x * zoom, p1.y * zoom);
            ctx.lineTo(p2.x * zoom, p2.y * zoom);
            ctx.arc(
                seg.center.x * zoom,
                seg.center.y * zoom,
                (radius + strokeWidth / 2) * zoom,
                t0,
                t1,
                !seg.clockwise,
            );
            ctx.lineTo(p3.x * zoom, p3.y * zoom);
            ctx.lineTo(p4.x * zoom, p4.y * zoom);

            ctx.arc(
                seg.center.x * zoom,
                seg.center.y * zoom,
                (radius - strokeWidth / 2) * zoom,
                t1,
                t0,
                seg.clockwise,
            );
            ctx.lineTo(p1.x * zoom, p1.y * zoom);
        }
        ctx.moveTo(seg.to.x * zoom, seg.to.y * zoom);
        ctx.ellipse(
            seg.to.x * zoom,
            seg.to.y * zoom,
            (strokeWidth / 2) * zoom,
            (strokeWidth / 2) * zoom,
            0,
            0,
            Math.PI * 2,
            // true,
        );
    });
}
