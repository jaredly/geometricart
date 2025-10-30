import {coordKey} from '../rendering/coordKey';
import {slopeToLine} from '../rendering/intersect';
import {geomToPrimitives} from '../rendering/points';
import {State} from '../types';

export type Coord = {x: number; y: number};
export type Provenance = {id: number; parents: number[]};
export type Circle = {
    type: 'circle';
    center: Coord;
    radius: {p1: Coord; p2: Coord; dist: number};
    p: Provenance;
};
export type Line = {
    type: 'line';
    m: number;
    x: number;
    b: number;
    src: {
        type: 'a-to-b' | 'bisector' | 'angle-bisector' | 'point-line-perp' | 'circle-tangent';
        p1: Coord;
        p2: Coord;
    };
    p: Provenance;
};
export type Shape = Circle | Line;
export type Point = {
    type: 'point';
    coord: Coord;
    inDest?: boolean;
    p: Provenance;
};
export type Step = Shape | Point;

export const stateToConstructive = (state: State) => {
    const dest: Coord[] = [];
    const steps: Step[] = [];

    const seen = new Set<string>();
    const add = (coord: Coord) => {
        const k = coordKey(coord);
        if (!seen.has(k)) {
            seen.add(k);
            dest.push(coord);
        }
    };

    Object.values(state.paths).forEach((path) => {
        add(path.origin);
        path.segments.forEach((seg) => add(seg.to));
    });

    Object.values(state.guides).forEach((guide, i) => {
        geomToPrimitives(guide.geom).forEach((prim) => {
            if (prim.type === 'circle') {
                const {limit, ...rest} = prim;
                steps.push({
                    ...rest,
                    p: {id: i, parents: []},
                    radius: {
                        p1: rest.center,
                        p2: {x: rest.center.x, y: rest.center.y + rest.radius},
                        dist: rest.radius,
                    },
                });
            } else {
                const sl = slopeToLine(prim);
                const {limit, ...rest} = prim;
                steps.push({
                    ...rest,
                    x: rest.b,
                    p: {id: i, parents: []},
                    src: {type: 'a-to-b', p1: sl[0], p2: sl[1]},
                });
            }
        });
        // if (guide.geom.type === 'Circle') {
        //     steps.push({
        //         type: 'circle',
        //         center: guide.geom.center,
        //         p: {id: i, parents: []},
        //         radius: {p1: guide.geom.center, p2: guide.geom.radius, dist: dist(
        //             guide.geom.center,
        //             guide.geom.radius
        //         )}
        //     })
        // } else if (guide.geom.type)
        //      {
        //     steps.push({...lineToSlope(guide.geom.p1, guide.geom.p2), p: {id: i, parents: []}, src: {type: 'a-to-b',p1: guide.geom.p1, p2:guide.geom.p2},x:0})
        // }
    });

    return {dest, steps};
};
