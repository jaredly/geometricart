import {Coord} from '../../../../types';
import {globals, mulberry32} from '../eval/eval-globals';
import {evalTimeline} from '../eval/evalEase';
import {AnimCtx, Ctx, RenderItem, a} from '../eval/evaluate';
import {expandShapes} from '../utils/expandShapes';
import {State} from '../types/state-type';
import {RenderLog, renderGroup, handleShadowAndZSorting} from '../utils/resolveMods';

export const svgItems = (
    state: State,
    animCache: AnimCtx['cache'],
    cropCache: Ctx['cropCache'],
    t: number,
    debug = false,
) => {
    const warnings: string[] = [];
    const warn = (v: string) => warnings.push(v);
    const items: RenderItem[] = [];
    const keyPoints: Ctx['keyPoints'] = [];
    const byKey: Ctx['byKey'] = {};
    const fromtl = evalTimeline(state.styleConfig.timeline, t);
    // biome-ignore lint: this one is fine
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
            {
                state,
                anim,
                layer,
                items,
                keyPoints,
                cropCache,
                byKey,
                log,
                shapes: expandShapes(state.shapes, state.layers),
            },
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
