import {useEffect, useMemo, useRef, useState} from 'react';
import {Ctx, a, AnimCtx, Patterns} from './evaluate';
import {
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
import {svgCoord, useSVGZoom} from './useSVGZoom';
import {Coord} from '../../../types';
import {pkPathWithCmds} from '../animator.screen/cropPath';
import {PKPath} from '../../pk';
import {transformBarePath} from '../../../rendering/points';
import {
    coordsFromPkPath,
    getShapeColors,
    getSimplePatternData,
    pkPathFromCoords,
} from '../../getPatternData';
import {shapeD} from '../../shapeD';
import {transformShape} from '../../../editor/tilingPoints';

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
    if (needColors) {
        const {colors} = getShapeColors(simple.uniqueShapes, simple.minSegLength);

        ctx.items.push(
            ...simple.uniqueShapes.flatMap((shape, i) => {
                const fills: Record<string, Fill> = {};
                const lines: Record<string, Line> = {};
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
                // const pk = pkPathFromCoords(shape, false)!;
                // const byinset: Record<number, string> = {}
                // const getInset = (inset: number) => {
                //     if (!byinset[inset]) byinset[inset] =
                // }
                const res = [
                    ...Object.values(fills).map((f, fi) => {
                        if (!f.color) return;
                        const color = a.color(ctx.anim, f.color);
                        if (f.mods) {
                            const fmods = resolveMods(ctx.anim, f.mods);
                            const tx = modsTransforms(fmods);
                            let mshape = transformShape(shape, [...ptx, ...tx]);
                            if (fmods.inset) {
                                const pk = pkPathFromCoords(mshape, false)!;
                                insetPkPath(pk, fmods.inset / 100);
                                return coordsFromPkPath(pk.toCmds()).map((shape, j) => (
                                    <path
                                        key={`fill-${i}-${fi}-${j}`}
                                        opacity={fmods.opacity}
                                        fill={color}
                                        d={shapeD(shape)}
                                    />
                                ));
                            }
                            return <path key={`fill-${i}-${fi}`} fill={color} d={shapeD(mshape)} />;
                        }
                        return <path key={`fill-${i}-${fi}`} fill={color} d={shapeD(shape)} />;
                    }),
                    ...Object.values(lines).map((f, fi) => {
                        if (!f.color) return;
                        if (!f.width) return;
                        const color = a.color(ctx.anim, f.color);
                        const width = a.number(ctx.anim, f.width) / 100;
                        if (f.mods) {
                            const fmods = resolveMods(ctx.anim, f.mods);
                            const tx = modsTransforms(fmods);
                            let mshape = transformShape(shape, [...ptx, ...tx]);
                            if (fmods.inset) {
                                const pk = pkPathFromCoords(mshape, false)!;
                                insetPkPath(pk, fmods.inset / 100);
                                return coordsFromPkPath(pk.toCmds()).map((shape, j) => (
                                    <path
                                        key={`stroke-${i}-${fi}-${j}`}
                                        fill="none"
                                        stroke={color}
                                        strokeWidth={width}
                                        d={shapeD(shape)}
                                        opacity={fmods.opacity}
                                    />
                                ));
                            }
                            return (
                                <path
                                    key={`stroke-${i}-${fi}`}
                                    fill="none"
                                    stroke={color}
                                    strokeWidth={width}
                                    d={shapeD(mshape)}
                                    opacity={fmods.opacity}
                                />
                            );
                        }
                        return (
                            <path
                                key={`stroke-${i}-${fi}`}
                                fill="none"
                                stroke={color}
                                strokeWidth={width}
                                d={shapeD(shape)}
                            />
                        );
                    }),
                ];
                // pk?.delete();
                return res;
                // return <path key={i} fill="red" stroke="black" strokeWidth={0.01} d={shapeD(shape)} />
            }),
        );
    } else {
        ctx.items.push(
            ...simple.uniqueShapes.map((shape, i) => (
                <path key={i} fill="red" stroke="black" strokeWidth={0.01} d={shapeD(shape)} />
            )),
        );
    }
};

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
    const items: React.ReactNode[] = [];
    for (let layer of Object.values(state.layers)) {
        const group = layer.entities[layer.rootGroup];
        if (group.type !== 'Group') {
            throw new Error(`root not a group`);
        }
        renderGroup(
            {
                state,
                anim: {
                    cache: animCache,
                    values: {
                        Math,
                        t,
                    },
                    palette: state.styleConfig.palette,
                    warn,
                },
                layer,
                patterns,
                items,
                cropCache,
            },
            [],
            group,
        );
    }
    return {items, warnings};
};

export const RenderExport = ({state, patterns}: {state: State; patterns: Patterns}) => {
    const [t, setT] = useState(0); // animateeeee
    const cropCache = useMemo(() => new Map<string, {path: PKPath; crop: Crop; t?: number}>(), []);
    const animCache = useMemo<AnimCtx['cache']>(() => new Map(), []);

    const [animate, setAnimate] = useState(false);
    useEffect(() => {
        if (!animate) return;
        let t = 0;
        const iv = setInterval(() => {
            setT(Math.min(1, (t += 0.01)));
            if (t >= 1) {
                setAnimate(false);
                clearInterval(iv);
            }
        }, 20);
        return () => clearInterval(iv);
    }, [animate]);

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

    const {zoomProps, box} = useSVGZoom(6);
    const [mouse, setMouse] = useState(null as null | Coord);
    const size = 500;

    return (
        <div className="flex">
            <div className="relative overflow-hidden">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    {...zoomProps}
                    style={size ? {background: 'black', width: size, height: size} : undefined}
                    onMouseLeave={() => setMouse(null)}
                    onMouseMove={(evt) => setMouse(svgCoord(evt))}
                >
                    {items}
                </svg>
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
                    <button className="btn" onClick={() => setAnimate(true)}>
                        Animate
                    </button>
                </div>
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
