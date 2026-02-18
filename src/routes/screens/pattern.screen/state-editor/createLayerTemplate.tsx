import {Coord, Segment, ThinTiling} from '../../../../types';
import {
    PMods,
    EntityRoot,
    Group,
    Pattern,
    AnimatableNumber,
    ShapeStyle,
    Fill,
    Line,
    ShapeKind,
} from '../export-types';

export const addMod = (type: PMods['type']): PMods => {
    switch (type) {
        case 'inset':
            return {type, v: 1};
        case 'translate':
            return {type, v: '0,0'};
        case 'crop':
            return {type, id: ''};
        case 'scale':
            return {type, v: 2};
        case 'rotate':
            return {type, v: 1};
        case 'stroke':
            return {type, width: 1, round: false};
        case 'inner':
            return {type};
        default:
            throw new Error(`bad mod type: ${type}`);
    }
};
export const createLayerTemplate = (_id: string): EntityRoot => ({
    rootGroup: 'root',
    entities: {},
});

export const createGroup = (id: string): Group => ({
    type: 'Group',
    id,
    name: id,
    entities: {},
    disabled: '',
    shared: {},
    opacity: 1,
});

export const createPattern = (id: string, hash: string, tiling: ThinTiling): Pattern => ({
    type: 'Pattern',
    id,
    tiling: {id: hash, tiling},
    adjustments: {},
    psize: {type: 'uniform', size: 1},
    contents: {cid: {id: 'cid', order: 0, type: 'shapes', styles: {}, disabled: ''}},
    mods: [],
    disabled: false,
    shared: {},
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

export const createShapeStyle = <Kind,>(id: string): ShapeStyle<Kind> => ({
    id,
    order: 0,
    kind: [],
    fills: {},
    lines: {},
    mods: [],
    disabled: '',
    t: null,
});

export const createFill = (id: string): Fill => ({
    id,
    color: 0,
    mods: [],
    order: 0,
});

export const createLine = (id: string): Line => ({
    id,
    color: 0,
    width: 1,
    mods: [],
    order: 0,
});
