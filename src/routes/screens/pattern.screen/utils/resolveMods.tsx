import {Path as PKPath} from 'canvaskit-wasm';
import {scalePos} from '../../../../editor/scalePos';
import {transformPKPath, transformShape} from '../../../../editor/tilingPoints';
import {cmdsToCoords, cmdsToSegments} from '../../../../gcode/cmdsToSegments';
import {epsilon} from '../../../../rendering/epsilonToZero';
import {Matrix} from '../../../../rendering/getMirrorTransforms';
import {pkPathToSegments} from '../../../../sidebar/pkClipPaths';
import {BarePath, Coord, Segment} from '../../../../types';
import {centroid} from '../../../findReflectionAxes';
import {calcPolygonArea, coordsFromBarePath, pkPathFromCoords} from '../../../getPatternData';
import {pk} from '../../../pk';
import {segmentsCmds} from '../../animator.screen/cropPath';
import {easeFn} from '../eval/evalEase';
import {a, AnimCtx, Ctx, RenderItem} from '../eval/evaluate';
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
} from '../export-types';
import {
    dropNully,
    renderLine,
    renderPattern,
    resolveFill,
    resolveLine,
    resolveShadow,
} from '../render/renderPattern';
import {multiplyShape} from './expandShapes';

type CCrop = {type: 'crop'; id: string; mode?: CropMode; hole?: boolean};
type CInset = {type: 'inset'; v: number};
export type CropsAndMatrices = (CCrop | Matrix[] | CInset | {type: 'inner'})[];

const enabledMods = (mods: PMods[]) => mods.filter((mod) => !mod.disabled);

export const resolveEnabledPMods = (ctx: AnimCtx, mods: PMods[] = []): CropsAndMatrices =>
    enabledMods(mods).map((mod) => resolvePMod(ctx, mod));

export const resolvePMod = (ctx: AnimCtx, mod: PMods): CropsAndMatrices[0] => {
    if (mod.disabled) return [];
    switch (mod.type) {
        case 'inner':
            return mod;
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
    if (Math.abs(inset) < 0.01) return [shape];
    const by = 10;
    const path = pkPathFromCoords(
        shape.map((s) => ({x: s.x * by, y: s.y * by})),
        false,
    )!;
    if (!path) return [];
    insetPkPath(path, (inset / 100) * by);
    path.simplify();
    const items = pkPathToSegments(path);
    path.delete();
    return items
        .map(coordsFromBarePath)
        .map((shape) => shape.map((s) => ({x: s.x / by, y: s.y / by})));
};

const clipShape = (shape: Coord[], mod: CCrop, crop: PKPath) => {
    if (mod.mode === 'rough') {
        const center = centroid(shape);
        if (crop.contains(center.x, center.y) === !!mod.hole) {
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

const pkCentroid = (path: PKPath) => {
    return centroid(pkCoords(path));
};

const pkCoords = (path: PKPath) => {
    const segments = cmdsToSegments([...path.toCmds()]);
    return segments.flatMap(coordsFromBarePath);
};

const clipShape2 = (shape: PKPath, mod: CCrop, crop: PKPath): PKPath => {
    if (mod.mode === 'rough') {
        const center = pkCentroid(shape);
        if (crop.contains(center.x, center.y) === !!mod.hole) {
            shape.reset();
            return shape;
        }
        return shape;
    } else if (mod.mode === 'half') {
        const other = shape.copy();
        other.op(crop, mod.hole ? pk.PathOp.Difference : pk.PathOp.Intersect);
        other.simplify();
        const size = pkPathToSegments(other)
            .map(coordsFromBarePath)
            .map(calcPolygonArea)
            .reduce((a, b) => a + b, 0);
        other.delete();
        const area = calcPolygonArea(pkCoords(shape));
        if (size < area / 2 + epsilon) {
            shape.reset();
        }
        return shape;
    } else {
        console.log('clipping here');
        shape.op(crop, mod.hole ? pk.PathOp.Difference : pk.PathOp.Intersect);
        shape.simplify();
        return shape;
    }
};

const intoCmds = (path: PKPath) => {
    const cmds = [...path.toCmds()];
    path.delete();
    return cmds;
};

// export const clipShape2 = (shape: Coord[], mod: CCrop, crop: PKPath) => {
//     if (mod.mode === 'rough') {
//         const center = centroid(shape);
//         if (crop.contains(center.x, center.y) === !!mod.hole) {
//             return [];
//         }
//         return intoCmds(pkPathFromCoords(shape)!)
//     } else if (mod.mode === 'half') {
//         // const path = pkPathFromCoords(shape)!;
//         // const other = path.copy();
//         // other.op(crop, mod.hole ? pk.PathOp.Difference : pk.PathOp.Intersect);
//         // other.simplify();
//         // const size = pkPathToSegments(other)
//         //     .map(coordsFromBarePath)
//         //     .map(calcPolygonArea)
//         //     .reduce((a, b) => a + b, 0);
//         // other.delete();
//         // path.delete();
//         // const area = calcPolygonArea(shape);
//         // if (size < area / 2 + epsilon) {
//         //     return [];
//         // }
//         // return [shape];
//         throw new Error('not now')
//     } else {
//         // console.log(`clip a shape`, shape)
//         const path = pkPathFromCoords(shape)!;
//         path.op(crop, mod.hole ? pk.PathOp.Difference : pk.PathOp.Intersect);
//         path.simplify();
//         // const cmds = path.toCmds()
//         // const items = pkPathToSegments(path);
//         // console.log('clipped', items)
//         // path.delete();
//         // return items.map(coordsFromBarePath);
//         return intoCmds(path)
//     }
// };

// NOTE: I do think I should be splitting paths up after
// clipping, and treating each subpath separately.
// I don't know how to deal with holes though,
// which presumably I want to be able to support
// at some point.
export const modsToShapes2 = (
    cropCache: Ctx['cropCache'],
    mods: CropsAndMatrices,
    shapes: {shape: Coord[]; i: number}[],
) => {
    return mods.reduce(
        (shapes, mod) => {
            if (Array.isArray(mod)) {
                return shapes.map((shape) => transformPKPath(shape, mod));
            }

            if (mod.type === 'inset') {
                if (Math.abs(mod.v) <= 0.01) return shapes;
                return shapes.map((shape) => {
                    insetPkPath(shape, mod.v);
                    return shape;
                });
            }
            if (mod.type === 'inner') {
                return shapes; // shouldn't have gotten this far?
            }

            const crop = cropCache.get(mod.id)!;
            if (!crop) {
                console.log(`No crop cache for ${mod.id}`);
                return shapes;
                // throw new Error(`No crop? ${mod.id} : ${[...cropCache.keys()]}`);
            }
            return shapes.map((shape) => {
                return clipShape2(shape, mod, crop.path);
            });
        },
        shapes.map(({shape}) => pkPathFromCoords(shape)!),
    );
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
        if (mod.type === 'inner') {
            return shapes; // shouldn't have gotten this far?
        }

        const crop = cropCache.get(mod.id)!;
        if (!crop) {
            console.log(`No crop cache for ${mod.id}`);
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

export const withShared = (
    anim: Ctx['anim'],
    shared?: Record<string, AnimatableValue>,
    debug = false,
) => {
    if (!shared) return anim;
    // biome-ignore lint: this one is fine
    const values: Record<string, any> = {};
    Object.entries(shared).forEach(([name, value]) => {
        values[name] = a.value(anim, value);
    });
    if (debug) {
        // console.log('shared', anim.values.t, values);
    }
    return {...anim, values: {...anim.values, ...values}};
};

export const numToCoord = (num: number | Coord) =>
    typeof num === 'number' ? {x: num, y: num} : num;

export const objectShapes = (id: string, shapes: string[]) => {
    const sk = id.includes(':') ? id.split(':')[0] : id;
    return shapes.filter((s) => s.startsWith(sk));
};

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

    let paths: PKPath[];
    if (object.multiply) {
        paths = objectShapes(object.shape, Object.keys(ctx.shapes)).map((k) => {
            const shape = ctx.shapes[k];
            return pk.Path.MakeFromCmds(segmentsCmds(shape.origin, shape.segments, shape.open))!;
        });
    } else {
        const shape = ctx.shapes[object.shape];
        if (!shape) return;

        paths = [pk.Path.MakeFromCmds(segmentsCmds(shape.origin, shape.segments, shape.open))!];
    }

    let remove = false;

    // const fmods = object.mods.map((m) => resolvePMod(ctx.anim, m));
    crops.forEach((mod) => {
        remove = remove || paths.every((path) => pathMod(ctx.cropCache, mod, path));
    });
    if (remove) return;

    if (object.style.disabled) return;

    // biome-ignore lint: this one is fine
    const local: Record<string, any> = {};
    if (object.style.t) {
        const got = resolveT(object.style.t, anim.values.t);
        if (got == null) return; // out of range
        local.t = got;
    }

    const localAnim = {...anim, values: {...anim.values, ...local}};

    Object.values(object.style.fills).map((fr) => {
        const f = dropNully(resolveFill(localAnim, fr));
        if (f.color == null) return;

        const thisPaths = paths.map((path) => path.copy());
        let remove = false;
        f.mods.forEach((mod) => {
            remove = remove || thisPaths.every((path) => pathMod(ctx.cropCache, mod, path));
        });
        if (remove) return;

        ctx.items.push({
            type: 'path',
            // pk: thisPath,
            key: '',
            color: colorToRgb(f.color),
            opacity: f.opacity,
            shadow: resolveShadow(anim, f.shadow),
            shapes: thisPaths.flatMap((path) => cmdsToSegments([...path.toCmds()])),
            zIndex: f.zIndex,
        });
        thisPaths.forEach((p) => p.delete());
    });

    Object.values(object.style.lines).map((fr, fi) => {
        const f = dropNully(resolveLine(localAnim, fr));
        if (f.color == null) return;

        // const thisPath = path.copy();
        const thisPaths = paths.map((path) => path.copy());
        let remove = false;
        f.mods.forEach((mod) => {
            // remove = remove || pathMod(ctx.cropCache, mod, thisPath);
            remove = remove || thisPaths.every((path) => pathMod(ctx.cropCache, mod, path));
        });
        if (remove) return;

        ctx.items.push({
            type: 'path',
            // pk: thisPath,
            key: fi + '',
            color: colorToRgb(f.color),
            strokeWidth: a.number(anim, f.width ?? 0) / 100,
            opacity: f.opacity,
            shadow: resolveShadow(anim, f.shadow),
            // shapes: cmdsToSegments([...thisPath.toCmds()]),
            shapes: thisPaths.flatMap((path) => cmdsToSegments([...path.toCmds()])),
            sharp: f.sharp,
            zIndex: f.zIndex,
        });
        // thisPath.delete();
        thisPaths.forEach((p) => p.delete());
    });

    paths.forEach((p) => p.delete());
    // path.delete();
    // object.style.mods
};

export const pathMod = (cropCache: Ctx['cropCache'], mod: CropsAndMatrices[0], path: PKPath) => {
    if (Array.isArray(mod)) {
        mod.forEach(([[a, b, c], [d, e, f]]) => {
            path.transform([a, b, c, d, e, f]);
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
    } else if (mod.type === 'inner') {
        return false;
    } else {
        insetPkPath(path, mod.v / 100);
    }
    return false;
};

export const renderGroup = (ctx: Ctx, crops: CropsAndMatrices, group: Group) => {
    if (group.type !== 'Group') throw new Error('not a group');
    for (let [id] of Object.entries(group.entities).sort((a, b) => a[1] - b[1])) {
        const entity = ctx.layer.entities[id];
        if (!entity) continue;
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
    | {type: 'seg'; prev: Coord; seg: Segment; color?: Color}
    | {type: 'point'; p: Coord; color?: Color}
    | {type: 'shape'; shape: BarePath; color?: Color};

export type LogItems = {item: LogItem | LogItem[]; text?: string; color?: Color; data?: any};
export type RenderLog =
    | {
          type: 'items';
          items: LogItems[];
          title: string;
      }
    | {type: 'group'; children: RenderLog[]; title: string};

export type Hover = {type: 'shape'; id: string} | {type: 'shapes'; ids: string[]};

export const barePathFromCoords = (coords: Coord[], open = false): BarePath =>
    open
        ? {
              segments: coords.slice(1).map((c) => ({type: 'Line', to: c})),
              origin: coords[0],
              open: true,
          }
        : {
              segments: coords.map((c) => ({type: 'Line', to: c})),
              origin: coords[coords.length - 1],
          };

export function handleShadowAndZSorting(items: RenderItem[]) {
    const len = items.length;
    for (let i = 0; i < len; i++) {
        const item = items[i];
        if (item.type === 'path' && item.shadow && !item.shadow.inner) {
            items.push({...item, shadow: undefined});
        }
    }
    const hasZ = items.some((s) => s.zIndex != null || (s.type === 'path' && s.shadow != null));
    if (hasZ) {
        items.sort((a, b) =>
            a.zIndex === b.zIndex
                ? (a.type === 'path' && a.shadow ? 0 : 1) - (b.type === 'path' && b.shadow ? 0 : 1)
                : (a.zIndex ?? 0) - (b.zIndex ?? 0),
        );
    }
}
