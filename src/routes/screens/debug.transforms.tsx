import {useMemo} from 'react';
import {
    applyTilingTransforms,
    applyTilingTransformsG,
    tilingPoints,
} from '../../editor/tilingPoints';
import {initialTransform} from '../../editor/tilingTransforms';
import {coordKey} from '../../rendering/coordKey';
import {applyMatrices} from '../../rendering/getMirrorTransforms';
import {Coord, Tiling} from '../../types';
import {getPattern} from '../db.server';
import {shapeD} from '../shapeD';
import {cmpCoords, edgesByEndpoint, shapesFromSegments, unique} from '../shapesFromSegments';
import type {Route} from './+types/debug.transforms';
import {pklip, pkPathFromCoords} from '../getPatternData';
import {pk} from '../pk';
import {cmdsToSegments} from '../../gcode/cmdsToSegments';

export function loader() {
    const ids = [
        'cb866e124c59e50c62b62ad82517039e7535f994',
        'c4c1e062af2dacbad7762e117680021cabe6256f',
        'be45d8519f7ae771ea18910aafea90cfc530c190',
        'b75d9786fa303b1bd96a6440fe5a8eae08f30738',
        'e6680186a01f0907a2c4e6718a333d4046a7cb44',
        'bde1d4fb0392c9bd68ab9ee99f1221758b797411',
        '6c673756253fe527c3b2438b1e882957e10f030c',
        '146261645336e48af0731c38718ad95284ea7bf7',
    ];
    return ids.map((id) => getPattern(id)!);
    // return getAllPatterns();
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

        // return getPatternData(tiling, undefined, 1);
        return {
            allSegments,
            shapes,
            bounds: pts,
            tbounds: applyTilingTransformsG([pts], ttt, (pts, tx) =>
                pts.map((p) => applyMatrices(p, tx)),
            ),
        };
    }, [tiling]);
    return (
        <div>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                // viewBox="-5 -5 10 10"
                viewBox="-3 -3 6 6"
                // viewBox="-1.5 -1.5 3 3"
                style={size ? {background: 'black', width: size, height: size} : undefined}
            >
                {data.shapes.map((shape, i) => (
                    <path
                        d={shapeD(shape)}
                        key={i}
                        fill={`hsl(100,0%,${(i / data.shapes.length) * 80 + 20}%)`}
                        stroke="none"
                        // stroke="black"
                        // strokeWidth={0.01}
                    />
                ))}
                {data.allSegments.map((shp, i) => (
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
                ))}
                <path d={shapeD(data.bounds)} stroke="white" strokeWidth={0.04} fill="none" />
                {data.tbounds.map((b, i) => (
                    <path
                        key={i}
                        d={shapeD(b)}
                        stroke="rgba(200,0,0,0.3)"
                        strokeWidth={0.04}
                        fill="none"
                    />
                ))}
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
