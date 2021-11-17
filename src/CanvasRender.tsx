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
import { angleBetween } from './findNextSegments';
import {
    angleTo,
    dist,
    getMirrorTransforms,
    push,
} from './getMirrorTransforms';
import { Primitive } from './intersect';
import { reverseSegment } from './pathsAreIdentical';
import { combinedPathStyles, insetPath } from './RenderPath';
import { Coord, Overlay, Path, Segment, State } from './types';

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

    const images = await Promise.all(
        palette.map((c) =>
            c.startsWith('http') && imageCache[c]
                ? makeImage(imageCache[c] as string)
                : null,
        ),
    );

    const zoom = state.view.zoom;

    const xoff = sourceWidth / 2 + state.view.center.x * zoom;
    const yoff = sourceHeight / 2 + state.view.center.y * zoom;
    ctx.translate(xoff, yoff);

    if (state.view.background) {
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
    }

    const uids = Object.keys(state.overlays).filter(
        (id) => !state.overlays[id].hide && !state.overlays[id].over,
    );
    for (let id of uids) {
        const overlay = state.overlays[id];
        await renderOverlay(state, overlay, ctx);
    }

    sortedVisiblePaths(state).forEach((k) => {
        const path = state.paths[k];
        const style = combinedPathStyles(path, state.pathGroups);

        style.fills.forEach((fill, i) => {
            if (!fill || fill.color == null) {
                return;
            }

            let myPath = path;
            if (fill.inset) {
                myPath = insetPath(path, fill.inset / 100);
            }

            ctx.beginPath();
            tracePath(ctx, myPath, zoom);

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

                drawCenteredImage(img, sourceWidth, sourceHeight, ctx);
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

            // TODO line opacity probably
            // if (line.opacity != null) {
            //     ctx.globalAlpha = line.opacity;
            // }

            ctx.lineWidth = (line.width / 100) * zoom;

            const color =
                typeof line.color === 'number'
                    ? palette[line.color]
                    : line.color;
            if (color.startsWith('http')) {
                const img = images[line.color as number];
                if (!img) {
                    return;
                }
                ctx.save();
                ctx.beginPath();
                tracePathLine(ctx, path, zoom, line.width / 100);
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

                // debugPath(path, ctx, zoom);
            } else {
                ctx.beginPath();
                tracePath(ctx, path, zoom);
                ctx.strokeStyle = color;
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
    pathToPoints(path).forEach((point) => {
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
    ctx.strokeStyle = isClockwise(path) ? 'purple' : 'yellow';
    ctx.lineWidth = 4;
    ctx.stroke();

    const last = path.segments[path.segments.length - 2].to;

    ctx.beginPath();
    ctx.ellipse(last.x * zoom, last.y * zoom, 20, 20, 0, Math.PI * 2, 0);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 4;
    ctx.stroke();
}

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
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
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
    ctx.closePath();
}

export const pathToPoints = (path: Path) => {
    const points: Array<Coord> = [];
    let prev = path.origin;
    path.segments.forEach((seg) => {
        if (seg.type === 'Arc') {
            const t1 = angleTo(seg.center, prev);
            const t2 = angleTo(seg.center, seg.to);
            const bt = angleBetween(t1, t2, seg.clockwise);
            const tm = t1 + (bt / 2) * (seg.clockwise ? 1 : -1); // (t1 + t2) / 2;
            const d = dist(seg.center, seg.to);
            const midp = push(seg.center, tm, d);
            points.push(midp);
        }
        points.push(seg.to);

        prev = seg.to;
    });
    return points;
};

export const isClockwise = (path: Path) => {
    const points = pathToPoints(path);
    const angles = points.map((point, i) => {
        const prev = i === 0 ? points[points.length - 1] : points[i - 1];
        return angleTo(prev, point);
    });
    const betweens = angles.map((angle, i) => {
        const prev = i === 0 ? angles[angles.length - 1] : angles[i - 1];
        return angleBetween(prev, angle, true);
    });
    const relatives = betweens.map((between) =>
        between > Math.PI ? between - Math.PI * 2 : between,
    );
    let total = relatives.reduce((a, b) => a + b);
    // betweens.forEach((between) => {
    //     if (between > Math.PI) {
    //         total -= Math.PI * 2 - between;
    //     } else {
    //         total += between;
    //     }
    // });
    // points.forEach((point, i) => {
    // 	if (i == 0) {
    // 		return
    // 	}
    // 	const prev = i === 0 ? points[i - 1]
    // })
    // console.log(`Total`, [
    //     toDegrees(total),
    //     angles.map(toDegrees),
    //     betweens.map(toDegrees),
    //     relatives.map(toDegrees),
    //     points,
    //     toDegrees(angles.reduce((x, m) => x + m)),
    //     toDegrees(betweens.reduce((x, m) => x + m)),
    // ]);
    // really, it'll be -2pi or 2pi
    return total > 0;
};

export const toDegrees = (x: number) => Math.floor((x / Math.PI) * 180);

export const reversePath = (path: Path) => {
    const segments: Array<Segment> = [];
    for (let i = path.segments.length - 1; i >= 0; i--) {
        const seg = path.segments[i];
        const prev = i === 0 ? path.origin : path.segments[i - 1].to;
        segments.push(reverseSegment(prev, seg));
    }
    return { ...path, segments };
};

export function tracePathLine(
    ctx: CanvasRenderingContext2D,
    path: Path,
    zoom: number,
    strokeWidth: number,
) {
    if (!isClockwise(path)) {
        path = reversePath(path);
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
