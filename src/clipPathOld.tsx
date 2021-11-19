import { coordKey } from './calcAllIntersections';
import { angleBetween } from './findNextSegments';
import { pathToPrimitives } from './findSelection';
import { angleTo, dist } from './getMirrorTransforms';
import { intersections, Primitive } from './intersect';
import { coordsEqual } from './pathsAreIdentical';
import { ArcSegment, Coord, Path, Segment } from './types';

// let's return `clipInformation` along with it, I think. like `{path, clipped: Array<segment index>}`

export const clipPath = (
    path: Path,
    clip: Array<Segment>,
    primitives: Array<Primitive>,
): Path | null => {
    // start somewhere.
    // if it's inside the clip, a ray will intersect an odd number of times. right?
    const idx = findInsideStart(path, primitives);
    if (idx == null) {
        console.log(`nothing inside`);
        // path is not inside, nothing to show
        return null;
    }

    const allIntersections: { [i: number]: { [j: number]: Array<Coord> } } = {};

    const pathPrims = pathToPrimitives(path.origin, path.segments);

    // Intersections from the perspective of the clip.
    let clipPerspective: Array<Array<{ i: number; j: number; coord: Coord }>> =
        primitives.map(() => []);

    const hitsPerSegment = pathPrims.map((prim, i) => {
        let all: Array<{ i: number; j: number; coord: Coord }> = [];
        allIntersections[i] = {};
        primitives.forEach((clip, j) => {
            const got = intersections(prim, clip);
            allIntersections[i][j] = got;
            got.forEach((coord) => {
                const hit = { i, j, coord };
                all.push(hit);
                clipPerspective[j].push(hit);
            });
        });
        if (all.length) {
            return sortHitsForPrimitive(all, prim, path.segments[i]);
        }
        return all;
    });

    clipPerspective = clipPerspective.map((hits, j) => {
        return sortHitsForPrimitive(hits, primitives[j], clip[j]);
    });

    const hitLists = { clip: clipPerspective, path: hitsPerSegment };

    const finishedPath: { origin: Coord; segments: Array<Segment> } = {
        origin: idx === 0 ? path.origin : path.segments[idx - 1].to,
        segments: [],
    };

    let state: { clipSide: boolean; i: number; startingAt: number } = {
        clipSide: false,
        i: idx,
        startingAt: -1,
    };
    let x = 0;
    while (
        finishedPath.segments.length === 0 ||
        !coordsEqual(
            finishedPath.origin,
            finishedPath.segments[finishedPath.segments.length - 1].to,
        )
    ) {
        if (x++ > 30) {
            console.log(`FAIL`, state, finishedPath);
            break;
        }
        const prev =
            finishedPath.segments.length === 0
                ? finishedPath.origin
                : finishedPath.segments[finishedPath.segments.length - 1].to;

        // ALERT ALERT: How do we detect "touch & go" cases?
        // where we intersect for a second, but then leave?
        // oh hm is that something I can filter out at the ^^^ stage? That would be very nice
        // in fact.
        // YES START HERE:
        // FILTER OUT: touching the border but then retreating.
        // ok, and what we probably want to do is... record the angle of incidence for each intersection?
        // I think? yeah, get the angles on the two sides of the intersection
        // 4 options:
        // - clip is in two pieces, path is in two pieces
        // - clean cross between 1 clip, 1 path
        // - clip 2 pieces, 1 path
        // - clip 1, path 2
        // 1 clip 1 path can't .. be ... dangit, they can be tangent. if one is an arc.
        // ok yeah, bascially we need to get rid of tangent intersections.
        // hmmmmmm there's more options
        // bascially, when we get to a "corner", we need to take the option that keeps us inside.
        if (!state.clipSide) {
            const at = state.i % path.segments.length;

            if (hitLists.path[at].length <= state.startingAt + 1) {
                finishedPath.segments.push(path.segments[at]);
                state.i += 1;
                continue;
            }

            let first = hitLists.path[at][state.startingAt + 1];
            if (coordsEqual(first.coord, prev)) {
                // false start, advance!
                first = hitLists.path[at][state.startingAt + 2];
                if (!first) {
                    // we're done here folks, forge ahead
                    finishedPath.segments.push(path.segments[at]);
                    state.i += 1;
                    continue;
                }
            }

            if (coordsEqual(first.coord, path.segments[at].to)) {
                finishedPath.segments.push(path.segments[at]);
            } else {
                finishedPath.segments.push({
                    ...path.segments[at],
                    to: first.coord,
                });
            }

            state = {
                clipSide: true,
                i: first.j,
                startingAt: hitLists.clip[first.j].indexOf(first),
            };
            continue;
        } else {
            const at = state.i % clip.length;

            if (hitLists.clip[at].length <= state.startingAt + 1) {
                finishedPath.segments.push(clip[at]);
                state.i += 1;
                continue;
            }

            let first = hitLists.clip[at][state.startingAt + 1];
            if (coordsEqual(first.coord, prev)) {
                // false start, advance!
                first = hitLists.clip[at][state.startingAt + 2];
                if (!first) {
                    // we're done here folks, forge ahead
                    finishedPath.segments.push(clip[at]);
                    state.i += 1;
                    continue;
                }
            }

            if (coordsEqual(first.coord, clip[at].to)) {
                finishedPath.segments.push(clip[at]);
            } else {
                finishedPath.segments.push({ ...clip[at], to: first.coord });
            }

            state = {
                clipSide: false,
                i: first.i,
                startingAt: hitLists.path[first.i].indexOf(first),
            };
            continue;
        }
    }
    console.log(`done`, finishedPath, state);

    // for (let i = idx; i < idx + path.segments.length; i++) {
    //     const at = i % path.segments.length;
    //     if (!hitsPerSegment[at].length) {
    //         finishedPath.segments.push(path.segments[at]);
    //         continue;
    //     }
    //     const first = hitsPerSegment[at][0];
    //     if (coordsEqual(first.coord, path.segments[at].to)) {
    //         finishedPath.segments.push(path.segments[at]);
    //         continue;
    //     }
    //     // const prev = at === 0 ? path.origin : path.segments[at - 1].to;
    //     const prim = pathPrims[at];
    //     // ok, so practically speaking.
    //     // We want to "switch between one and the other, until we get back to our starting point".
    //     // Right?
    //     // Like, once we hit an intersection, we defect to the other one. Always going CLOCKWISE. yes very much.
    //     // and we know that both things coming in are clockwise.
    //     // hmmmmm
    //     // so how do we keep track of state.
    //     // also, I feel like ... I want to first compute ... the cross product ... of intersections ... and then traverse that somehow.
    //     // also it would be very nice to be able to short-circuit, but that's not in the cards folks.
    //     // gonna be slow I guess.
    //     let closest = null;
    //     primitives.forEach((other) => {
    //         const hits = intersections(prim, other);
    //         hits.forEach((hit) => {});
    //     });
    // }
    return {
        ...path,
        origin: finishedPath.origin,
        segments: finishedPath.segments,
    };
};

export const insidePath = (coord: Coord, segs: Array<Primitive>) => {
    const ray: Primitive = {
        type: 'line',
        m: 0,
        b: coord.y,
        limit: [coord.x, Infinity],
    };
    let hits: { [key: string]: true } = {};
    segs.forEach((seg) => {
        intersections(seg, ray).forEach((coord) => {
            hits[coordKey(coord)] = true;
        });
    });
    return Object.keys(hits).length % 2 == 1;
};

export const findInsideStart = (path: Path, clip: Array<Primitive>) => {
    for (let i = 0; i < path.segments.length; i++) {
        const prev = i === 0 ? path.origin : path.segments[i - 1].to;
        if (insidePath(prev, clip)) {
            return i;
        }
    }
    return null;
};

export const sortHitsForPrimitive = <T extends { coord: Coord }>(
    hits: Array<T>,
    prim: Primitive,
    segment: Segment,
): Array<T> => {
    if (prim.type === 'line') {
        // sorted "closest first"
        return hits
            .map((coord) => ({
                coord,
                dist: dist(coord.coord, segment.to),
            }))
            .sort((a, b) => b.dist - a.dist)
            .map((item) => item.coord);
    } else {
        const circle = segment as ArcSegment;
        const t1 = angleTo(circle.center, segment.to);
        // TODO: DEDUP! If we have an intersection with two clip segments, take the /later/ one.
        return hits
            .map((coord) => ({
                coord,
                dist: angleBetween(
                    t1,
                    angleTo(circle.center, coord.coord),
                    false,
                ),
            }))
            .sort((a, b) => b.dist - a.dist)
            .map((item) => item.coord);
    }
};
