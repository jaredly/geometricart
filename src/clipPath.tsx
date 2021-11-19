import { coordKey } from './calcAllIntersections';
import { angleBetween } from './findNextSegments';
import { pathToPrimitives } from './findSelection';
import { angleTo, dist } from './getMirrorTransforms';
import { intersections, Primitive } from './intersect';
import { coordsEqual } from './pathsAreIdentical';
import { ArcSegment, Coord, Path, Segment } from './types';

type Clippable = {
    prims: Array<Primitive>;
    segments: Array<Segment>;
};

// let's return `clipInformation` along with it, I think. like `{path, clipped: Array<segment index>}`

export const clipTwo = (clip: Clippable, path: Clippable, idx: number) => {
    const allIntersections: { [i: number]: { [j: number]: Array<Coord> } } = {};
    // Intersections from the perspective of the clip.
    let clipPerspective: Array<Array<{ i: number; j: number; coord: Coord }>> =
        clip.prims.map(() => []);

    const hitsPerSegment = path.prims.map((prim, i) => {
        let all: Array<{ i: number; j: number; coord: Coord }> = [];
        allIntersections[i] = {};
        clip.prims.forEach((clip, j) => {
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
        return sortHitsForPrimitive(hits, clip.prims[j], clip.segments[j]);
    });

    const hitLists = { clip: clipPerspective, path: hitsPerSegment };

    const first =
        idx === 0
            ? path.segments[path.segments.length - 1].to
            : path.segments[idx - 1].to;

    // const finishedPath: { origin: Coord; segments: Array<Segment> } = {
    //     origin: first,
    //     segments: [],
    // };

    const result: Array<Segment> = [];

    let state: { clipSide: boolean; i: number; startingAt: number } = {
        clipSide: false,
        i: idx,
        startingAt: -1,
    };
    let x = 0;
    while (
        result.length === 0 ||
        !coordsEqual(first, result[result.length - 1].to)
    ) {
        if (x++ > 30) {
            console.log(`FAIL`, state, result);
            break;
        }
        const prev = result.length === 0 ? first : result[result.length - 1].to;

        if (!state.clipSide) {
            const at = state.i % path.segments.length;

            if (hitLists.path[at].length <= state.startingAt + 1) {
                result.push(path.segments[at]);
                state.i += 1;
                continue;
            }

            let first = hitLists.path[at][state.startingAt + 1];
            if (coordsEqual(first.coord, prev)) {
                // false start, advance!
                first = hitLists.path[at][state.startingAt + 2];
                if (!first) {
                    // we're done here folks, forge ahead
                    result.push(path.segments[at]);
                    state.i += 1;
                    continue;
                }
            }

            if (coordsEqual(first.coord, path.segments[at].to)) {
                result.push(path.segments[at]);
            } else {
                result.push({
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
            const at = state.i % clip.segments.length;

            if (hitLists.clip[at].length <= state.startingAt + 1) {
                result.push(clip.segments[at]);
                state.i += 1;
                continue;
            }

            let first = hitLists.clip[at][state.startingAt + 1];
            if (coordsEqual(first.coord, prev)) {
                // false start, advance!
                first = hitLists.clip[at][state.startingAt + 2];
                if (!first) {
                    // we're done here folks, forge ahead
                    result.push(clip.segments[at]);
                    state.i += 1;
                    continue;
                }
            }

            if (coordsEqual(first.coord, clip.segments[at].to)) {
                result.push(clip.segments[at]);
            } else {
                result.push({ ...clip.segments[at], to: first.coord });
            }

            state = {
                clipSide: false,
                i: first.i,
                startingAt: hitLists.path[first.i].indexOf(first),
            };
            continue;
        }
    }
    console.log(`done`, result, state);

    return result;
};

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

    const pathPrims = pathToPrimitives(path.origin, path.segments);

    const result = clipTwo(
        { prims: primitives, segments: clip },
        { segments: path.segments, prims: pathPrims },
        idx,
    );

    if (!result.length) {
        return null;
    }

    return {
        ...path,
        origin: result[result.length - 1].to,
        segments: result,
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
