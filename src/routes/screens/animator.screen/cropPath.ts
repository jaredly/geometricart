import {findPathDataIntersections, PathCommand, type PathData} from './svgPathIntersections';
// import {findPathDataIntersections, PathCommand, type PathData} from './svg-path-intersections.js';
import {ArcSegment, BarePath, Coord, Segment, SegPrev} from '../../../types';
import {angleTo, dist, push} from '../../../rendering/getMirrorTransforms';
import {isLargeArc} from '../../../editor/RenderPendingPath';
import {pk, PKPath} from '../../pk';
import {svgArcToSkiaConics} from './svgArcToSkiaConic';
import {pointOnPath, splitSegment} from './splitSegment';
import {coordsEqual} from '../../../rendering/pathsAreIdentical';
import {angleBetween} from '../../../rendering/isAngleBetween';

// console.log(spi.parsePathDataNormalized('M0 0L10 3'));
// spi.findPathDataIntersections(pd1, pd2)

const arcToCoords = (prev: Coord, next: ArcSegment) => {
    const t0 = angleTo(next.center, prev);
    const t1 = angleTo(next.center, next.to);
    const rad = dist(next.center, next.to);
    const btw = angleBetween(t0, t1, next.clockwise);
    const diff = Math.PI / 20;
    const count = btw / diff;
    const res: Segment[] = [];
    for (let i = 0; i < count; i++) {
        res.push({type: 'Line', to: push(next.center, t0 + i * diff, rad)});
    }
    return res;
};

export const segToCmds = (segment: Segment, prev: Coord): number[] => {
    if (segment.type === 'Arc') {
        const r = dist(segment.to, segment.center);

        const largeArc = isLargeArc(segment, prev) ? 1 : 0;
        const sweep = segment.clockwise ? 1 : 0;

        // const conics = svgArcToSkiaConics(
        //     prev.x,
        //     prev.y,
        //     r,
        //     r,
        //     0,
        //     largeArc,
        //     sweep,
        //     segment.to.x,
        //     segment.to.y,
        // );
        // return conics.flatMap(({cx, cy, w, x, y}) => [pk.CONIC_VERB, cx, cy, w, x, y]);
        return arcToCoords(prev, segment).flatMap((seg) => [pk.LINE_VERB, seg.to.x, seg.to.y]);
    }
    return segment.type === 'Line'
        ? [pk.LINE_VERB, segment.to.x, segment.to.y]
        : [pk.QUAD_VERB, segment.control.x, segment.control.y, segment.to.x, segment.to.y];
};

export const segToPathCommand = (segment: Segment, prev: Coord): PathCommand => {
    if (segment.type === 'Arc') {
        const r = dist(segment.to, segment.center);

        const largeArc = isLargeArc(segment, prev) ? 1 : 0;
        const sweep = segment.clockwise ? 1 : 0;

        return {type: 'A', values: [r, r, 0, largeArc, sweep, segment.to.x, segment.to.y]};
    }
    return segment.type === 'Line'
        ? {type: 'L', values: [segment.to.x, segment.to.y]}
        : {type: 'Q', values: [segment.control.x, segment.control.y, segment.to.x, segment.to.y]};
};

const segsToPathData = (origin: Coord, segments: Segment[]): PathData => {
    return [
        {type: 'M', values: [origin.x, origin.y]},
        ...segments.map((seg, i) => segToPathCommand(seg, i === 0 ? origin : segments[i - 1].to)),
    ];
};

export const clipToPathData = (clip: Segment[]) => {
    return segsToPathData(clip[clip.length - 1].to, clip).concat([{type: 'Z', values: []}]);
};

export const splitSegByClip = (clip: PathData, path: SegPrev) => {
    const intersectons = findPathDataIntersections(
        clip,
        segsToPathData(path.prev, [path.segment]),
        false,
        'high',
    );
    return splitSegment(path.prev, path.segment, intersectons);
    // return parts.map((segment, i) => {
    //     const prev = i === 0 ? path.prev : parts[i - 1].to;
    //     return {prev, segment};
    // });
};

const lastPoint = (path: BarePath) => path.segments[path.segments.length - 1].to;

export const splitPathByClip = (clipData: PathData, clipk: PKPath, path: BarePath) => {
    // TODO: 'make a final Z line, at the end check if we end at the start'
    if (!path.open) throw new Error('not handled');
    const result: {path: BarePath; inside: boolean}[] = [];
    path.segments.forEach((segment, i) => {
        const prev = i === 0 ? path.origin : path.segments[i - 1].to;
        const parts = splitSegByClip(clipData, {prev, segment});
        parts.forEach((part, i) => {
            const pprev = i === 0 ? prev : parts[i - 1].to;
            const mid = pointOnPath(pprev, part, 0.5);
            const inside = clipk.contains(mid.x, mid.y);
            if (
                result.length &&
                result[result.length - 1].inside === inside &&
                coordsEqual(pprev, lastPoint(result[result.length - 1].path))
            ) {
                result[result.length - 1].path.segments.push(part);
            } else {
                result.push({
                    inside,
                    path: {origin: pprev, segments: [part], open: true},
                });
            }
        });
    });
    return result;
};

export const pkPathWithCmds = (origin: Coord, segments: Segment[], open = false) => {
    const got = pk.Path.MakeFromCmds([
        pk.MOVE_VERB,
        origin.x,
        origin.y,
        ...segments.flatMap((seg, i) => segToCmds(seg, i === 0 ? origin : segments[i - 1].to)),
        ...(open ? [] : [pk.CLOSE_VERB]),
    ]);
    if (!got) throw new Error(`unable to construct path`);
    return got;
};

// export const clipPathSegment = (
//     clip: Segment[],
//     path: SegPrev,
// ): (SegPrev & {inside: boolean})[] => {
//     const c0 = clip[clip.length - 1].to;
//     const intersectons = spi.findPathDataIntersections(
//         segsToPathData(c0, clip).concat([{type: 'Z', values: []}]),
//         segsToPathData(path.prev, [path.segment]),
//     );
//     const clipPath = pk.Path.MakeFromCmds([
//         pk.MOVE_VERB,
//         c0.x,
//         c0.y,
//         ...clip.flatMap((seg, i) => segToCmds(seg, i === 0 ? c0 : clip[i - 1].to)),
//         pk.CLOSE_VERB,
//     ])!;
//     const parts = splitSegment(path.prev, path.segment, intersectons);
//     return parts.map((segment, i) => {
//         const prev = i === 0 ? path.prev : parts[i - 1].to;
//         const mid = pointOnPath(prev, segment, 0.5);
//         if (clipPath.contains(mid.x, mid.y)) {
//         }
//         return {prev, segment, inside: clipPath.contains(mid.x, mid.y)};
//     });
// };
