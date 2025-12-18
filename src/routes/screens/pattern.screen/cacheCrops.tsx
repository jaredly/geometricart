import {Path as PKPath} from 'canvaskit-wasm';
import {pkPathWithCmds} from '../animator.screen/cropPath';
import {AnimCtx} from './evaluate';
import {State, Crop} from './export-types';
import {resolveEnabledPMods, pathMod} from './resolveMods';
import {globals} from './eval-globals';

export function cacheCrops(
    crops: State['crops'],
    shapes: State['shapes'],
    cropCache: Map<string, {path: PKPath; crop: Crop; t?: number}>,
    t: number,
    animCache: Map<string, {fn: (ctx: AnimCtx['values']) => any; needs: string[]}>,
) {
    for (let crop of Object.values(crops)) {
        const current = cropCache.get(crop.id);
        if (current?.crop === crop && (current.t == null || current.t === t)) continue;

        const shape = shapes[crop.shape];

        if (!crop.mods?.length) {
            const path = pkPathWithCmds(shape.origin, shape.segments);
            cropCache.set(crop.id, {path, crop});
        } else {
            const actx: AnimCtx = {
                accessedValues: new Set(),
                values: {t, ...globals},
                cache: animCache,
                palette: [],
                warn: (v) => console.warn(v),
            };
            const cropmods = resolveEnabledPMods(actx, crop.mods);

            const path = pkPathWithCmds(shape.origin, shape.segments);

            let remove = false;
            cropmods.forEach((mod) => {
                remove = remove || pathMod(cropCache, mod, path);
            });

            cropCache.set(crop.id, {path, crop, t: actx.accessedValues?.size ? t : undefined});
        }
    }
}
