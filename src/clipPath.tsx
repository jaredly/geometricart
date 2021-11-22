import { coordKey } from './calcAllIntersections';
import { ensureClockwise, isClockwise } from './CanvasRender';
import { angleBetween } from './findNextSegments';
import { pathToPrimitives } from './findSelection';
import { angleTo, dist } from './getMirrorTransforms';
import {
    Circle,
    epsilon,
    intersections,
    lineCircle,
    Primitive,
    SlopeIntercept,
    withinLimit,
} from './intersect';
import { coordsEqual } from './pathsAreIdentical';
import { simplifyPath } from './RenderPath';
import { ArcSegment, Coord, Line, Path, Segment } from './types';

type Hit = { i: number; j: number; coord: Coord };

type Clippable = {
    primitives: Array<Primitive>;
    segments: Array<Segment>;
    hits: Array<Array<Hit>>;
};

// if intersection is -1, it means we're at the start of the segment.
type HitLocation = { segment: number; intersection: number };

type Angle =
    | { type: 'flat'; theta: number }
    | {
          type: 'arc';
          /** the tangent line! */
          theta: number;
          radius: number;
          clockwise: boolean;
      };

export const closeEnough = (one: number, two: number) =>
    one === two || Math.abs(one - two) < epsilon;

export const anglesEqual = (one: Angle, two: Angle) => {
    if (one.type === 'flat' && two.type === 'flat') {
        return closeEnough(one.theta, two.theta);
    }
    if (one.type === 'arc' && two.type === 'arc') {
        return (
            one.clockwise === two.clockwise &&
            closeEnough(one.theta, two.theta) &&
            closeEnough(one.radius, two.radius)
        );
    }
    return false;
};

// ok folks, here's what we're doing
export const epsilonToZero = (value: number) =>
    Math.abs(value) < epsilon ? 0 : value;

// Yo definitely need tests for this
export const sortAnglesWithSameTheta = (first: Angle, second: Angle) => {
    // given two angles with the same theta, is one "more clockwise" than the other?
    // -1 for "first is less clockwise"
    // 0 for "same amount of clockwise"
    // 1 for "first is more clockwise"
    if (first.type === 'flat') {
        return second.type === 'flat' ? 0 : second.clockwise ? -1 : 1;
    }
    if (second.type === 'flat') {
        return first.clockwise ? 1 : -1;
    }
    if (first.clockwise) {
        if (second.clockwise) {
            return epsilonToZero(second.radius - first.radius);
        } else {
            return 1;
        }
    }
    // first is anticlockwise, so it's before
    if (second.clockwise) {
        return -1;
    }
    return epsilonToZero(first.radius - second.radius);
};

// export const shouldBiasLarge = (back: Angle, forward: Angle) => {
//     if (back.type === 'flat') {
//         return forward.type === 'arc' && forward.clockwise
//     } else {
//         if (forward.type === 'flat' || back.radius < forward.radius - epsilon) {
//             return !back.clockwise
//         } else if (back.radius > forward.radius + epsilon) {
//             if (back.radius < forward.radius - epsilon) {
//                 return !back.clockwise
//             }
//         }
//     }
// }

export const sortAngles = (first: Angle, second: Angle) => {
    const diff = epsilonToZero(first.theta - second.theta);
    if (diff == 0 || Math.abs(Math.abs(diff) - Math.PI * 2) < epsilon) {
        return sortAnglesWithSameTheta(first, second);
    }
    return diff;
};

const sortKey = (num: number) => (num < 0 ? `-1` : num > 0 ? `1` : `0`);

// export const normalize = (angle: number) => angle < -Math.PI ? angle + Math.PI * 2 : (angle > Math.PI ? angle - Math.PI * 2 : angle)
export const zeroToTwoPi = (angle: number) => {
    if (angle < 0) {
        angle += Math.PI * 2;
    }
    if (angle > Math.PI * 2) {
        angle -= Math.PI * 2;
    }
    if (angle < epsilon) {
        return 0;
    }
    if (Math.PI * 2 - angle < epsilon) {
        return 0;
    }
    return angle;
};

export const isInside = (
    back: Angle,
    forward: Angle,
    test: Angle,
    debug = false,
): boolean => {
    // We need to compare three things to each other.
    const ft = zeroToTwoPi(forward.theta - back.theta);
    const tt = zeroToTwoPi(test.theta - back.theta);

    if (debug) {
        console.log(`is inside?`, ft, tt);
    }

    if (tt === 0) {
        const sort = sortAnglesWithSameTheta(back, test);
        // Can't do straight backtracking, sorry
        if (sort === 0) {
            return false;
        } else if (sort < 0) {
            // test is "after" back, but just barely.
            // ft has to be zero, and test has to be "after" forward for this to work (or equal)
            return ft === 0 && sortAnglesWithSameTheta(forward, test) <= 0;
        } else {
            // test is "before" back. The only way to be outside is if
            // ft is also before back, but not before test
            return !(
                ft === 0 &&
                sortAnglesWithSameTheta(back, forward) > 0 &&
                sortAnglesWithSameTheta(test, forward) < 0
            );
        }
    } else if (ft === 0) {
        const sort = sortAnglesWithSameTheta(back, forward);
        if (sort === 0) {
            console.log(back, forward);
            throw new Error(
                `forward can't equal back. This is a straight backtrack`,
            );
        } else if (sort < 0) {
            // back is "less clockwise" than forward.
            // that means that unless test is literally backtracking
            return true;
        } else {
            // forward is very tight behind back, test can't be inside because tt isn't zero
            return false;
        }
    } else if (tt === ft) {
        const sort = sortAnglesWithSameTheta(forward, test);
        if (sort <= 0) {
            return true;
        }
        return false;
    } else {
        return tt > ft;
    }
};

export const getSegment = (segments: Array<Segment>, i: number) =>
    i < 0 ? segments[segments.length + i] : segments[i % segments.length];

export const getBackAngle = (one: Clippable, location: HitLocation): Angle => {
    const atStart =
        location.intersection === -1 ||
        coordsEqual(
            one.hits[location.segment][location.intersection].coord,
            getSegment(one.segments, location.segment - 1).to,
        );
    const prev = getSegment(one.segments, location.segment - 1);
    if (atStart) {
        if (prev.type === 'Line') {
            const pprev = getSegment(one.segments, location.segment - 2).to;
            return { type: 'flat', theta: angleTo(prev.to, pprev) };
        } else {
            const theta =
                angleTo(prev.center, prev.to) +
                (Math.PI / 2) * (prev.clockwise ? -1 : 1);
            return {
                type: 'arc',
                clockwise: !prev.clockwise,
                radius: dist(prev.center, prev.to),
                theta,
            };
        }
    }
    const segment = getSegment(one.segments, location.segment);
    if (segment.type === 'Line') {
        return { type: 'flat', theta: angleTo(segment.to, prev.to) };
    } else {
        const hit = one.hits[location.segment][location.intersection].coord;
        const theta =
            angleTo(segment.center, hit) +
            (Math.PI / 2) * (segment.clockwise ? -1 : 1);
        return {
            type: 'arc',
            clockwise: !segment.clockwise,
            radius: dist(segment.center, segment.to),
            theta,
        };
    }
};

export const getAngle = (one: Clippable, location: HitLocation): Angle => {
    const pos =
        location.intersection === -1
            ? getSegment(one.segments, location.segment - 1).to
            : one.hits[location.segment][location.intersection].coord;
    const segment = getSegment(one.segments, location.segment);
    if (segment.type === 'Line') {
        return { type: 'flat', theta: angleTo(pos, segment.to) };
    } else {
        const theta =
            angleTo(segment.center, pos) +
            (Math.PI / 2) * (segment.clockwise ? 1 : -1);
        return {
            type: 'arc',
            clockwise: segment.clockwise,
            radius: dist(segment.center, segment.to),
            theta,
        };
    }
};

/**
 * True if the segment on {other} extending from {location} is inside {one}
 * - inside includes sharing a same-direction boundary edge.
 *
 * NOTE that we need to categorically exclude hit points that are the /ends/ of segments.
 * but we do account for hit points that are the /start/ of one.
 * This means that all {HitLocations} have /some/ segment ahead of them, that is we don't need
 * to examine the /next/ segment in the list. If we're at the start of a segment, we do need
 * to check the previous segment, however.
 */
export const isGoingInside = (
    one: Clippable,
    oneLocation: HitLocation,
    test: Clippable,
    testLocation: HitLocation,
    debug = false,
) => {
    const back = getBackAngle(one, oneLocation);
    const forward = getAngle(one, oneLocation);
    const testAngle = getAngle(test, testLocation);
    if (debug) {
        console.log(`Check is going`, back, forward, testAngle);
    }
    return isInside(back, forward, testAngle, debug);
};

/*

Ok here's the plan.

Start with a point that's inside. For later reasons, we need to rule out points that are "headed away"
from the clip area.

Ok, so now we have a point.
Move along the current edge to the next intersection.
it might be on an adjoining segment, or on this one.

When we see an intersection, there are always 2 options.
Switch to the clip, or stay on the path. (or vice versa if we're on the clip)
How to choose?
Go with the one that is "more inside" the clip.
So you have the angle

|  /   <-- options, which have angles relative to the prev clip angle
| /
|/  <-- intersection
|
|  <-- prev clip angle

min(angleBetween(prevClipAngle, newAngle, false))

So we minimize the counter-clockwise angle from the prev angle to the new angle (or maximize the clockwise angle)

Because we know we're dealing with non-self-intersecting polygons, that's good enough!



Ok how do we know if a point is just tangent to the clip, and doesn't intrude?

hmmm.

yeah, so what we need is an `isInside` function, and we call it for both paths.
I think?

Yeah. so for "segIdx, intersectionidx" of the path, is the next bit "inside" the clip?
and the same question for the other one. Generally one will be true.
If both are, we're on a shared edge.




*/

// let's return `clipInformation` along with it, I think. like `{path, clipped: Array<segment index>}`
export const findHit = (
    clip: Clippable,
    hit: Hit,
    idx: number,
): HitLocation => {
    return { segment: idx, intersection: clip.hits[idx].indexOf(hit) };
};

// Ok so here's a theory:
// we're breaking, because start/stop points are being counted twice ... and then not at all? idk.

export const prevPos = (segments: Array<Segment>, idx: number) =>
    idx === 0 ? segments[segments.length - 1].to : segments[idx - 1].to;

export const clipTwo = (
    clip: Clippable,
    path: Clippable,
    idx: number,
    debug?: boolean,
) => {
    // ok, we start off on the path.

    const first =
        idx === 0
            ? path.segments[path.segments.length - 1].to
            : path.segments[idx - 1].to;

    // ifff the starting segment is also an intersection ... we have some explaining to do
    while (
        idx < path.hits.length &&
        path.hits[idx].length > 0 &&
        coordsEqual(path.hits[idx][0].coord, prevPos(path.segments, idx)) &&
        isGoingInside(
            path,
            { segment: idx, intersection: 0 },
            clip,
            findHit(clip, path.hits[idx][0], path.hits[idx][0].j),
        )
    ) {
        const got = findInsideStart(path.segments, clip.primitives, idx + 1);
        if (got == null) {
            return null;
        }
        idx = got;
        // idx++;
    }
    // Nope, can't do it folks. No idx works.
    if (idx >= path.hits.length) {
        return null;
    }

    // while (!isGoingInside)

    const result: Array<Segment> = [];

    const seen: { [key: string]: true } = {};

    let state: { clipSide: boolean; loc: HitLocation } = {
        clipSide: false,
        loc: { segment: idx, intersection: -1 },
    };

    if (debug) {
        console.log(`CLIPPING`, idx);
        console.log(path);
        console.log(clip);
    }

    const addSegment = (segment: Segment) => {
        if (debug) {
            console.log('✅ ADD', segment);
        }
        const key = coordKey(segment.to);
        if (seen[key]) {
            console.warn(new Error(`seen already! ${key}`));
            // TODO: Change to `false` and see what renders weird.
            return true;
        }
        seen[key] = true;
        result.push(segment);
        return true;
    };

    let x = 0;
    while (
        (!result.length || !coordsEqual(first, result[result.length - 1].to)) &&
        x++ < 100
    ) {
        if (debug) {
            console.log(`Current state`, { ...state }, result.length);
        }
        // if (result.length) {
        //     const key = coordKey(result[result.length - 1].to);
        //     if (seen[key]) {
        //         console.warn(new Error(`seen already! ${key}`));
        //         break;
        //     }
        //     seen[key] = true;
        // }

        if (!state.clipSide) {
            const next = state.loc.intersection + 1;
            if (next >= path.hits[state.loc.segment].length) {
                if (!addSegment(path.segments[state.loc.segment])) {
                    break;
                }
                if (debug) {
                    console.log(
                        `reached the end with no more hits`,
                        next,
                        path.segments[state.loc.segment],
                    );
                }
                // move on to the next
                state.loc = {
                    segment: (state.loc.segment + 1) % path.hits.length,
                    intersection: -1,
                };
                continue;
            }

            const hit = path.hits[state.loc.segment][next];

            const clipLoc = findHit(clip, hit, hit.j);
            const pathLoc = { segment: state.loc.segment, intersection: next };

            const last = result.length ? result[result.length - 1].to : first;

            // Is clip going into path?
            if (isGoingInside(path, pathLoc, clip, clipLoc, debug)) {
                if (!coordsEqual(last, hit.coord)) {
                    if (
                        !addSegment({
                            ...path.segments[state.loc.segment],
                            to: hit.coord,
                        })
                    ) {
                        break;
                    }
                }
                if (debug) {
                    console.log('switch to clip', hit, clipLoc, hit.coord);
                }
                // clip is going into path, we need to switch
                state = { clipSide: true, loc: clipLoc };
            } else {
                // if this is the starting position, ignore it
                if (!coordsEqual(last, hit.coord)) {
                    // must have been tangent, nothing to see here
                    if (
                        !addSegment({
                            ...path.segments[state.loc.segment],
                            to: hit.coord,
                        })
                    ) {
                        break;
                    }
                }
                if (debug) {
                    console.log(
                        `tangent I guess`,
                        state.loc,
                        pathLoc,
                        hit,
                        path.segments[state.loc.segment],
                    );
                }
                // move on to the next
                state.loc = pathLoc;
            }
        } else {
            const next = state.loc.intersection + 1;
            if (next >= clip.hits[state.loc.segment].length) {
                if (!addSegment(clip.segments[state.loc.segment])) {
                    break;
                }
                // move on to the next
                state.loc = {
                    segment: (state.loc.segment + 1) % clip.hits.length,
                    intersection: -1,
                };
                if (debug) {
                    console.log('reached end of clip segment, moving on');
                }
                continue;
            }

            const hit = clip.hits[state.loc.segment][next];

            const pathLoc = findHit(path, hit, hit.i);
            const clipLoc = { segment: state.loc.segment, intersection: next };

            const last = result.length ? result[result.length - 1].to : first;

            // Is path going into clip?
            if (isGoingInside(clip, clipLoc, path, pathLoc)) {
                if (
                    !addSegment({
                        ...clip.segments[state.loc.segment],
                        to: hit.coord,
                    })
                ) {
                    break;
                }
                if (debug) {
                    console.log(`switch to path`, hit, pathLoc);
                }
                // path is going into clip, we need to switch
                state = { clipSide: false, loc: pathLoc };
            } else {
                // if this is the starting position, ignore it
                if (!coordsEqual(last, hit.coord)) {
                    // must have been tangent, nothing to see here
                    if (
                        !addSegment({
                            ...clip.segments[state.loc.segment],
                            to: hit.coord,
                        })
                    ) {
                        break;
                    }
                }
                if (debug) {
                    console.log('tangent I guess', state.loc, clipLoc, hit);
                }
                // move on to the next
                state.loc = clipLoc;
            }
        }
    }
    if (debug) {
        console.log(`RESULT`);
        console.log(result);
    }
    return result;
};

export const clipPath = (
    path: Path,
    clip: Array<Segment>,
    clipPrimitives: Array<Primitive>,
): Path | null => {
    if (path.debug) {
        console.log(`CLIPPING`);
        console.log(path);
    }
    if (!isClockwise(path.segments)) {
        console.warn(`NOT CLOCKWISE???`);
        path.segments = ensureClockwise(path.segments);
    }
    path.segments = simplifyPath(path.segments);
    // start somewhere.
    // if it's inside the clip, a ray will intersect an odd number of times. right?
    // OHHHK ALSO we need to do the edge test.
    // STOPSHIP here folks
    // sooo this requires that a path must have at least one point inside the clip
    // in order to be rendered.
    // this is not a guarentee.
    // but here we are.
    const idx = findInsideStart(path.segments, clipPrimitives, 0, path.debug);
    if (idx == null) {
        // console.log(`nothing inside`);
        // path is not inside, nothing to show
        return null;
    }

    const pathPrims = pathToPrimitives(path.origin, path.segments);

    // Intersections from the perspective of the clip.
    let clipPerspective: Array<Array<{ i: number; j: number; coord: Coord }>> =
        clipPrimitives.map(() => []);

    let endHit: null | Hit = null;
    const hitsPerSegment = pathPrims.map((prim, i) => {
        let all: Array<Hit> = endHit ? [endHit] : [];
        endHit = null;
        clipPrimitives.forEach((clipPrim, j) => {
            const got = intersections(prim, clipPrim);
            // if (path.debug) {
            //     // console.log(`INTERSECT`, i, j, prim, clipPrim);
            //     // console.log(got);
            //     if (i === 6 && j === 0) {
            //         // console.log(
            //         //     intersections(prim, { ...clipPrim, limit: null }),
            //         // );
            //         // console.log(
            //         //     'got',
            //         //     lineCircle(
            //         //         prim as Circle,
            //         //         clipPrim as SlopeIntercept,
            //         //         true,
            //         //     ),
            //         // );
            //         // throw new Error(`stop`);
            //     }
            // }

            if (
                prim.type === 'line' &&
                clipPrim.type === 'line' &&
                closeEnough(prim.m, clipPrim.m) &&
                closeEnough(prim.b, clipPrim.b) &&
                prim.limit &&
                clipPrim.limit
            ) {
                // check all 4 endpoints, and add intersections for them??
                if (withinLimit(clipPrim.limit, prim.limit[0])) {
                    got.push(linePosAt(clipPrim, prim.limit[0]));
                } else if (withinLimit(prim.limit, clipPrim.limit[0])) {
                    got.push(linePosAt(prim, clipPrim.limit[0]));
                }

                if (withinLimit(clipPrim.limit, prim.limit[1])) {
                    got.push(linePosAt(clipPrim, prim.limit[1]));
                } else if (withinLimit(prim.limit, clipPrim.limit[1])) {
                    got.push(linePosAt(prim, clipPrim.limit[1]));
                }
            }

            got.forEach((coord) => {
                // Nope on matching the end of things
                // Ok, so whhat if
                // START HERE:
                // - a hit at the end just gets bumped to be at the start of the next one.
                // - of course sortHits needs to dedup
                // but then I thinkk we fix the issue...
                // ORRR we could just deal with hits at the end of things ...
                //

                const pathEnd = coordsEqual(coord, path.segments[i].to);
                const isCircle = clipPrim.type === 'circle' && !clipPrim.limit;
                const clipEnd = coordsEqual(coord, clip[j].to) && !isCircle;

                if (pathEnd || clipEnd) {
                    // const hit = {
                    //     i: pathEnd ? (i + 1) % path.segments.length : i,
                    //     j: clipEnd ? (j + 1) % clip.length : j,
                    //     coord,
                    // };
                    // if (pathEnd) {
                    //     endHit = hit;
                    // }
                    // if (clipEnd) {
                    //     clipPerspective[hit.j].push(hit);
                    // }
                    return;
                }

                // //
                // // BUT: Why doesn't the returning arc register an intersection? 🤔
                // if (pathEnd) {
                //     endHits.push({i: i + 1, j, coord})
                //     if (path.debug) {
                //         console.log(
                //             `skip coord end`,
                //             coord,
                //             path.segments[i],
                //             i,
                //         );
                //     }
                //     return;
                // }
                // // Nope on matching the end of things
                // if (!isCircle && clipEnd) {
                //     if (path.debug) {
                //         console.log(
                //             `skip clip end`,
                //             coord,
                //             clip[j].to,
                //             j,
                //             i,
                //             prim,
                //             clipPrim,
                //             got,
                //         );
                //     }
                //     return;
                // }

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
        return sortHitsForPrimitive(hits, clipPrimitives[j], clip[j]);
    });

    const result = clipTwo(
        { primitives: clipPrimitives, segments: clip, hits: clipPerspective },
        {
            segments: path.segments,
            primitives: pathPrims,
            hits: hitsPerSegment,
        },
        idx,
        path.debug,
    );

    if (path.debug) {
        console.log(
            idx,
            pathPrims,
            clipPrimitives,
            result,
            hitsPerSegment,
            clipPerspective,
        );
    }

    if (!result) {
        return null;
    }

    let filtered = [result[0]];
    for (let i = 1; i < result.length; i++) {
        if (coordsEqual(result[i].to, filtered[filtered.length - 1].to)) {
            continue;
        }
        filtered.push(result[i]);
    }

    if (!isClockwise(filtered)) {
        console.log('NOT CLOCKWISE');
    }

    filtered = simplifyPath(ensureClockwise(filtered));

    return {
        ...path,
        origin: filtered[filtered.length - 1].to,
        segments: filtered,
    };
};

export const insidePath = (
    coord: Coord,
    segs: Array<Primitive>,
    debug: boolean = false,
) => {
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
    if (debug) {
        console.log(hits, coord, segs);
    }
    return Object.keys(hits).length % 2 === 1;
};

/**
 * Finds the {index} of the {Segment} whose /start/ position (not to) is inside the clip.
 */
export const findInsideStart = (
    segments: Array<Segment>,
    clip: Array<Primitive>,
    after: number = 0,
    debug: boolean = false,
) => {
    for (let i = after; i < segments.length; i++) {
        const prev =
            i === 0 ? segments[segments.length - 1].to : segments[i - 1].to;
        const hits = insidePath(prev, clip, debug);
        if (hits) {
            const up = insidePath({ x: prev.x, y: prev.y + epsilon * 2 }, clip);
            const down = insidePath(
                { x: prev.x, y: prev.y - epsilon * 2 },
                clip,
            );
            const left = insidePath(
                { x: prev.x - epsilon * 2, y: prev.y },
                clip,
            );
            const right = insidePath(
                { x: prev.x + epsilon * 2, y: prev.y },
                clip,
            );

            if (up && down && left && right) {
                if (debug) {
                    console.log(`IT WAS`, prev, clip, hits);
                }
                return i;
            }
            // ugh got to check for a tangent hit ...
            // return i;
        }
        if (debug) {
            console.log(`nope`, prev, clip, hits);
        }
    }
    if (debug) {
        console.log(`nothing inside`, segments, clip);
    }
    return null;
};

export const sortHitsForPrimitive = <T extends { coord: Coord }>(
    hits: Array<T>,
    prim: Primitive,
    segment: Segment,
): Array<T> => {
    const seen: { [key: string]: true } = {};
    const check = (coord: T) => {
        const key = coordKey(coord.coord);
        if (seen[key]) {
            return false;
        }
        return (seen[key] = true);
    };
    if (prim.type === 'line') {
        // sorted "closest first"
        return hits
            .map((coord) => ({
                coord,
                dist: dist(coord.coord, segment.to),
            }))
            .sort((a, b) => b.dist - a.dist)
            .map((item) => item.coord)
            .filter(check);
    } else {
        const circle = segment as ArcSegment;
        const t1 = angleTo(circle.center, segment.to);
        // TODO: DEDUP! If we have an intersection with two clip segments, take the /later/ one.
        // the only way this could happen is if they're contiguous.
        return hits
            .map((coord) => ({
                coord,
                dist: coordsEqual(segment.to, coord.coord)
                    ? Math.PI * 2
                    : angleBetween(
                          t1,
                          angleTo(circle.center, coord.coord),
                          false,
                      ),
            }))
            .sort((a, b) => b.dist - a.dist)
            .map((item) => item.coord)
            .filter(check);
    }
};

export const linePosAt = (line: SlopeIntercept, pos: number) => {
    if (line.m === Infinity) {
        return { x: line.b, y: pos };
    }
    return { x: pos, y: line.m * pos + line.b };
};
