import {Path as PKPath} from 'canvaskit-wasm';
import {useMemo} from 'react';
import {AnimCtx} from './evaluate';
import {State, Crop} from './export-types';
import {cacheCrops} from './cacheCrops';

export function useCropCache(
    state: State,
    t: number,
    animCache: Map<string, {fn: (ctx: AnimCtx['values']) => any; needs: string[]}>,
) {
    const cropCache = useMemo(() => new Map<string, {path: PKPath; crop: Crop; t?: number}>(), []);

    useMemo(() => {
        cacheCrops(state.crops, state.shapes, cropCache, t, animCache);
    }, [state.crops, state.shapes, cropCache, t, animCache]);

    return cropCache;
}
