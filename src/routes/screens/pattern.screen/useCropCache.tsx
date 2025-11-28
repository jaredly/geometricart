import {Path as PKPath} from 'canvaskit-wasm';
import {useMemo} from 'react';
import {pkPathWithCmds} from '../animator.screen/cropPath';
import {AnimCtx} from './evaluate';
import {State, Crop} from './export-types';
import {resolvePMod, pathMod} from './resolveMods';

export function useCropCache(
    state: State,
    t: number,
    animCache: Map<string, {fn: (ctx: AnimCtx['values']) => any; needs: string[]}>,
) {
    const cropCache = useMemo(() => new Map<string, {path: PKPath; crop: Crop; t?: number}>(), []);

    useMemo(() => {
        for (let crop of Object.values(state.crops)) {
            const current = cropCache.get(crop.id);
            if (current?.crop === crop && (current.t == null || current.t === t)) continue;

            if (!crop.mods?.length) {
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
                const cropmods = crop.mods.map((m) => resolvePMod(actx, m));

                const path = pkPathWithCmds(crop.shape[crop.shape.length - 1].to, crop.shape);

                let remove = false;
                cropmods.forEach((mod) => {
                    remove = remove || pathMod(cropCache, mod, path);
                });

                cropCache.set(crop.id, {path, crop, t: actx.accessedValues?.size ? t : undefined});
            }
        }
    }, [state.crops, cropCache, t, animCache]);

    return cropCache;
}
