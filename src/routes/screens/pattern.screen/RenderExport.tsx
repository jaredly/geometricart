// so svg I think

import {Tiling} from '../../../types';
import {EObject, Group, Layer, Mods, Pattern, State} from './export-types';

type AnimCtx = Record<string, any>;

// note - do a cache
type Ctx = {
    state: State;
    anim: Record<string, any>;
    layer: Layer;
    patterns: Patterns;
    items: React.ReactNode[];
};

const resolveMods = (mods: Mods) => {};

const renderPattern = (ctx: Ctx, crops: Group['crops'], pattern: Pattern) => {
    //
    const tiling = ctx.patterns[pattern.id];
    pattern.mods;
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

type Patterns = Record<string, Tiling>;
const svgItems = (state: State, anim: AnimCtx, patterns: Patterns) => {
    const items: React.ReactNode[] = [];
    for (let layer of Object.values(state.layers)) {
        const group = layer.entities[layer.rootGroup];
        if (group.type !== 'Group') {
            throw new Error(`root not a group`);
        }
        renderGroup({state, anim, layer, patterns, items}, [], group);
    }
};

export const RenderExport = ({state, patterns}: {state: State; patterns: Patterns}) => {
    // ok
};
