import {ThinTiling} from '../../../../types';
import {getNewPatternData} from '../../../getPatternData';
import {ShapeStyle} from '../export-types';
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
    const styles: Record<string, ShapeStyle> = {};
    for (let i = 0; i <= pd.colorInfo.maxColor; i++) {
        styles[`alt-${i}`] = {
            id: `alt-${i}`,
            fills: {
                [`fill-${i}`]: {
                    id: `fill-${i}`,
                    mods: [],
                    color: i,
                },
            },
            lines: {},
            kind: {type: 'alternating', index: i},
            mods: [],
            order: i,
        };
    }
    return {
        shapes: {},
        layers: {
            root: {
                id: 'root',
                rootGroup: 'root-group',
                entities: {
                    'root-group': {
                        type: 'Group',
                        id: 'root-group',
                        entities: {'one-pattern': 0},
                    },
                    'one-pattern': {
                        type: 'Pattern',
                        adjustments: {},
                        id: 'one-pattern',
                        mods: [],
                        psize: 3,
                        contents: {type: 'shapes', styles},
                        tiling: {id: hash, tiling},
                    },
                },
                guides: [],
                opacity: 1,
                order: 0,
                shared: {},
            },
        },
        crops: {},
        styleConfig: {
            seed: 0,
            palette: colors.map((color) => parseColor(color)!),
            timeline: {ts: [], lanes: []},
        },
        view: {box: sizeBox(3), ppi: 1},
    };
};
