import { angleTo } from './getMirrorTransforms';
import { intersections, Primitive } from './intersect';
import { ArcSegment, Coord, Segment } from '../types';
import { atLineBottom } from './clipPath';
import { atCircleBottomOrSomething } from './atCircleBottomOrSomething';

/** Result > 0 means it's inside. */

export const windingNumber = (
    coord: Coord,
    prims: Array<Primitive>,
    segs: Array<Segment>,
    debug?: boolean,
) => {
    const ray: Primitive = {
        type: 'line',
        m: 0,
        b: coord.y,
        limit: [coord.x, Infinity],
    };
    // let isOnEdge = false;
    let wind: Array<{ prev: Coord; seg: Segment; up: boolean; hit: Coord }> =
        []; // UP is positive, DOWN is negative
    prims.forEach((prim, i) => {
        // if (isOnEdge) {
        //     // bail fast
        //     return;
        // }
        if (prim.type === 'line') {
            if (prim.m === 0) {
                return;
            }
        }

        intersections(prim, ray).forEach((coord) => {
            const prev = segs[i === 0 ? segs.length - 1 : i - 1].to;
            if (prim.type === 'line') {
                // ignore intersections with the "bottom point" of a line
                // we might not need this? because we're taking direction into account
                // hmm yeah I think we do need it. so we don't double-count
                if (atLineBottom(coord, prim)) {
                    return;
                }
                const line = segs[i];
                const dy = line.to.y - prev.y;
                wind.push({
                    prev,
                    seg: line,
                    up: dy > 0,
                    hit: coord,
                });
            } else {
                if (atCircleBottomOrSomething(coord, prim)) {
                    return;
                }
                const t = angleTo(prim.center, coord);
                const right = Math.abs(t) < Math.PI / 2;
                const up = right === (segs[i] as ArcSegment).clockwise;
                wind.push({ prev, seg: segs[i], up, hit: coord });
            }
            // if we're going "up" at this point, +1, otherwise -1
            // hits.push(coord);
        });
    });
    // if (isOnEdge) {
    //     return false;
    // }
    // if (debug) {
    //     console.log(hits, coord);
    // }
    return wind;
};
