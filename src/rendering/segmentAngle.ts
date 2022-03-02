import { Coord, Segment } from '../types';
import { angleTo, dist, push } from './getMirrorTransforms';
import { angleBetween } from './findNextSegments';

export const segmentAngle = (
    prev: Coord,
    segment: Segment,
    initial: boolean = true,
    real: boolean = false,
) => {
    if (segment.type === 'Line') {
        return angleTo(prev, segment.to);
    }
    if (initial) {
        if (real) {
            return (
                angleTo(segment.center, prev) +
                (Math.PI / 2) * (segment.clockwise ? 1 : -1)
            );
        }
        const t1 = angleTo(segment.center, prev);
        const t2 = angleTo(segment.center, segment.to);
        const bt = angleBetween(t1, t2, segment.clockwise);
        const tm = t1 + (bt / 2) * (segment.clockwise ? 1 : -1); // (t1 + t2) / 2;
        const d = dist(segment.center, segment.to);
        const midp = push(segment.center, tm, d);
        // console.log(segment, t1, t2, bt, tm);
        // const midp =
        // tangent at prev,
        return angleTo(prev, midp);
        // return (
        //     angleTo(segment.center, prev) +
        //     (Math.PI / 2) * (segment.clockwise ? 1 : -1)
        // );
    } else {
        // tangent at land
        return (
            angleTo(segment.center, segment.to) +
            (Math.PI / 2) * (segment.clockwise ? 1 : -1)
        );
    }
};
