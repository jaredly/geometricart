import {angleTo, dist, push} from '../rendering/getMirrorTransforms';
import {BarePath, Coord, Segment} from '../types';
import {arcPath} from './RenderPendingPath';

export const calcPathD = (path: BarePath, zoom: number = 1): string => {
    return calcSegmentsD(path.segments, path.origin, path.open, zoom);
};

export const calcSegmentsD = (
    segments: Array<Segment>,
    origin: Coord,
    open: boolean | undefined,
    zoom: number,
): string => {
    let d = `M ${(origin.x * zoom).toFixed(3)} ${(origin.y * zoom).toFixed(3)}`;
    if (segments.length === 1 && segments[0].type === 'Arc') {
        const arc = segments[0];
        const {center, to} = arc;
        const r = dist(center, to);
        const theta = angleTo(to, center);
        const opposite = push(center, theta, r);
        return calcSegmentsD([{...arc, to: opposite}, arc], origin, open, zoom);
        // this can only happen if we're a pure cicle
    }
    segments.forEach((seg, i) => {
        if (seg.type === 'Line') {
            d += ` L ${(seg.to.x * zoom).toFixed(3)} ${(seg.to.y * zoom).toFixed(3)}`;
        } else if (seg.type === 'Quad') {
            d += ` Q ${(seg.control.x * zoom).toFixed(3)} ${(seg.control.y * zoom).toFixed(
                3,
            )} ${(seg.to.x * zoom).toFixed(3)} ${(seg.to.y * zoom).toFixed(3)}`;
        } else {
            const prev = i === 0 ? origin : segments[i - 1].to;
            d += arcPath(seg, prev, zoom);
        }
    });

    return d + (open ? '' : ' Z');
};
