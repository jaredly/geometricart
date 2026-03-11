import {useMemo} from 'react';
import {ThinTiling} from '../../../../types';
import {getSimplePatternData, getShapeColors} from '../../../getPatternData';
import {shapeD} from '../../../shapeD';

export const PatternPreview = ({tiling}: {tiling: ThinTiling}) => {
    const data = useMemo(
        () => getSimplePatternData(tiling, {type: 'coord', coord: {x: 3, y: 1}}),
        [tiling],
    );
    const colors = useMemo(() => getShapeColors(data.uniqueShapes, data.minSegLength), [data]);
    return (
        <svg
            viewBox={`-2 -1 2 1`}
            style={{background: 'black', width: 100, height: 25, marginRight: 8}}
        >
            {data.uniqueShapes.map((shape, i) => (
                <path key={i} fill={colors.colors[i] === 0 ? '#333' : '#000'} d={shapeD(shape)} />
            ))}
        </svg>
    );
};
