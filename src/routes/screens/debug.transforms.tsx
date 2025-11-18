import {useMemo} from 'react';
import {
    applyTilingTransforms,
    applyTilingTransformsG,
    tilingPoints,
    transformShape,
} from '../../editor/tilingPoints';
import {initialTransform} from '../../editor/tilingTransforms';
import {eigenShapeTransform} from '../../editor/eigenShapeTransform';
import {coordKey} from '../../rendering/coordKey';
import {applyMatrices} from '../../rendering/getMirrorTransforms';
import {Coord, Tiling} from '../../types';
import {getAllPatterns, getPattern} from '../db.server';
import {shapeD} from '../shapeD';
import {cmpCoords, edgesByEndpoint, shapesFromSegments, unique} from '../shapesFromSegments';
import type {Route} from './+types/debug.transforms';
import {pklip, pkPathFromCoords} from '../getPatternData';
import {pk} from '../pk';
import {cmdsToSegments} from '../../gcode/cmdsToSegments';

export function loader() {
    // const ids = [
    //     'cb96afc94b6bbca038701082f24dd0ec9148681a',
    //     '4cd2511046cda82564aab820aa9eb4aa6b408927',
    //     'f9f9097acf65b41ae7a6a55054dacba46e716844',
    //     '592231b4105bb3c65be5774f6aaa6deecc16df72',
    //     'f4b2a6afda1ed2968d9f72d139c92bd71866409d',
    //     '669d259757d7d633c347f8e77797b93f6f3b21b9',
    // ];
    // const ids = [
    //     'cb866e124c59e50c62b62ad82517039e7535f994',
    //     'c4c1e062af2dacbad7762e117680021cabe6256f',
    //     'be45d8519f7ae771ea18910aafea90cfc530c190',
    //     'b75d9786fa303b1bd96a6440fe5a8eae08f30738',
    //     'e6680186a01f0907a2c4e6718a333d4046a7cb44',
    //     'bde1d4fb0392c9bd68ab9ee99f1221758b797411',
    //     '6c673756253fe527c3b2438b1e882957e10f030c',
    //     '146261645336e48af0731c38718ad95284ea7bf7',
    // ];
    // return ids.map((id) => getPattern(id)!);
    return getAllPatterns();
}

const Transform = ({tiling, id}: {tiling: Tiling; id: string}) => {
    const size = 400;
    const data = useMemo(() => {
        const pts = tilingPoints(tiling.shape);
        const eigenSegments = tiling.cache.segments.map(
            (s) => [s.prev, s.segment.to] as [Coord, Coord],
        );
        const eigenPoints = unique(eigenSegments.flat(), coordKey);

        const ttt = initialTransform(tiling.shape, pts[2], pts);

        const allSegments = unique(
            applyTilingTransforms(eigenSegments, ttt).map((seg) =>
                cmpCoords(seg[0], seg[1]) === 1 ? ([seg[1], seg[0]] as [Coord, Coord]) : seg,
            ),
            ([a, b]) => `${coordKey(a)}:${coordKey(b)}`,
        );

        const byEndPoint = edgesByEndpoint(allSegments);
        const bounds = pkPathFromCoords(pts)!;
        const shapes = shapesFromSegments(byEndPoint, eigenPoints).filter((shape) => {
            const p = pkPathFromCoords(shape)!;
            p.op(bounds, pk.PathOp.Intersect);
            const shapes = cmdsToSegments([...p.toCmds()]);
            p.delete();
            return shapes.filter((s) => s.segments.length).length;
        });
        bounds.delete();

        const x = 4;
        const y = Math.round(Math.abs(pts[2].x / pts[2].y) * x);

        const st = eigenShapeTransform(tiling.shape, pts[2], pts, {x, y});
        // const st = eigenShapeTransform(tiling.shape, pts[2], pts, {x: 6, y: 6});
        const transformedShapes = applyTilingTransformsG(shapes, st, transformShape);
        return {
            allSegments,
            oshapes: shapes,
            shapes: transformedShapes,
            bounds: pts,
            sbounds: applyTilingTransformsG([pts], st, (pts, tx) =>
                pts.map((p) => applyMatrices(p, tx)),
            ),
            tbounds: applyTilingTransformsG([pts], ttt, (pts, tx) =>
                pts.map((p) => applyMatrices(p, tx)),
            ),
        };
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
                ))}
                {data.allSegments.flat().map((pt, i) => (
                    <circle
                        key={i}
                        cx={pt.x.toFixed(3)}
                        cy={pt.y.toFixed(3)}
                        r={0.01}
                        fill="red"
                        stroke="none"
                    />
                ))} */}
                {/* <path d={shapeD(data.bounds)} stroke="white" strokeWidth={0.04} fill="none" />
                {data.tbounds.map((b, i) => (
                    <path
                        key={i}
                        d={shapeD(b)}
                        stroke="rgba(200,0,0,0.3)"
                        strokeWidth={0.04}
                        fill="none"
                    />
                ))} */}
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
