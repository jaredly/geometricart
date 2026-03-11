import {Tiling} from '../types';
import {boundsForCoords} from './Bounds';
import {tilingPoints} from './tilingPoints';

export const ShowTiling = ({tiling}: {tiling: Tiling}) => {
    const pts = tilingPoints(tiling.shape);
    const {x0, y0, x1, y1} = boundsForCoords(...pts);
    const w = x1 - x0;
    const h = y1 - y0;
    const m = Math.min(w, h) / 10;

    return (
        <svg
            viewBox={`${x0 - m} ${y0 - m} ${w + m * 2} ${h + m * 2}`}
            style={{background: 'black', width: 50, height: (h / w) * 50}}
        >
            <path
                fill="rgb(100,0,0)"
                d={pts.map(({x, y}, i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')}
            />
        </svg>
    );
};
