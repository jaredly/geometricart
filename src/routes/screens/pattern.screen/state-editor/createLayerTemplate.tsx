import {Segment, ThinTiling} from '../../../../types';
import {
    PMods,
    Layer,
    Group,
    Pattern,
    AnimatableNumber,
    ShapeStyle,
    Fill,
    Line,
    ShapeKind,
} from '../export-types';

export const addMod = (type: string): PMods => {
    switch (type) {
        case 'inset':
            return {type, v: 1};
        case 'translate':
            return {type, v: {x: 0, y: 0}};
        case 'crop':
            return {type, id: ''};
        case 'scale':
            return {type, v: 2};
        case 'rotate':
            return {type, v: 1};
        default:
            throw new Error(`bad mod type: ${type}`);
    }
};
export const createLayerTemplate = (id: string): Layer => ({
    id,
    order: 0,
    opacity: 1,
    rootGroup: 'root',
    entities: {},
    guides: [],
    shared: {},
});

export const createGroup = (id: string): Group => ({
    type: 'Group',
    id,
    name: id,
    entities: {},
});

export const createPattern = (id: string, hash: string, tiling: ThinTiling): Pattern => ({
    type: 'Pattern',
    id,
    tiling: {id: hash, tiling},
    adjustments: {},
    psize: {x: 1, y: 1},
    contents: {type: 'shapes', styles: {}},
    mods: [],
});
const defaultCropShape = (): Segment[] => [
    {type: 'Line', to: {x: 1, y: 0}},
    {type: 'Line', to: {x: 1, y: 1}},
    {type: 'Line', to: {x: 0, y: 1}},
    {type: 'Line', to: {x: 0, y: 0}},
];

export const parseAnimatable = (value: string): AnimatableNumber => {
    const trimmed = value.trim();
    if (!trimmed) return '' as unknown as AnimatableNumber;
    const num = Number(trimmed);
    return Number.isFinite(num) ? (num as AnimatableNumber) : (trimmed as AnimatableNumber);
};

export const createShapeStyle = (id: string): ShapeStyle<ShapeKind> => ({
    id,
    order: 0,
    kind: {type: 'everything'},
    fills: {},
    lines: {},
    mods: [],
});

export const createFill = (id: string): Fill => ({
    id,
    mods: [],
});

export const createLine = (id: string): Line => ({
    id,
    mods: [],
});
