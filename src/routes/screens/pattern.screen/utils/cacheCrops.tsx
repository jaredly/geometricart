import {Path as PKPath} from 'canvaskit-wasm';
import {pkPathWithBarePath, pkPathWithCmds} from '../../animator.screen/cropPath';
import {AnimCtx, Ctx} from '../eval/evaluate';
import {Crop, ShapeNode} from '../export-types';
import {State} from '../types/state-type';
import {
    resolveEnabledPMods,
    pathMod,
    withLocals,
    resolvePMod,
    modsToShapes,
    applyModsToPkPath,
} from './resolveMods';
import {globals} from '../eval/eval-globals';
import {centroid} from '../../../findReflectionAxes';
import {coordsFromBarePath} from '../../../getPatternData';
import {BarePath} from '../../../../types';
import {pk} from '../../../pk';
import {pkPathToSegments} from '../../../../sidebar/pkClipPaths';

const resolveShape = (ctx: AnimCtx, cropCache: Ctx['cropCache'], shapeNode: ShapeNode): PKPath => {
    switch (shapeNode.type) {
        case 'shape': {
            // Soooooo I want to be able to apply mods to a path without it being coords first.
            const mods = resolveEnabledPMods(ctx, shapeNode.mods);
            const path = pkPathWithBarePath(shapeNode.path);
            applyModsToPkPath(cropCache, mods, path);
            return path;
        }
        case 'multiply': {
            throw new Error(`not yet`);
        }
        case 'op': {
            const inner = shapeNode.shapes.map((shape) => resolveShape(ctx, cropCache, shape));
            const base = inner.shift()!;
            for (let next of inner) {
                base.op(
                    next,
                    shapeNode.op === 'union'
                        ? pk.PathOp.Union
                        : shapeNode.op === 'difference'
                          ? pk.PathOp.Difference
                          : pk.PathOp.Intersect,
                );
                next.delete();
            }
            return base;
        }
    }
};

export function cacheCrops(
    crops: State['crops'],
    shapes: State['shapes'],
    cropCache: Map<string, {path: PKPath; crop: Crop; t?: number}>,
    t: number,
    animCache: Map<string, {fn: (ctx: AnimCtx['values']) => any; needs: string[]}>,
) {
    const aactx: AnimCtx = {
        accessedValues: new Set(),
        values: {...globals, t},
        cache: animCache,
        palette: [],
        warn: (v) => console.warn(v),
    };

    const allAccessed = new Set<string>();
    for (let crop of Object.values(crops)) {
        const current = cropCache.get(crop.id);
        if (current?.crop === crop && (current.t == null || current.t === t)) continue;

        const shape = resolveShape(aactx, cropCache, crop.shape);

        const shapeCenter = centroid(pkPathToSegments(shape).flatMap(coordsFromBarePath));
        const actx: AnimCtx = withLocals(aactx, {center: shapeCenter});
        actx.accessedValues = new Set();

        const mods = resolveEnabledPMods(actx, crop.mods);
        applyModsToPkPath(cropCache, mods, shape);
        cropCache.set(crop.id, {
            path: shape,
            crop,
            t: actx.accessedValues?.has('t') ? t : undefined,
        });
    }
    return allAccessed;
}
