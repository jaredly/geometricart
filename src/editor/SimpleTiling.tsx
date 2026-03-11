import {useMemo} from 'react';
import {Tiling} from '../types';
import {getSvgData} from './handleTiling';
import {TilingSvg} from './TilingSvg';

const PREFIX = '<!-- TILING:';
const SUFFIX = '-->';

export const SimpleTiling = ({tiling}: {tiling: Tiling}) => {
    const {bounds, lines} = useMemo(() => getSvgData(tiling), [tiling]);

    return (
        <a
            href=""
            download={'tiling-' + tiling.cache.hash + '.svg'}
            onClick={(evt) => {
                const txt = evt.currentTarget.innerHTML;
                const blob = new Blob([txt + PREFIX + JSON.stringify(tiling) + SUFFIX], {
                    type: 'image/svg+xml',
                });
                const url = URL.createObjectURL(blob);
                evt.currentTarget.href = url;
                setTimeout(() => {
                    evt.currentTarget.href = '';
                    URL.revokeObjectURL(url);
                }, 0);
            }}
        >
            <TilingSvg bounds={bounds} lines={lines} shapes={tiling.cache.shapes} />
        </a>
    );
};
