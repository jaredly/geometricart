import { coordKey } from './calcAllIntersections';
import { angleBetween } from './findNextSegments';
import { pathToPrimitives } from './findSelection';
import { angleTo, dist } from './getMirrorTransforms';
import { epsilon, intersections, Primitive } from './intersect';
import { coordsEqual } from './pathsAreIdentical';
import { ArcSegment, Coord, Path, Segment } from './types';

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
    Math.abs(one - two) < epsilon;

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

export const isInside = (back: Angle, forward: Angle, test: Angle): boolean => {
    // We need to compare three things to each other.
    const ft = zeroToTwoPi(forward.theta - back.theta);
    const tt = zeroToTwoPi(test.theta - back.theta);

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
    } else {
        return tt > ft;
    }

    // const backToForward = sortAngles(back, forward)
    // const backToTest = sortAngles(back, test)
    // const forwardToTest = sortAngles(forward, test)

    // if (backToForward === 0) {
    //     console.log(back, forward)
    //     throw new Error(`back to forward can't be zero`)
    // }

    // backToForward can't be zero

    // switch (`${sortKey(backToForward)}:${sortKey(backToTest)}:${sortKey(forwardToTest)}`) {
    //     case '0:0:0':
    //     case '-1:0:0':
    //     case '1:1:1':
    //     case '-1:'
    // }

    // let border = angleBetween(back.theta, forward.theta, true);
    // iff we back and/or forward are Arcs, then we need to adjust, if {border} is close to 0 / 2PI

    // const biasLarge = shouldBiasLarge(back, forward)

    // if the difference in angles is decisive, then that's that.
};

// true if {test} is "inside" (clockwise from) {forward}, with respect to {back}
// may also be equal to forward.
// export const isMoreInside = (back: Angle, forward: Angle, test: Angle) => {
//     if (anglesEqual(forward, test)) {
//         return true;
//     }
//     // if (back.type === 'flat' && forward.type === 'flat' && test.type === 'flat') {
//     //     return angleBetween(back.theta, forward.theta, true) <= angleBetween(back.theta, test.theta, true)
//     // }
//     const diff =
//         angleBetween(back.theta, forward.theta, true) -
//         angleBetween(back.theta, test.theta, true);
//     if (back.type === 'flat') {
//         if (forward.type === 'flat') {
//             if (test.type === 'flat') {
//                 return diff <= epsilon;
//             } else {
//                 if (test.clockwise) {
//                     // equals is good enough
//                     return diff <= epsilon;
//                 } else {
//                     // equals isn't good enough
//                     return diff < -epsilon;
//                 }
//             }
//         } else {
//             if (test.type === 'flat') {
//                 if (forward.clockwise) {
//                     // equals is not good enough
//                     return diff < -epsilon;
//                 } else {
//                     // equals isn't good enough
//                     return diff <= epsilon;
//                 }
//             } else {
//                 if (diff < -epsilon) {
//                     return true;
//                 }
//                 if (diff > epsilon) {
//                     return false;
//                 }

//                 if (test.clockwise) {
//                     if (forward.clockwise) {
//                         return test.radius <= forward.radius + epsilon;
//                     } else {
//                         return true;
//                     }
//                 } else {
//                     if (forward.clockwise) {
//                         return false;
//                     } else {
//                         return test.radius >= forward.radius - epsilon;
//                     }
//                 }

//                 // if (test.clockwise && !forward.clockwise) {
//                 //     return true
//                 // }
//                 // if (!test.clockwise && forward.clockwise) {
//                 //     return false
//                 // }
//                 // // Ok they're just about equal
//                 // // now we test clockwises
//                 // if (test.clockwise === forward.clockwise) {

//                 // } else {

//                 // }
//             }
//         }
//     } else {
//         // Ok so in this case, the "back" angle might be ... a little weird.
//         // like we could forward theta could be the /same/ as the back theta,
//         // but radius is different, or clockwise is different. which has different implications
//         // for what it looks like to be inside.
//         // hmm so it's interesting
//         // because, if the thetas are meaningfully different, then there's no issues.
//         // it's only if they're within epsilon of each other.
//         // because on the one hand there's the question "is this "
//     }
// };

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
        const pprev = getSegment(one.segments, location.segment - 2).to;
        if (prev.type === 'Line') {
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
) => {
    const back = getBackAngle(one, oneLocation);
    const forward = getAngle(one, oneLocation);
    const testAngle = getAngle(test, testLocation);
    return isInside(back, forward, testAngle);
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

export const clipTwo = (clip: Clippable, path: Clippable, idx: number) => {
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

    let state: { clipSide: boolean; loc: HitLocation } = {
        clipSide: false,
        loc: { segment: idx, intersection: -1 },
    };

    let x = 0;
    while (
        (!result.length || !coordsEqual(first, result[result.length - 1].to)) &&
        x++ < 100
    ) {
        if (!state.clipSide) {
            const next = state.loc.intersection + 1;
            if (next >= path.hits[state.loc.segment].length) {
                result.push(path.segments[state.loc.segment]);
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

            // Is clip going into path?
            if (isGoingInside(path, pathLoc, clip, clipLoc)) {
                result.push({
                    ...path.segments[state.loc.segment],
                    to: hit.coord,
                });
                // clip is going into path, we need to switch
                state = { clipSide: true, loc: clipLoc };
            } else {
                // must have been tangent, nothing to see here
                result.push(path.segments[state.loc.segment]);
                // move on to the next
                state.loc = pathLoc;
            }
        } else {
            const next = state.loc.intersection + 1;
            if (next >= clip.hits[state.loc.segment].length) {
                result.push(clip.segments[state.loc.segment]);
                // move on to the next
                state.loc = {
                    segment: (state.loc.segment + 1) % clip.hits.length,
                    intersection: -1,
                };
                continue;
            }

            const hit = clip.hits[state.loc.segment][next];

            const clipLoc = findHit(path, hit, hit.i);
            const pathLoc = { segment: state.loc.segment, intersection: next };

            // Is path going into clip?
            if (isGoingInside(clip, pathLoc, path, clipLoc)) {
                result.push({
                    ...clip.segments[state.loc.segment],
                    to: hit.coord,
                });
                // path is going into clip, we need to switch
                state = { clipSide: false, loc: clipLoc };
            } else {
                // must have been tangent, nothing to see here
                result.push(clip.segments[state.loc.segment]);
                // move on to the next
                state.loc = pathLoc;
            }
        }
    }
    return result;
};

export const clipPath = (
    path: Path,
    clip: Array<Segment>,
    clipPrimitives: Array<Primitive>,
): Path | null => {
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
        console.log(`nothing inside`);
        // path is not inside, nothing to show
        return null;
    }

    const pathPrims = pathToPrimitives(path.origin, path.segments);

    // Intersections from the perspective of the clip.
    let clipPerspective: Array<Array<{ i: number; j: number; coord: Coord }>> =
        clipPrimitives.map(() => []);

    const hitsPerSegment = pathPrims.map((prim, i) => {
        let all: Array<{ i: number; j: number; coord: Coord }> = [];
        clipPrimitives.forEach((clipPrim, j) => {
            const got = intersections(prim, clipPrim);
            got.forEach((coord) => {
                // Nope on matching the end of things
                if (coordsEqual(coord, path.segments[i].to)) {
                    return;
                }
                // Nope on matching the end of things
                if (coordsEqual(coord, clip[j].to)) {
                    return;
                }
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

    return {
        ...path,
        origin: result[result.length - 1].to,
        segments: result,
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
                return i;
            }
            // ugh got to check for a tangent hit ...
            // if (debug) {
            //     console.log(`IT WAS`, prev, clip, hits);
            // }
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
        // the only way this could happen is if they're contiguous.
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
