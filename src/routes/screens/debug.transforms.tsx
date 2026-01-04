import {useMemo} from 'react';
import {
    applyTilingTransforms,
    applyTilingTransformsG,
    tilingPoints,
    transformShape,
} from '../../editor/tilingPoints';
import {initialTransform} from '../../editor/tilingTransforms';
import {eigenShapeTransform, xyratio} from '../../editor/eigenShapeTransform';
import {coordKey} from '../../rendering/coordKey';
import {applyMatrices, dist} from '../../rendering/getMirrorTransforms';
import {Coord, Tiling} from '../../types';
import {getAllPatterns, getPattern} from '../db.server';
import {shapeD} from '../shapeD';
import {cmpCoords, edgesByEndpoint, shapesFromSegments, unique} from '../shapesFromSegments';
import type {Route} from './+types/debug.transforms';
import {
    getNewPatternData,
    pkPathFromCoords,
    preTransformTiling,
    shapeBoundsKey,
} from '../getPatternData';
import {pk} from '../pk';
import {cmdsToSegments} from '../../gcode/cmdsToSegments';
import {thinTiling} from './pattern.screen/render/renderPattern';

export function loader() {
    const ids = [
        'f00b08b44823547ff20ffdd9e17a2d9748f22083',
        'be45d8519f7ae771ea18910aafea90cfc530c190',
        'cb866e124c59e50c62b62ad82517039e7535f994',
        'bde1d4fb0392c9bd68ab9ee99f1221758b797411',
    ];
    return ids.map((id) => getPattern(id)!);
    // return getAllPatterns();
}

const Transform = ({tiling, id}: {tiling: Tiling; id: string}) => {
    const size = 400;
    const data = useMemo(() => {
        const cs = 2;
        return getNewPatternData(thinTiling(tiling), 3, [
            {
                segments: [
                    {type: 'Line', to: {x: cs, y: -cs}},
                    {type: 'Line', to: {x: -cs, y: -cs}},
                    {type: 'Line', to: {x: -cs, y: cs}},
                    {type: 'Line', to: {x: cs, y: cs}},
                ],
            },
        ]);
    }, [tiling]);
    return (
        <div>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                // viewBox="-10 -10 20 20"
                viewBox="-5 -5 10 10"
                // viewBox="-3 -3 6 6"
                // viewBox="-1.5 -1.5 3 3"
                style={size ? {background: 'black', width: size, height: size} : undefined}
            >
                {data.shapes.map((shape, i) => (
                    <path
                        d={shapeD(shape)}
                        key={i}
                        fill={'rgba(255,255,255,0.2)'}
                        // fill={`hsla(100,0%,${(i / data.shapes.length) * 80 + 20}%, 0.5)`}
                        // stroke="none"
                        stroke="black"
                        strokeWidth={0.01}
                    />
                ))}
                {/* {data.oshapes.map((shape, i) => (
                    <path
                        d={shapeD(shape)}
                        key={i}
                        // fill={'rgba(255,255,255,0.2)'}
                        // fill={`hsla(100,0%,${(i / data.shapes.length) * 80 + 20}%, 0.5)`}
                        // stroke="none"
                        fill="none"
                        stroke="black"
                        strokeWidth={0.05}
                    />
                ))} */}
                {/* {data.allSegments.map((shp, i) => (
                    <path
                        key={i}
                        d={shapeD(shp, false)}
                        strokeWidth={0.02}
                        stroke="blue"
                        fill="none"
                    />
                ))} */}
                {/* {data.allSegments.flat().map((pt, i) => (
                    <circle
                        key={i}
                        cx={pt.x.toFixed(3)}
                        cy={pt.y.toFixed(3)}
                        r={0.01}
                        fill="red"
                        stroke="none"
                    />
                ))} */}
                {/* <path d={shapeD(data.bounds)} stroke="white" strokeWidth={0.04} fill="none" /> */}
                {/* {data.sbounds.map((b, i) => (
                    <path
                        key={i}
                        d={shapeD(b)}
                        fill="none"
                        opacity={0.4}
                        stroke="red"
                        strokeWidth={0.02}
                    />
                ))} */}
            </svg>
            <div style={{fontSize: 8}}>{id}</div>
        </div>
    );
};

export default function DebugTransforms({loaderData}: Route.ComponentProps) {
    return (
        <div className="flex flex-wrap gap-4 p-4">
            {loaderData.map((pattern) => (
                <Transform id={pattern.hash} tiling={pattern.tiling} key={pattern.hash} />
            ))}
        </div>
    );
}
