import {Surface, ImageFilter} from 'canvaskit-wasm';
import {pk} from '../../../pk';
import {segmentsCmds} from '../../animator.screen/cropPath';
import {RenderItem} from '../eval/evaluate';
import {Box, Color, colorToRgb} from '../export-types';
import {Coord} from '../../../../types';
import {pkPathFromCoords} from '../../../getPatternData';
import {scaleMatrix, translationMatrix} from '../../../../rendering/getMirrorTransforms';
import {mapSegment, transformBarePath} from '../../../../rendering/points';
import {truncateCoord, truncateShape} from '../utils/adjustShapes';

export const renderItems = (
    surface: Surface,
    box: Box,
    items: RenderItem[],
    bg: Color | null,
    fontBuffer?: ArrayBuffer,
    t?: number,
) => {
    const ctx = surface.getCanvas();
    const bgc = bg ? colorToRgb(bg) : {r: 0, g: 0, b: 0};
    ctx.clear(pk.Color(bgc.r, bgc.g, bgc.b));

    const paint = new pk.Paint();
    paint.setAntiAlias(true);
    paint.setColor([1, 0, 0]);
    paint.setAlphaf(0.1);
    ctx.drawCircle((t ?? 0) * surface.width(), (t ?? 0) * surface.height(), 10, paint);

    ctx.save();
    // ctx.scale(surface.width() / box.width, surface.height() / box.height);
    // ctx.translate(-box.x, -box.y);

    const item: RenderItem = {
        type: 'path',
        key: 'fill-0-0',
        color: {
            r: 0,
            g: 57,
            b: 117,
        },
        opacity: -0.029999999999999995,
        shapes: [
            {
                segments: [
                    {
                        type: 'Line',
                        to: {
                            x: -0.5,
                            y: 6.639528274536133,
                        },
                    },
                    {
                        type: 'Line',
                        to: {
                            x: -0.3333333134651184,
                            y: 6.928203105926514,
                        },
                    },
                    {
                        type: 'Line',
                        to: {
                            x: -3.6666667461395264,
                            y: 6.928203105926514,
                        },
                    },
                    // {
                    //     type: 'Line',
                    //     to: {
                    //         x: -3.5,
                    //         y: 6.639528274536133,
                    //     },
                    // },
                    // {
                    //     type: 'Line',
                    //     to: {
                    //         x: -3.3333332538604736,
                    //         y: 6.350852966308594,
                    //     },
                    // },
                    // {
                    //     type: 'Line',
                    //     to: {
                    //         x: -3.1666667461395264,
                    //         y: 6.062177658081055,
                    //     },
                    // },
                    // {
                    //     type: 'Line',
                    //     to: {
                    //         x: -3,
                    //         y: 5.773502826690674,
                    //     },
                    // },
                    // {
                    //     type: 'Line',
                    //     to: {
                    //         x: -2.8333332538604736,
                    //         y: 5.484827518463135,
                    //     },
                    // },
                    // {
                    //     type: 'Line',
                    //     to: {
                    //         x: -1.1666666269302368,
                    //         y: 5.484827518463135,
                    //     },
                    // },
                    // {
                    //     type: 'Line',
                    //     to: {
                    //         x: -1,
                    //         y: 5.773502826690674,
                    //     },
                    // },
                    // {
                    //     type: 'Line',
                    //     to: {
                    //         x: -0.8333333134651184,
                    //         y: 6.062177658081055,
                    //     },
                    // },
                    // {
                    //     type: 'Line',
                    //     to: {
                    //         x: -0.6666666865348816,
                    //         y: 6.350852966308594,
                    //     },
                    // },
                ],
                origin: {
                    x: -0.6666666865348816,
                    y: 6.350852966308594,
                },
            },
        ],
    };

    const sx = surface.width() / box.width;
    const sy = surface.height() / box.height;
    const tx = [translationMatrix({x: -box.x, y: -box.y}), scaleMatrix(sx, sy)];
    for (let i = 0; i < items.length; i++) {
        // const item = items[0];
        // if (item.type === 'point') {
        //     continue;
        // }
        const pkp2 = pk.Path.MakeFromCmds(
            item.shapes
                .map((shape) => transformBarePath(shape, tx))
                .map((shape) => ({
                    ...shape,
                    origin: truncateCoord(shape.origin, 1000),
                    segments: shape.segments.map((seg) =>
                        mapSegment(seg, (pos) => truncateCoord(pos, 1000)),
                    ),
                }))
                .flatMap((shape) => segmentsCmds(shape.origin, shape.segments, shape.open)),
        );
        if (!pkp2) continue;
        // pkp2.transform(scaleMatrix(sx, sy));
        // pkp2.transform(translationMatrix({x: -box.x * sx, y: -box.y * sy}));
        // const item = items[0];

        // const pts: Coord[] = [];
        // for (let i = 0; i < 10; i++) {
        //     const x = Math.random() * box.width + box.x;
        //     const y = Math.random() * box.height + box.y;
        //     pts.push({x, y});
        // }
        // const pkp = pkPathFromCoords(pts);
        // ctx.drawCircle(x, y, 100, paint);
        if (pkp2) {
            ctx.drawPath(pkp2, paint);
        }
        // pkp?.delete();
        pkp2?.delete();
    }

    ctx.restore();

    // const lw = box.width / 10;
    // ctx.save();
    // ctx.scale(surface.width() / box.width, surface.height() / box.height);
    // ctx.translate(-box.x, -box.y);

    // items.forEach((item) => {
    //     if (item.type === 'point') {
    //         return;
    //     }
    //     const pkp = pk.Path.MakeFromCmds(
    //         item.shapes.flatMap((shape) =>
    //             shape.origin ? segmentsCmds(shape.origin, shape.segments, shape.open) : [],
    //         ),
    //     );
    //     if (!pkp) return;
    //     ctx.drawPath(pkp, paint);
    //     pkp?.delete();
    // });

    // items.forEach((item) => {
    //     if (item.type === 'point') {
    //         return;
    //     }
    //     const pkp =
    //         // item.pk ??
    //         pk.Path.MakeFromCmds(
    //             item.shapes.flatMap((shape) =>
    //                 shape.origin ? segmentsCmds(shape.origin, shape.segments, shape.open) : [],
    //             ),
    //         );
    //     if (!pkp) {
    //         console.log('bad path somehow');
    //         return;
    //     }
    //     if (!(pkp instanceof pk.Path)) {
    //         console.log('not instance', pkp);
    //         return;
    //     }
    //     const paint = new pk.Paint();
    //     paint.setAntiAlias(true);
    //     if (item.strokeWidth == null) {
    //         paint.setStyle(pk.PaintStyle.Fill);
    //         paint.setColor([item.color.r / 255, item.color.g / 255, item.color.b / 255]);
    //     } else if (item.strokeWidth) {
    //         paint.setStyle(pk.PaintStyle.Stroke);
    //         paint.setStrokeWidth(item.strokeWidth! * (item.adjustForZoom ? lw : 1));
    //         paint.setColor([item.color.r / 255, item.color.g / 255, item.color.b / 255]);
    //     } else {
    //         pkp.delete();
    //         return;
    //     }

    //     if (item.opacity != null) {
    //         paint.setAlphaf(item.opacity);
    //     }

    //     if (item.shadow) {
    //         const amt = Math.max(item.shadow.blur.x, item.shadow.blur.y);
    //         const shadowPaint = paint.copy();
    //         shadowPaint.setMaskFilter(
    //             pk.MaskFilter.MakeBlur(pk.BlurStyle.Normal, Math.abs(amt), true),
    //         );
    //         if (item.opacity != null) {
    //             shadowPaint.setAlphaf(item.opacity);
    //         }

    //         if (item.shadow.inner) {
    //             paint.setColor(
    //                 pk.Color(item.shadow.color.r, item.shadow.color.g, item.shadow.color.b),
    //             );
    //             if (item.opacity != null) {
    //                 paint.setAlphaf(item.opacity);
    //             }
    //             ctx.saveLayer();
    //             ctx.drawPath(pkp, paint);
    //             ctx.clipPath(pkp, pk.ClipOp.Intersect, true);
    //             ctx.save();
    //             ctx.translate(item.shadow.offset.x, item.shadow.offset.y);
    //             ctx.drawPath(pkp, shadowPaint);
    //             ctx.restore();
    //             ctx.restore();
    //         } else {
    //             shadowPaint.setColor(
    //                 pk.Color(item.shadow.color.r, item.shadow.color.g, item.shadow.color.b),
    //             );
    //             if (item.opacity != null) {
    //                 shadowPaint.setAlphaf(item.opacity);
    //             }
    //             ctx.save();
    //             ctx.translate(item.shadow.offset.x, item.shadow.offset.y);
    //             ctx.drawPath(pkp, shadowPaint);
    //             ctx.restore();
    //             ctx.drawPath(pkp, paint);
    //         }

    //         shadowPaint.delete();
    //     } else {
    //         try {
    //             ctx.drawPath(pkp, paint);
    //         } catch (err) {
    //             console.log('failed to draw', pkp);
    //             console.error(err);
    //         }
    //     }
    //     paint.delete();
    //     // if (!item.pk) {
    //     pkp.delete();
    //     // }
    // });
    // ctx.restore();

    if (fontBuffer && t != null) {
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

    surface.flush();
};
