
import {BarePath, Coord, SegPrev, Segment, State, Tiling} from '../types';
import {consumePath, getVisiblePaths, pkClips} from '../rendering/pkInsetPaths';
import {PK} from './pk';
import {pkPath} from '../sidebar/pkClipPaths';
import {addPrevsToSegments} from '../rendering/segmentsToNonIntersectingSegments';
import {SlopeIntercept, lineToSlope, slopeToLine} from '../rendering/intersect';
import {numKey} from '../rendering/coordKey';
import {applyMatrix, scaleMatrix} from '../rendering/getMirrorTransforms';
import {transformBarePath, } from '../rendering/points';
import {tilingPoints, eigenShapesToLines} from './tilingPoints';
import {SegmentWithPrev} from '../rendering/clipPathNew';

export const simpleExport = async (state: State, shape: Tiling['shape']) => {
    const pts = tilingPoints(shape);
    const res = getShapesIntersectingPolygon(state, pts);
    if (!res) {
        return;
    }
    const {klines, shapes, tr, pts: tpts} = res;
    console.log('pts', pts);
    console.log('klins', klines);
    const segs = Object.keys(klines).sort();

    const hash = await hashData(segs.join(','));

    const unique = Object.values(klines).map(slopeToLine);

    return {
        hash,
        segments: unique.map(
            ([p1, p2]): SegPrev => ({
                prev: p1,
                segment: {type: 'Line', to: p2},
            }),
        ),
        shapes,
    };
};

const slopeToPseg = (line: SlopeIntercept): SegmentWithPrev => {
    const [p1, p2] = slopeToLine(line);
    return {prev: p1, segment: {type: 'Line', to: p2}, shape: -1};
};

// Shapes *has* been transformed, by `getTransform(pts)`
// the `pts` that are returned have also been transformed
// klines is our map of deduped lines.
const getShapesIntersectingPolygon = (state: State, pts: Coord[]) => {
    // PathKit doesn't have great precision at the small end. So inflate everything by 100x before calculating.
    const scale = 10000;

    const segments: Segment[] = pts
        .map((p) => applyMatrix(p, scaleMatrix(scale, scale)))
        .map((to) => ({type: 'Line', to}));
    const origin = segments[segments.length - 1].to;

    // const trilines = addPrevsToSegments(
    //     segments.map((seg) => transformSegment(seg, tx)),
    // ).map((seg) => lineToSlope(seg.prev, seg.segment.to, true));
    const klines: Record<string, SlopeIntercept> = {};

    const paths = getVisiblePaths(state.paths, state.pathGroups);
    const pkc = {
        path: pkPath(PK, segments, origin),
        outside: false,
    };
    const shapes: BarePath[] = [];
    paths.forEach((id) => {
        const path = state.paths[id];
        const big = transformBarePath(path, [scaleMatrix(scale, scale)]);

        const got = consumePath(
            PK,
            pkClips(PK, pkPath(PK, big.segments, big.origin), [pkc], path)[0],
            path,
        ).map((path) => transformBarePath(path, [scaleMatrix(1 / scale, 1 / scale)]));
        if (!got.length) {
            return;
        }
        const {origin, segments, open} = state.paths[id];
        shapes.push({origin, segments, open});

        const orig = addPrevsToSegments(segments, origin).map((seg) =>
            lineToSlope(seg.prev, seg.segment.to, true),
        );
        const valid: {[key: string]: boolean} = {};
        orig.forEach((sli) => (valid[slopeInterceptKey(sli, false)] = true));
        const gotl = got
            .flatMap((path) => addPrevsToSegments(path.segments, path.origin))
            .map((seg) => lineToSlope(seg.prev, seg.segment.to, true));
        console.log('path', id, path);
        console.log(valid);
        console.log(gotl.map((s) => slopeInterceptKey(s)));
        gotl.forEach((sli) => {
            if (!valid[slopeInterceptKey(sli, false)]) {
                return;
            }
            klines[slopeInterceptKey(sli)] = sli;
        });
    });

    return {
        shapes,
        klines,
        tr: pts[2],
        pts: pts,
    };
};

function slopeInterceptKey(sl: SlopeIntercept, withLimit = true) {
    const sli = `${numKey(sl.b)}:${numKey(sl.m)}`;
    if (!withLimit || !sl.limit) {
        return sli;
    }
    const [min, max] = sl.limit!;
    return `${numKey(sl.limit[0])}:${sli}:${numKey(sl.limit[0])}`;
}

async function hashData(kk: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(kk);
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', data);

    const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
    return hashHex;
}

export function handleTiling(data: Tiling) {
    const pts = tilingPoints(data.shape);
    const bounds = pts;
    const lines = data.cache.segments.map((s): [Coord, Coord] => [s.prev, s.segment.to]);
    const tr = pts[2];
    return {bounds, lines, tr};
}

export function getSvgData(data: Tiling): {
    bounds: Coord[];
    lines: [Coord, Coord][];
} {
    const {bounds, lines, tr} = handleTiling(data);
    return {bounds, lines: eigenShapesToLines(lines, data.shape, tr, bounds)};
}

export const handleNegZero = (n: number) => {
    const m = n.toFixed(2);
    return m === '-0.00' ? '0.00' : m;
};
