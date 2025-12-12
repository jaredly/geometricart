import {Path as PKPath} from 'canvaskit-wasm';
import {scalePos} from '../../../editor/scalePos';
import {transformShape} from '../../../editor/tilingPoints';
import {cmdsToCoords, cmdsToSegments} from '../../../gcode/cmdsToSegments';
import {epsilon} from '../../../rendering/epsilonToZero';
import {Matrix} from '../../../rendering/getMirrorTransforms';
import {pkPathToSegments} from '../../../sidebar/pkClipPaths';
import {BarePath, Coord, Segment} from '../../../types';
import {centroid} from '../../findReflectionAxes';
import {calcPolygonArea, coordsFromBarePath, pkPathFromCoords} from '../../getPatternData';
import {pk} from '../../pk';
import {segmentsCmds} from '../animator.screen/cropPath';
import {globals, mulberry32} from './eval-globals';
import {easeFn, evalTimeline} from './evalEase';
import {a, AnimCtx, Ctx, Patterns, RenderItem} from './evaluate';
import {
    AnimatableValue,
    Color,
    colorToRgb,
    CropMode,
    EObject,
    Group,
    insetPkPath,
    modMatrix,
    PMods,
    State,
} from './export-types';
import {renderPattern, resolveShadow} from './renderPattern';

type CCrop = {type: 'crop'; id: string; mode?: CropMode; hole?: boolean};
type CInset = {type: 'inset'; v: number};
export type CropsAndMatrices = (CCrop | Matrix[] | CInset)[];

export const resolvePMod = (ctx: AnimCtx, mod: PMods): CropsAndMatrices[0] => {
    switch (mod.type) {
        case 'inset':
            return {...mod, v: a.number(ctx, mod.v)};
        case 'crop':
            return mod;
        case 'scale':
            return modMatrix({
                ...mod,
                v: a.coordOrNumber(ctx, mod.v),
                origin: mod.origin ? a.coord(ctx, mod.origin) : undefined,
            });
        case 'rotate':
            return modMatrix({
                ...mod,
                v: a.number(ctx, mod.v),
                origin: mod.origin ? a.coord(ctx, mod.origin) : undefined,
            });
        case 'translate':
            return modMatrix({...mod, v: scalePos(numToCoord(a.coordOrNumber(ctx, mod.v)), 0.01)});
    }
};

const insetShape = (shape: Coord[], inset: number) => {
    if (!shape.length) return [];
    const path = pkPathFromCoords(shape, false)!;
    if (!path) return [];
    if (Math.abs(inset) < 0.01) return [shape];
    insetPkPath(path, inset / 100);
    path.simplify();
    const items = pkPathToSegments(path);
    path.delete();
    return items.map(coordsFromBarePath);
};

const clipShape = (shape: Coord[], mod: CCrop, crop: PKPath) => {
    if (mod.mode === 'rough') {
        const center = centroid(shape);
        if (!crop.contains(center.x, center.y)) {
            return [];
        }
        return [shape];
    } else if (mod.mode === 'half') {
        const path = pkPathFromCoords(shape)!;
        const other = path.copy();
        other.op(crop, mod.hole ? pk.PathOp.Difference : pk.PathOp.Intersect);
        other.simplify();
        const size = pkPathToSegments(other)
            .map(coordsFromBarePath)
            .map(calcPolygonArea)
            .reduce((a, b) => a + b, 0);
        other.delete();
        path.delete();
        const area = calcPolygonArea(shape);
        if (size < area / 2 + epsilon) {
            return [];
        }
        return [shape];
    } else {
        const path = pkPathFromCoords(shape)!;
        path.op(crop, mod.hole ? pk.PathOp.Difference : pk.PathOp.Intersect);
        path.simplify();
        const items = pkPathToSegments(path);
        path.delete();
        return items.map(coordsFromBarePath);
    }
};

export const modsToShapes = (
    cropCache: Ctx['cropCache'],
    mods: CropsAndMatrices,
    shapes: {shape: Coord[]; i: number}[],
) => {
    return mods.reduce((shapes, mod) => {
        if (Array.isArray(mod)) {
            return shapes.map((shape) => ({
                shape: transformShape(shape.shape, mod),
                i: shape.i,
            }));
        }

        if (mod.type === 'inset') {
            if (Math.abs(mod.v) <= 0.01) return shapes;
            return shapes.flatMap((shape) => {
                return insetShape(shape.shape, mod.v).map((coords) => ({
                    shape: coords,
                    i: shape.i,
                }));
            });
        }

        const crop = cropCache.get(mod.id)!;
        if (!crop) {
            return shapes;
            // throw new Error(`No crop? ${mod.id} : ${[...cropCache.keys()]}`);
        }
        return shapes.flatMap((shape) => {
            return clipShape(shape.shape, mod, crop.path).map((coords) => ({
                shape: coords,
                i: shape.i,
            }));
        });
    }, shapes);
};

export const resolveT = (
    {chunk, total, ease}: {chunk: number; total: number; ease: string},
    t: number,
) => {
    const fn = easeFn(ease);
    const cur = t * (total - 0);
    const cnum = Math.floor(cur);
    if (cnum === chunk - 1) {
        return fn(cur - cnum);
    }
    return null;
};

export const withShared = (anim: Ctx['anim'], shared?: Record<string, AnimatableValue>) => {
    if (!shared) return anim;
    const values: Record<string, any> = {};
    Object.entries(shared).forEach(([name, value]) => {
        values[name] = a.value(anim, value);
    });
    return {...anim, values: {...anim.values, ...values}};
};

export const notNull = <T,>(v: T): v is NonNullable<T> => v != null;

export const numToCoord = (num: number | Coord) =>
    typeof num === 'number' ? {x: num, y: num} : num;

const renderObject = (ctx: Ctx, crops: CropsAndMatrices, object: EObject) => {
    const anim: (typeof ctx)['anim'] = {
        ...ctx.anim,
        values: {
            ...ctx.anim.values,
            // center,
            // radius,
            // shape,
            // i,
        },
    };

    const shape = ctx.state.shapes[object.shape];
    if (!shape) return;
    const path = pk.Path.MakeFromCmds(segmentsCmds(shape.origin, shape.segments, shape.open))!;
    let remove = false;
    // const fmods = object.mods.map((m) => resolvePMod(ctx.anim, m));
    crops.forEach((mod) => {
        remove = remove || pathMod(ctx.cropCache, mod, path);
    });
    if (remove) return;

    if (object.style.disabled) return;

    Object.values(object.style.fills).map((f) => {
        if (f.color == null) return;
        const fmods = f.mods.map((m) => resolvePMod(anim, m));
        const thisPath = path.copy();
        let remove = false;
        fmods.forEach((mod) => {
            remove = remove || pathMod(ctx.cropCache, mod, thisPath);
        });

        const color = a.color(anim, f.color);
        const rgb = colorToRgb(color);
        const zIndex = f.zIndex ? a.number(anim, f.zIndex) : null;
        const opacity = f.opacity ? a.number(anim, f.opacity) : undefined;

        ctx.items.push({
            type: 'path',
            pk: thisPath,
            key: '',
            color: rgb,
            opacity,
            shadow: resolveShadow(anim, f.shadow),
            shapes: cmdsToSegments([...thisPath.toCmds()]),
            zIndex,
        });
    });

    Object.values(object.style.lines).map((f) => {
        if (f.color == null) return;
        const fmods = f.mods.map((m) => resolvePMod(anim, m));
        const thisPath = path.copy();
        let remove = false;
        fmods.forEach((mod) => {
            remove = remove || pathMod(ctx.cropCache, mod, thisPath);
        });

        const color = a.color(anim, f.color);
        const rgb = colorToRgb(color);
        const zIndex = f.zIndex ? a.number(anim, f.zIndex) : null;
        const opacity = f.opacity ? a.number(anim, f.opacity) : undefined;

        ctx.items.push({
            type: 'path',
            pk: thisPath,
            key: '',
            color: rgb,
            strokeWidth: a.number(anim, f.width ?? 0) / 100,
            opacity,
            shadow: resolveShadow(anim, f.shadow),
            shapes: cmdsToSegments([...thisPath.toCmds()]),
            zIndex,
        });
    });

    path.delete();
    // object.style.mods
};

export const pathMod = (cropCache: Ctx['cropCache'], mod: CropsAndMatrices[0], path: PKPath) => {
    if (Array.isArray(mod)) {
        mod.forEach(([a, b, c, d, e, f]) => {
            path.transform(a, b, c, d, e, f, 0, 0, 1);
        });
    } else if (mod.type === 'crop') {
        const crop = cropCache.get(mod.id)!.path;
        if (mod.mode === 'rough') {
            const center = centroid(cmdsToCoords(path.toCmds()).flatMap((c) => c.points));
            if (!crop.contains(center.x, center.y)) {
                return true;
            }
        } else if (mod.mode === 'half') {
            const other = path.copy();
            other.op(crop, mod.hole ? pk.PathOp.Difference : pk.PathOp.Intersect);
            other.simplify();
            const size = cmdsToCoords(other.toCmds())
                .map((s) => calcPolygonArea(s.points))
                .reduce((a, b) => a + b, 0);
            other.delete();
            path.delete();
            const originalSize = cmdsToCoords(path.toCmds())
                .map((s) => calcPolygonArea(s.points))
                .reduce((a, b) => a + b, 0);
            if (size < originalSize / 2 + epsilon) {
                return true;
            }
        } else {
            path.op(crop, mod.hole ? pk.PathOp.Difference : pk.PathOp.Intersect);
            path.simplify();
        }
    } else {
        insetPkPath(path, mod.v / 100);
    }
    return false;
};

const renderGroup = (ctx: Ctx, crops: CropsAndMatrices, group: Group) => {
    if (group.type !== 'Group') throw new Error('not a group');
    for (let [id] of Object.entries(group.entities).sort((a, b) => a[1] - b[1])) {
        const entity = ctx.layer.entities[id];
        switch (entity.type) {
            case 'Group':
                renderGroup(ctx, crops, entity);
                break;
            case 'Pattern':
                renderPattern(ctx, crops, entity);
                break;
            case 'Object':
                renderObject(ctx, crops, entity);
                break;
        }
    }
};

export type LogItem =
    | {type: 'seg'; prev: Coord; seg: Segment}
    | {type: 'point'; p: Coord}
    | {type: 'shape'; shape: BarePath};

export type RenderLog =
    | {
          type: 'items';
          items: {item: LogItem | LogItem[]; text?: string; color?: Color}[];
          title: string;
      }
    | {type: 'group'; children: RenderLog[]; title: string};

export const svgItems = (
    state: State,
    animCache: AnimCtx['cache'],
    cropCache: Ctx['cropCache'],
    patterns: Patterns,
    t: number,
    debug = false,
) => {
    const warnings: string[] = [];
    const warn = (v: string) => warnings.push(v);
    const items: RenderItem[] = [];
    const keyPoints: Coord[] = [];
    const byKey: Record<string, string[]> = {};
    const fromtl = evalTimeline(state.styleConfig.timeline, t);
    const values: Record<string, any> = {...globals, t, ...fromtl};
    const seed = a.number(
        {cache: animCache, values, palette: state.styleConfig.palette, warn},
        state.styleConfig.seed,
    );
    values.rand = mulberry32(seed);
    const log: RenderLog[] | undefined = debug ? [] : undefined;

    for (let layer of Object.values(state.layers)) {
        const group = layer.entities[layer.rootGroup];
        if (group.type !== 'Group') {
            throw new Error(`root not a group`);
        }
        const anim = {
            cache: animCache,
            values,
            palette: state.styleConfig.palette,
            warn,
        };
        Object.entries(layer.shared).forEach(([name, value]) => {
            values[name] = a.value(anim, value);
        });

        renderGroup(
            {state, anim, layer, patterns, items, keyPoints, cropCache, byKey, log},
            [],
            group,
        );
    }

    handleShadowAndZSorting(items);

    const bg = a.color(
        {cache: animCache, values, palette: state.styleConfig.palette, warn() {}},
        state.view.background ?? '#000',
    );

    return {items, warnings, byKey, keyPoints, bg, log};
};

export type Hover = {type: 'shape'; id: string};

export const barePathFromCoords = (coords: Coord[]): BarePath => ({
    segments: coords.map((c) => ({type: 'Line', to: c})),
    origin: coords[coords.length - 1],
});

function handleShadowAndZSorting(items: RenderItem[]) {
    const len = items.length;
    for (let i = 0; i < len; i++) {
        if (items[i].shadow) {
            items.push({...items[i], shadow: undefined});
        }
    }
    const hasZ = items.some((s) => s.zIndex != null || s.shadow != null);
    if (hasZ) {
        items.sort((a, b) =>
            a.zIndex === b.zIndex
                ? (a.shadow ? 0 : 1) - (b.shadow ? 0 : 1)
                : (a.zIndex ?? 0) - (b.zIndex ?? 0),
        );
    }
}
