import {useEffect, useMemo, useRef, useState} from 'react';
import {transformShape} from '../../../editor/tilingPoints';
import {
    applyMatrices,
    dist,
    scaleMatrix,
    translationMatrix,
} from '../../../rendering/getMirrorTransforms';
import {transformBarePath} from '../../../rendering/points';
import {Coord} from '../../../types';
import {centroid} from '../../findReflectionAxes';
import {
    cmdsForCoords,
    coordsFromPkPath,
    cropShapes,
    getShapeColors,
    getSimplePatternData,
    pkPathFromCoords,
} from '../../getPatternData';
import {pk, PKCanvas, PKPath} from '../../pk';
import {shapeD} from '../../shapeD';
import {pkPathWithCmds} from '../animator.screen/cropPath';
import {globals} from './eval-globals';
import {a, AnimCtx, Ctx, Patterns, RenderItem} from './evaluate';
import {
    Box,
    colorToRgb,
    ConcreteMods,
    Crop,
    EObject,
    Fill,
    Group,
    insetPkPath,
    Line,
    Mods,
    modsTransforms,
    Pattern,
    ShapeStyle,
    State,
} from './export-types';
import {percentToWorld, svgCoord, useElementZoom, worldToPercent} from './useSVGZoom';
import {Surface} from 'canvaskit-wasm';
import {generateVideo} from '../animator.screen/muxer';

const resolveMods = (ctx: AnimCtx, mods: Mods): ConcreteMods => ({
    inset: mods.inset != null ? a.number(ctx, mods.inset) : undefined,
    scale: mods.scale != null ? a.coordOrNumber(ctx, mods.scale) : undefined,
    scaleOrigin: mods.scaleOrigin != null ? a.coord(ctx, mods.scaleOrigin) : undefined,
    offset: mods.offset != null ? a.coord(ctx, mods.offset) : undefined,
    rotation: mods.rotation != null ? a.number(ctx, mods.rotation) : undefined,
    rotationOrigin: mods.rotationOrigin != null ? a.coord(ctx, mods.rotationOrigin) : undefined,
    opacity: mods.opacity != null ? a.number(ctx, mods.opacity) : undefined,
    thickness: mods.thickness != null ? a.number(ctx, mods.thickness) : undefined,
    tint: mods.tint != null ? a.color(ctx, mods.tint) : undefined,
});

const matchKind = (k: ShapeStyle['kind'], i: number, color: number) => {
    switch (k.type) {
        case 'everything':
            return true;
        case 'alternating':
            return color === k.index;
        case 'explicit':
            return k.ids[i];
        case 'shape':
            console.log('not right');
            return false;
    }
};

const renderPattern = (ctx: Ctx, crops: Group['crops'], pattern: Pattern) => {
    // not doing yet
    if (pattern.contents.type !== 'shapes') return;
    const tiling = ctx.patterns[pattern.id];
    const mods = resolveMods(ctx.anim, pattern.mods);
    const ptx = modsTransforms(mods);

    const simple = getSimplePatternData(tiling, pattern.psize);
    const orderedStyles = Object.values(pattern.contents.styles).sort((a, b) => a.order - b.order);

    const needColors = orderedStyles.some((s) => s.kind.type === 'alternating');
    const {colors} = needColors
        ? getShapeColors(simple.uniqueShapes, simple.minSegLength)
        : {colors: []};

    const croppedShapes = cropShapes(
        simple.uniqueShapes,
        crops.map((crop) => ({
            ...crop,
            segments: ctx.state.crops[crop.id].shape,
        })),
    ).flatMap((shapes, i) => shapes.map((shape) => ({shape, i})));

    ctx.items.push(
        ...croppedShapes.flatMap(({shape, i}) => {
            const center = centroid(shape);
            const radius = Math.min(...shape.map((s) => dist(s, center)));
            const fills: Record<string, Fill> = {};
            const lines: Record<string, Line> = {};

            const anim: (typeof ctx)['anim'] = {
                ...ctx.anim,
                values: {
                    ...ctx.anim.values,
                    center,
                    radius,
                    shape,
                    i,
                },
            };

            orderedStyles.forEach((s) => {
                if (!matchKind(s.kind, i, colors[i])) {
                    return;
                }
                Object.values(s.fills).forEach((fill) => {
                    fills[fill.id] = {...fills[fill.id], ...fill};
                });
                Object.values(s.lines).forEach((line) => {
                    lines[line.id] = {...lines[line.id], ...line};
                });
            });

            const res: (RenderItem | undefined)[] = [
                ...Object.values(fills).flatMap((f, fi): RenderItem[] | RenderItem | undefined => {
                    if (!f.color) return;
                    const color = a.color(anim, f.color);
                    const rgb = colorToRgb(color);
                    const zIndex = f.zIndex ? a.number(anim, f.zIndex) : null;
                    if (f.mods) {
                        const fmods = resolveMods(anim, f.mods);
                        const tx = modsTransforms(fmods, center);
                        let mshape = transformShape(shape, [...ptx, ...tx]);
                        if (fmods.inset && Math.abs(fmods.inset) > 0.001) {
                            const pk = pkPathFromCoords(mshape, false)!;
                            insetPkPath(pk, fmods.inset / 100);
                            return {
                                type: 'path',
                                pk,
                                key: `fill-${i}-${fi}`,
                                opacity: fmods.opacity,
                                fill: rgb,
                                shapes: coordsFromPkPath(pk.toCmds()),
                                zIndex,
                            };
                        }
                        return {
                            type: 'path',
                            key: `fill-${i}-${fi}`,
                            fill: rgb,
                            shapes: [mshape],
                            zIndex,
                        };
                    }
                    return {
                        type: 'path',
                        key: `fill-${i}-${fi}`,
                        fill: rgb,
                        shapes: [shape],
                        zIndex,
                    };
                }),
                ...Object.values(lines).flatMap((f, fi): RenderItem[] | RenderItem | undefined => {
                    if (!f.color) return;
                    if (!f.width) return;
                    const color = a.color(anim, f.color);
                    const rgb = colorToRgb(color);
                    const width = a.number(anim, f.width) / 100;
                    if (f.mods) {
                        const fmods = resolveMods(anim, f.mods);
                        const tx = modsTransforms(fmods, center);
                        let mshape = transformShape(shape, [...ptx, ...tx]);
                        if (fmods.inset) {
                            const pk = pkPathFromCoords(mshape, false)!;
                            insetPkPath(pk, fmods.inset / 100);
                            return {
                                type: 'path',
                                key: `stroke-${i}-${fi}`,
                                stroke: rgb,
                                strokeWidth: width,
                                pk,
                                shapes: coordsFromPkPath(pk.toCmds()),
                                opacity: fmods.opacity,
                            };
                        }
                        return {
                            type: 'path',
                            key: `stroke-${i}-${fi}`,
                            stroke: rgb,
                            strokeWidth: width,
                            shapes: [mshape],
                            opacity: fmods.opacity,
                        };
                    }
                    return {
                        type: 'path',
                        key: `stroke-${i}-${fi}`,
                        stroke: rgb,
                        strokeWidth: width,
                        shapes: [shape],
                    };
                }),
            ];

            return res.filter(notNull);
        }),
    );
};

const notNull = <T,>(v: T): v is NonNullable<T> => v != null;

const renderObject = (ctx: Ctx, crops: Group['crops'], object: EObject) => {
    //
};

const renderGroup = (ctx: Ctx, crops: Group['crops'], group: Group) => {
    if (group.type !== 'Group') throw new Error('not a group');
    const inner = [...crops, ...group.crops];
    for (let [id] of Object.entries(group.entities).sort((a, b) => a[1] - b[1])) {
        const entity = ctx.layer.entities[id];
        switch (entity.type) {
            case 'Group':
                renderGroup(ctx, inner, entity);
                break;
            case 'Pattern':
                renderPattern(ctx, inner, entity);
                break;
            case 'Object':
                renderObject(ctx, inner, entity);
                break;
        }
    }
};

const svgItems = (
    state: State,
    animCache: AnimCtx['cache'],
    cropCache: Ctx['cropCache'],
    patterns: Patterns,
    t: number,
) => {
    const warnings: string[] = [];
    const warn = (v: string) => warnings.push(v);
    const items: RenderItem[] = [];
    for (let layer of Object.values(state.layers)) {
        const group = layer.entities[layer.rootGroup];
        if (group.type !== 'Group') {
            throw new Error(`root not a group`);
        }
        const values: Record<string, any> = {...globals, t};
        const anim = {
            cache: animCache,
            values,
            palette: state.styleConfig.palette,
            warn,
        };
        Object.entries(layer.shared).forEach(([name, value]) => {
            values[name] = a.value(anim, value);
        });

        renderGroup({state, anim, layer, patterns, items, cropCache}, [], group);
    }
    const hasZ = items.some((s) => s.zIndex != null);
    if (hasZ) {
        items.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    }
    return {items, warnings};
};

export const RenderExport = ({state, patterns}: {state: State; patterns: Patterns}) => {
    const [t, setT] = useState(0.3); // animateeeee
    const cropCache = useMemo(() => new Map<string, {path: PKPath; crop: Crop; t?: number}>(), []);
    const animCache = useMemo<AnimCtx['cache']>(() => new Map(), []);

    const [duration, setDuration] = useState(5);
    const [animate, setAnimate] = useState(false);
    useEffect(() => {
        if (!animate) return;
        let st = Date.now() - t * duration * 1000;
        let af: number = 0;
        const step = () => {
            const now = Date.now();
            const diff = (now - st) / 1000;
            setT(Math.min(1, diff / duration));
            if (diff < duration) {
                af = requestAnimationFrame(step);
            } else {
                setAnimate(false);
            }
        };
        step();
        return () => cancelAnimationFrame(af);
    }, [animate, duration]);

    // well this is exciting
    useMemo(() => {
        for (let crop of Object.values(state.crops)) {
            const current = cropCache.get(crop.id);
            if (current?.crop === crop && (current.t == null || current.t === t)) continue;

            if (!crop.mods) {
                const path = pkPathWithCmds(crop.shape[crop.shape.length - 1].to, crop.shape);
                cropCache.set(crop.id, {path, crop});
            } else {
                const actx: AnimCtx = {
                    accessedValues: new Set(),
                    values: {t},
                    cache: animCache,
                    palette: [],
                    warn: (v) => console.warn(v),
                };
                const mods = resolveMods(actx, crop.mods);
                const tx = modsTransforms(mods);
                const shape = transformBarePath(
                    {
                        segments: crop.shape,
                        origin: crop.shape[crop.shape.length - 1].to,
                    },
                    tx,
                );
                const path = pkPathWithCmds(shape.origin, shape.segments);
                if (mods.inset) {
                    insetPkPath(path, mods.inset);
                }
                cropCache.set(crop.id, {path, crop, t: actx.accessedValues?.size ? t : undefined});
            }
        }
    }, [state.crops, cropCache, t, animCache]);

    const {items, warnings} = useMemo(
        () => svgItems(state, animCache, cropCache, patterns, t),
        [state, patterns, cropCache, animCache, t],
    );

    const {zoomProps, box} = useElementZoom(6);
    const [mouse, setMouse] = useState(null as null | Coord);
    const [video, setVideo] = useState(null as null | number | string);
    const size = 500;

    const statusRef = useRef<HTMLDivElement>(null);

    return (
        <div className="flex">
            <div className="relative overflow-hidden">
                <SVGCanvas {...zoomProps} setMouse={setMouse} items={items} size={size} />
                {/* <Canvas {...zoomProps} setMouse={setMouse} items={items} size={size} /> */}
                <div className="mt-4">
                    <input
                        type="range"
                        value={t}
                        onChange={(evt) => setT(+evt.target.value)}
                        className="range"
                        min={0}
                        max={1}
                        step={0.01}
                    />
                    <button
                        className={'btn mx-2 ' + (animate ? 'btn-accent' : '')}
                        onClick={() => setAnimate(!animate)}
                    >
                        Animate
                    </button>
                    <input
                        value={duration}
                        onChange={(evt) => setDuration(+evt.currentTarget.value)}
                        type="number"
                        className="input w-13"
                    />
                </div>
                <div className="flex gap-2 items-center">
                    <button
                        className={'btn'}
                        onClick={() =>
                            recordVideo(state, size, box, patterns, duration, statusRef).then(
                                (url) => setVideo(url),
                            )
                        }
                    >
                        Record Video
                    </button>
                    <div ref={statusRef} className="w-20 text-right" />
                    {video ? (
                        <button className={'btn'} onClick={() => setVideo(null)}>
                            &times;
                        </button>
                    ) : null}
                    {/* {typeof video === 'number' ? (
                        <input type="range" value={video} onChange={() => {}} min={0} max={1} />
                    ) : null} */}
                </div>
                {typeof video === 'string' ? (
                    <div>
                        <video src={video} controls loop style={{width: size, height: size}} />
                    </div>
                ) : null}
            </div>
            <div className="flex flex-col gap-2 p-2">
                {warnings.map((w, i) => (
                    <div key={i} className="px-4 py-2 rounded bg-base-100">
                        {w}
                    </div>
                ))}
            </div>
        </div>
    );

    // ok
};

const recordVideo = async (
    state: State,
    size: number,
    box: Box,
    patterns: Patterns,
    duration: number,
    onStatus: {current: HTMLElement | null},
) => {
    const canvas = new OffscreenCanvas(size * 2, size * 2);
    const frameRate = 24;
    // const step = 0.01;
    const totalFrames = frameRate * duration;

    const animCache = new Map();
    const cropCache = new Map();

    const blob = await generateVideo(canvas, frameRate, totalFrames, (_, currentFrame) => {
        if (currentFrame % 10 === 0)
            onStatus.current!.textContent = ((currentFrame / totalFrames) * 100).toFixed(0) + '%';
        const surface = pk.MakeWebGLCanvasSurface(canvas)!;

        const {items} = svgItems(state, animCache, cropCache, patterns, currentFrame / totalFrames);
        renderItems(surface, box, items);
    });
    onStatus.current!.textContent = '';
    return blob ? URL.createObjectURL(blob) : null;
};

const renderItems = (surface: Surface, box: Box, items: RenderItem[]) => {
    const ctx = surface.getCanvas();
    ctx.clear(pk.BLACK);

    ctx.save();
    ctx.scale(surface.width() / box.width, surface.height() / box.height);
    ctx.translate(-box.x, -box.y);
    items.forEach((item) => {
        const pkp =
            item.pk ??
            pk.Path.MakeFromCmds(item.shapes.flatMap((shape) => cmdsForCoords(shape, false)))!;
        const paint = new pk.Paint();
        paint.setAntiAlias(true);
        if (item.fill) {
            paint.setStyle(pk.PaintStyle.Fill);
            paint.setColor([item.fill.r / 255, item.fill.g / 255, item.fill.b / 255]);
        } else if (item.stroke && item.strokeWidth) {
            paint.setStyle(pk.PaintStyle.Stroke);
            paint.setStrokeWidth(item.strokeWidth!);
            paint.setColor([item.stroke.r / 255, item.stroke.g / 255, item.stroke.b / 255]);
        } else {
            return;
        }
        ctx.drawPath(pkp, paint);
        paint.delete();
        pkp.delete();
    });
    ctx.restore();
    surface.flush();
};

const Canvas = ({
    items,
    size,
    setMouse,
    box,
    innerRef,
}: {
    items: RenderItem[];
    size: number;
    box: Box;
    innerRef: React.RefObject<SVGElement | HTMLElement | null>;
    setMouse: (m: Coord | null) => void;
}) => {
    useEffect(() => {
        const surface = pk.MakeWebGLCanvasSurface(innerRef.current! as HTMLCanvasElement)!;
        renderItems(surface, box, items);
    }, [box, items, innerRef]);

    return (
        <canvas
            ref={innerRef as React.RefObject<HTMLCanvasElement>}
            style={{background: 'black', width: size, height: size}}
            width={size * 2}
            height={size * 2}
            onMouseLeave={() => setMouse(null)}
            onMouseMove={(evt) => {
                const cbox = evt.currentTarget.getBoundingClientRect();
                setMouse(
                    percentToWorld(worldToPercent({x: evt.clientX, y: evt.clientY}, cbox), box),
                );
            }}
        />
    );
};

const SVGCanvas = ({
    items,
    size,
    box,
    innerRef,
    setMouse,
}: {
    items: RenderItem[];
    size: number;
    box: Box;
    innerRef: React.RefObject<SVGElement | HTMLElement | null>;
    setMouse: (m: Coord | null) => void;
}) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`${box.x.toFixed(4)} ${box.y.toFixed(4)} ${box.width.toFixed(4)} ${box.height.toFixed(4)}`}
            ref={innerRef as React.RefObject<SVGSVGElement>}
            style={{background: 'black', width: size, height: size}}
            onMouseLeave={() => setMouse(null)}
            onMouseMove={(evt) => setMouse(svgCoord(evt))}
        >
            {items.map(({key, shapes, pk, fill, stroke, zIndex, ...item}) =>
                shapes.map((shape, m) => (
                    <path
                        {...item}
                        fill={stroke ? 'none' : rgbString(fill!)}
                        stroke={stroke ? rgbString(stroke) : undefined}
                        d={shapeD(shape)}
                        key={`${key}-${m}`}
                    />
                )),
            )}
        </svg>
    );
};

const rgbString = (c: {r: number; g: number; b: number}) => `rgb(${c.r},${c.g},${c.b})`;
