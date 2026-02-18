import {ThinTiling} from '../../../../types';
import {getNewPatternData} from '../../../getPatternData';
import {ShapeKind, ShapeStyle} from '../export-types';
import {sizeBox} from '../hooks/useSVGZoom';
import {State} from '../types/state-type';
import {parseColor} from './colors';

const colorsRaw = '1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf';
export const colors: Array<string> = [];
for (let i = 0; i < colorsRaw.length; i += 6) {
    colors.push('#' + colorsRaw.slice(i, i + 6));
}

export const makeForPattern = (tiling: ThinTiling, hash: string): State => {
    const pd = getNewPatternData(tiling);
    const styles: Record<string, ShapeStyle<ShapeKind>> = {
        s1: {
            kind: [{type: 'alternating', index: 0}],
            disabled: '',
            id: 's1',
            mods: [],
            order: 0,
            items: {
                i1: {
                    id: 'i1',
                    mods: [],
                    order: 0,
                    color: 0,
                },
            },
            t: null,
        },
        s2: {
            kind: [{type: 'alternating', index: 1}],
            disabled: '',
            id: 's2',
            mods: [],
            order: 0,
            items: {
                i1: {
                    id: 'i1',
                    mods: [],
                    order: 0,
                    color: 1,
                },
            },
            t: null,
        },
    };

    return {
        version: 1,
        shapes: {},
        rootGroup: 'root-group',
        entities: {
            'root-group': {
                type: 'Group',
                id: 'root-group',
                disabled: '',
                shared: {},
                opacity: 1,
                entities: {'one-pattern': 0},
            },
            'one-pattern': {
                type: 'Pattern',
                adjustments: {},
                id: 'one-pattern',
                disabled: false,
                shared: {},
                mods: [],
                psize: {type: 'uniform', size: 3},
                contents: {
                    cid: {type: 'shapes', styles, id: 'cid', order: 0, disabled: ''},
                },
                tiling: {id: hash, tiling},
            },
        },
        exports: {
            one: {
                id: 'one',
                config: {
                    type: '2d',
                    box: {x: -1, y: -1, width: 2, height: 2},
                    scale: 200,
                },
            },
        },
        crops: {},
        styleConfig: {
            seed: 0,
            palette: colors.map((color) => parseColor(color)!),
            timeline: {ts: [], lanes: []},
        },
        view: {center: {x: 0, y: 0}, ppu: 100},
    };
};
