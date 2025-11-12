import React, {useMemo} from 'react';
import {tilingPoints, applyTilingTransformsG} from '../../../editor/tilingPoints';
import {
    getShapeSize,
    getTilingTransforms,
    tilingTransforms,
} from '../../../editor/tilingTransforms';
import {applyMatrices} from '../../../rendering/getMirrorTransforms';
import {Segment, Tiling} from '../../../types';
import {shapeD} from '../../shapeD';
import {segmentsBounds} from '../../../editor/Bounds';
import {calcPathD, calcSegmentsD} from '../../../editor/calcPathD';

export const SimplePreview = React.memo(
    ({tiling, size, color}: {color: string; tiling: Tiling; size: number}) => {
        const all = useMemo(() => {
            return applyTilingTransformsG(
                tiling.cache.segments.map((s) => [s.prev, s.segment.to]),
                getTilingTransforms(tiling.shape),
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

export const CropPreview = React.memo(
    ({segments, size, color}: {color: string; segments: Segment[]; size: number}) => {
        const bounds = useMemo(() => segmentsBounds(segments), [segments]);
        const which = Math.max(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0);
        const m = which / 10;
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox={`${bounds.x0 - m} ${bounds.y0 - m} ${bounds.x1 - bounds.x0 + m * 2} ${bounds.y1 - bounds.y0 + m * 2}`}
                style={{background: 'black', width: size, height: size}}
            >
                <path
                    d={calcSegmentsD(segments, segments[segments.length - 1].to, false, 1)}
                    fill="none"
                    stroke={color}
                    strokeWidth={which / 100}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    },
);
