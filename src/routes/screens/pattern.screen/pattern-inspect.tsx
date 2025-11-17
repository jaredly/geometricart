/**
 * - congruent/parallel line segments
 * - measure/compare distances
 * - measure/compare angles
 * - congruent distances (excluding line segments)
 * - congruent angles
 */

import {useMemo} from 'react';
import {Tiling} from '../../../types';
import {getPatternData} from '../../getPatternData';
import {shapeD} from '../../shapeD';

export const PatternInspect = ({tiling}: {tiling: Tiling}) => {
    const size = 600;
    const data = useMemo(() => getPatternData(tiling, undefined, 1), [tiling]);

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="-5 -5 10 10"
            // viewBox="-3 -3 6 6"
            // viewBox="-1.5 -1.5 3 3"
            style={size ? {background: 'black', width: size, height: size} : undefined}
        >
            {data.shapes.map((shape, i) => (
                <path
                    d={shapeD(shape)}
                    key={i}
                    fill={
                        data.colorInfo.colors[i] === -1
                            ? '#444'
                            : //   : `hsl(${
                              //         (data.colorInfo.colors[i] /
                              //             (data.colorInfo.maxColor + 1)) *
                              //         360
                              //     } 100% 50%)`
                              `hsl(100 0% ${
                                  (data.colorInfo.colors[i] / (data.colorInfo.maxColor + 1)) * 40 +
                                  30
                              }%)`
                    }
                    stroke="none"
                    // stroke="black"
                    // strokeWidth={0.01}
                />
            ))}
            {data.allSegments.map((line, i) => (
                <path
                    d={shapeD(line, false)}
                    stroke={'white'}
                    strokeWidth={data.minSegLength / 5}
                    strokeLinejoin="round"
                    cursor={'pointer'}
                    strokeLinecap="round"
                    // strokeWidth={0.01}
                    fill="none"
                    key={i}
                />
            ))}
        </svg>
    );
};
