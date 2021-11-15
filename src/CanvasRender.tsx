import { calcAllIntersections } from './calcAllIntersections';
import {
    calculateGuideElements,
    calculateInactiveGuideElements,
} from './calculateGuideElements';
import {
    imageCache,
    primitivesForElements,
    sortedVisiblePaths,
} from './Canvas';
import {
    angleTo,
    dist,
    getMirrorTransforms,
    push,
} from './getMirrorTransforms';
import { Primitive } from './intersect';
import { combinedPathStyles } from './RenderPath';
import { Coord, Path, State } from './types';

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
) => {
    const palette = state.palettes[state.activePalette];

    // um yeah we're just assuming 1000 w/h
    const sourceWidth = 1000;
    const sourceHeight = 1000;

    const zoom = state.view.zoom;
    if (state.view.background) {
        ctx.fillStyle = state.view.background;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    ctx.translate(
        sourceWidth / 2 + state.view.center.x * zoom,
        sourceHeight / 2 + state.view.center.y * zoom,
    );
    // ctx.translate(100, 100);

    const images = await Promise.all(
        palette.map((c) =>
            c.startsWith('http') && imageCache[c]
                ? makeImage(imageCache[c] as string)
                : null,
        ),
    );

    sortedVisiblePaths(state).forEach((k) => {
        const path = state.paths[k];
        const style = combinedPathStyles(path, state.pathGroups);

        style.fills.forEach((fill, i) => {
            if (!fill || fill.color == null) {
                return;
            }

            ctx.beginPath();
            tracePath(ctx, path, zoom);

            if (fill.opacity != null) {
                ctx.globalAlpha = fill.opacity;
            }

            const color =
                typeof fill.color === 'number'
                    ? palette[fill.color]
                    : fill.color;
            if (color.startsWith('http')) {
                const img = images[fill.color as number];
                if (!img) {
                    ctx.closePath();
                    return;
                }
                ctx.save();
                ctx.clip();

                const widthSmaller = img.naturalWidth < img.naturalHeight;
                const ratio = img.naturalWidth / img.naturalHeight;
                const targetWidth = widthSmaller
                    ? sourceWidth
                    : sourceHeight * ratio;
                const targetHeight = widthSmaller
                    ? sourceWidth / ratio
                    : sourceHeight;
                // img.naturalHeight
                // img.naturalWidth
                ctx.drawImage(
                    img,
                    -(sourceWidth / 2) - (targetWidth - sourceWidth) / 2,
                    -(sourceHeight / 2) - (targetHeight - sourceHeight) / 2,
                    targetWidth,
                    targetHeight,
                );
                ctx.restore();
            } else {
                ctx.fillStyle = color;
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        });

        style.lines.forEach((line, i) => {
            if (!line || line.color == null || !line.width) {
                return;
            }

            // if (line.opacity != null) {
            //     ctx.globalAlpha = line.opacity;
            // }

            ctx.lineWidth = (line.width / 100) * zoom;

            const color =
                typeof line.color === 'number'
                    ? palette[line.color]
                    : line.color;
            if (color.startsWith('http')) {
                ctx.save();
                ctx.beginPath();
                tracePathLine(ctx, path, zoom, line.width / 100);
                ctx.clip();
                ctx.drawImage(
                    images[line.color as number]!,
                    -500,
                    -500,
                    ctx.canvas.width,
                    ctx.canvas.height,
                );
                ctx.restore();
            } else {
                ctx.beginPath();
                tracePath(ctx, path, zoom);
                ctx.strokeStyle = color;
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        });
    });

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

    const guidePrimitives = primitivesForElements(guideElements);
    const inativeGuidePrimitives = primitivesForElements(inativeGuideElements);
    const allIntersections = calcAllIntersections(
        guidePrimitives.map((p) => p.prim),
    );

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
};

function renderPrimitive(
    ctx: CanvasRenderingContext2D,
    prim: Primitive,
    zoom: number,
    sourceHeight: number,
    sourceWidth: number,
) {
    ctx.beginPath();
    if (prim.type === 'line') {
        if (prim.m === Infinity) {
            ctx.moveTo(prim.b * zoom, -sourceHeight);
            ctx.lineTo(prim.b * zoom, sourceHeight);
        } else {
            ctx.moveTo(-sourceWidth, prim.b * zoom - prim.m * sourceWidth);
            ctx.lineTo(sourceWidth, prim.m * sourceWidth + prim.b * zoom);
        }
    } else {
        ctx.arc(
            prim.center.x * zoom,
            prim.center.y * zoom,
            prim.radius * zoom,
            0,
            Math.PI * 2,
        );
    }
    ctx.stroke();
}

export function tracePath(
    ctx: CanvasRenderingContext2D,
    path: Path,
    zoom: number,
) {
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
}

export function tracePathLine(
    ctx: CanvasRenderingContext2D,
    path: Path,
    zoom: number,
    strokeWidth: number,
) {
    ctx.moveTo(path.origin.x * zoom, path.origin.y * zoom);
    ctx.ellipse(
        path.origin.x * zoom,
        path.origin.y * zoom,
        (strokeWidth / 2) * zoom,
        (strokeWidth / 2) * zoom,
        0,
        0,
        Math.PI * 2,
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
            ctx.arc(
                seg.center.x * zoom,
                seg.center.y * zoom,
                (radius - strokeWidth / 2) * zoom,
                t0,
                t1,
                !seg.clockwise,
            );
            ctx.lineTo(p3.x * zoom, p3.y * zoom);
            ctx.arc(
                seg.center.x * zoom,
                seg.center.y * zoom,
                (radius + strokeWidth / 2) * zoom,
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
        );
    });
}
