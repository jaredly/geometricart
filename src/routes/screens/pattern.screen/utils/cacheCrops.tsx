import {Path as PKPath} from 'canvaskit-wasm';
import {pkPathWithCmds} from '../../animator.screen/cropPath';
import {AnimCtx} from '../eval/evaluate';
import {Crop} from '../export-types';
import {State} from '../types/state-type';
import {resolveEnabledPMods, pathMod} from './resolveMods';
import {globals} from '../eval/eval-globals';
import {centroid} from '../../../findReflectionAxes';
import {coordsFromBarePath} from '../../../getPatternData';

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
            const shapeCenter = centroid(coordsFromBarePath(shape));
            const actx: AnimCtx = {
                accessedValues: new Set(),
                values: {...globals, t, center: shapeCenter},
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
    // console.log('cached crops', cropCache);
}
