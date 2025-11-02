import React, {useMemo} from 'react';
import {tilingPoints, applyTilingTransformsG} from '../../../editor/tilingPoints';
import {tilingTransforms} from '../../../editor/tilingTransforms';
import {applyMatrices} from '../../../rendering/getMirrorTransforms';
import {Tiling} from '../../../types';
import {shapeD} from '../../shapeD';

export const SimplePreview = React.memo(
    ({tiling, size, color}: {color: string; tiling: Tiling; size: number}) => {
        const all = useMemo(() => {
            const pts = tilingPoints(tiling.shape);
            const ttt = tilingTransforms(tiling.shape, pts[2], pts);

            return applyTilingTransformsG(
                tiling.cache.segments.map((s) => [s.prev, s.segment.to]),
                ttt,
                (line, tx) => line.map((coord) => applyMatrices(coord, tx)),
            );
        }, [tiling]);
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="-1.5 -1.5 3 3"
                style={{background: 'black', width: size, height: size}}
            >
                {all.map((line, i) => (
                    <path
                        key={i}
                        d={shapeD(line, false)}
                        fill="none"
                        stroke={color}
                        strokeWidth={0.02}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                ))}
            </svg>
        );
    },
);
