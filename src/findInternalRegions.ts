/**
 * Ok https://mcmains.me.berkeley.edu/pubs/DAC05OffsetPolygon.pdf
 *
 * can I avoid needing to merge regions?
 * hmm actually nope. Also I'll need to
 *
 *
 *
 * so, assumptions:
 * each line segment only needs to be dealt with once?
 * Also: let's just go ahead and split everything up into the line segments
 * with a lookup for what things go to what points.
 *
 * when leaving a point that has multiple exits, choose the least-clockwise one
 * with respect to the entry line.
 */

import { coordKey } from './calcAllIntersections';
import { isClockwise } from './pathToPoints';
import { insidePath, sortHitsForPrimitive, windingNumber } from './clipPath';
import { pathToPrimitives } from './findSelection';
import { epsilon, intersections, Primitive, withinLimit } from './intersect';
import { coordsEqual } from './pathsAreIdentical';
import { Hit } from './pruneInsetPath';
import { Coord, Segment } from './types';
import { angleTo, dist, push } from './getMirrorTransforms';
import { angleBetween } from './findNextSegments';
import { Bounds } from './GuideElement';
import { segmentBounds, segmentsBounds } from './Export';

export const segmentsToNonIntersectingSegments = (segments: Array<Segment>) => {
    const primitives = pathToPrimitives(segments);
    const hits: Array<Array<Hit>> = new Array(segments.length)
        .fill([])
        .map((m) => []);
    const allHits: Array<Hit> = [];
    for (let i = 0; i < segments.length; i++) {
        // const previ =
        //     i === 0 ? segments[segments.length - 1].to : segments[i - 1].to;
        for (let j = i + 1; j < segments.length; j++) {
            // const prevj =
            //     j === 0 ? segments[segments.length - 1].to : segments[j - 1].to;
            const these = intersections(primitives[i], primitives[j]);
            these.forEach((coord) => {
                if (coord.x === 0) {
                    coord.x = 0;
                }
                if (coord.y === 0) {
                    coord.y = 0;
                }
                // const iend =
                //     coordsEqual(coord, previ) ||
                //     coordsEqual(coord, segments[i].to);
                // const jend =
                //     coordsEqual(coord, prevj) ||
                //     coordsEqual(coord, segments[j].to);
                // This is just two segments meeting. no big deal.
                // Note that if we managed to get in a place where four lines met in the same place,
                // this logic would break. here's hoping.
                // if (iend && jend) {
                //     return;
                // }
                const hit = { first: i, second: j, coord };
                hits[i].push(hit);
                hits[j].push(hit);
                allHits.push(hit);
            });
        }
    }

    // if (!allHits.length) {
    //     if (!isClockwise(segments)) {
    //         return [];
    //     }
    //     return [segments];
    // }

    const sorted = hits.map((hits, i) =>
        sortHitsForPrimitive(hits, primitives[i], segments[i]),
    );

    // So, I return a list of segments, and a mapping [fromcoord] -> [exiting segments]
    const result: Array<PartialSegment> = [];

    // or maybe, because each segmet only has one exit, we just ... hmm
    // although it would be nice to be able to keep track of the ones we've hit.
    // yeah.
    const froms: Froms = {};
    //
    segments.forEach((segment, i) => {
        let prev =
            i === 0 ? segments[segments.length - 1].to : segments[i - 1].to;
        let intersection = 0;
        // if (segment.type === 'Arc') {
        //     console.log(segment, sorted[i], prev, segment.to);
        // }
        while (
            !coordsEqual(prev, segment.to) &&
            intersection <= sorted[i].length
        ) {
            const key = coordKey(prev);
            const to =
                intersection === sorted[i].length
                    ? segment.to
                    : sorted[i][intersection].coord;
            if (!coordsEqual(prev, to)) {
                if (!froms[key]) {
                    froms[key] = { coord: prev, exits: [] };
                }
                froms[key].exits.push(result.length);
                const theta = angleTo(prev, to); // STOPSHIP broken for arcs I'm sure
                result.push({
                    prev,
                    segment: { ...segment, to },
                    initialAngle: theta,
                    finalAngle: theta,
                });
            }
            prev = to;
            intersection++;
        }
        // if (segment.type === 'Arc') {
        //     console.log('processed', intersection, 'hits');
        // }
    });
    return { result, froms };
};

// Ok, so now the game plan is:
// take those segments, follow them around ...
// and ... hmmm
// so the rule is: always switch! We assume there will only ever be
// 2 exits from a given point, because we're wildly optimistic.

// I mean, we could say:
// if there's one to the right or left, then take it?

type Froms = {
    [key: string]: {
        coord: Coord;
        exits: Array<number>;
    };
};

// So there's probably a weird edge case if two corners happen to touch
// ... not super likely, but idk what would happen.

type PartialSegment = {
    prev: Coord;
    segment: Segment;
    initialAngle: number;
    finalAngle: number;
};

/* ok whats the stragety

so we know these regions wont be mutually intersecting, right?

Ok, so faster way, will work for most:
- if they share a point, we can know which one is outside. >< the "top" one if we're going left to right.
- if they don't share a point, check if they bounding box intersect.
	- if not, leave them alone
	- if they do, the smaller bounding box one gets eliminated? I mean ...
		the one that has a control point in the other one gets eliminated.
		so, it's enough to test 1 point of 1 against the other. if it's inside, rmeove it
		if not, test one point of the other, and if it's in, then remove that other.

*/

type Region = {
    segments: Array<Segment>;
    primitives: Array<Primitive>;
    bounds: Bounds;
    corners: { [key: string]: number }; // the angle, clockwise I think
};

export const overlap = (a: number, b: number, c: number, d: number) => {
    return (
        withinLimit([a, b], c) ||
        withinLimit([a, b], d) ||
        withinLimit([c, d], a) ||
        withinLimit([c, d], b)
    );
};

export const boundsIntersect = (one: Bounds, two: Bounds) => {
    return (
        overlap(one.x0, one.x1, two.x0, two.x1) &&
        overlap(one.y0, one.y1, two.y0, two.y1)
    );
};

export const checkContained = (
    first: Region,
    second: Region,
): null | boolean => {
    if (!boundsIntersect(first.bounds, second.bounds)) {
        return null;
    }

    for (let corner of Object.keys(first.corners)) {
        if (second.corners[corner]) {
            // they share a corner!
            // the one that's "inside" is the one with the ... smaller angle. the convex one, if you will.
            if (first.corners[corner] < second.corners[corner]) {
                return true; // first one goes
            } else {
                return false; // second one goes
            }
        }
    }

    const fp = first.segments.find((seg) => !second.corners[coordKey(seg.to)]);
    if (fp) {
        if (insidePath(fp.to, second.primitives)) {
            return true;
        }
    }
    const sp = second.segments.find((seg) => !first.corners[coordKey(seg.to)]);
    if (sp) {
        if (insidePath(sp.to, first.primitives)) {
            return false;
        }
    }

    return null;
};

export const getCornerAngle = (segments: Array<Segment>, i: number) => {
    // 0 is the angle between the first and the second
    // segments.length - 1 is the angle between the last and the first
    const pprev = segments[i === 0 ? segments.length - 1 : i - 1].to;
    const prev = segments[i];
    const seg = segments[(i + 1) % segments.length];

    let enterAngle;
    if (prev.type === 'Line') {
        enterAngle = angleTo(pprev, prev.to);
    } else {
        enterAngle =
            angleTo(prev.center, prev.to) +
            (Math.PI / 2) * (prev.clockwise ? 1 : -1);
    }
    let exitAngle;
    if (seg.type === 'Line') {
        exitAngle = angleTo(prev.to, seg.to);
    } else {
        exitAngle =
            angleTo(seg.center, prev.to) +
            (Math.PI / 2) * (seg.clockwise ? 1 : -1);
    }
    return { enterAngle, exitAngle }; // angleBetween(enterAngle, exitAngle, true);
};

export const precalcRegion = (segments: Array<Segment>): Region => {
    const corners: Region['corners'] = {};
    segments.forEach((segment, i) => {
        const { enterAngle, exitAngle } = getCornerAngle(segments, i);
        corners[coordKey(segment.to)] = angleBetween(
            enterAngle,
            exitAngle,
            true,
        );
    });

    return {
        segments,
        primitives: pathToPrimitives(segments),
        bounds: segmentsBounds(segments),
        corners,
    };
};

export const removeContainedRegions = (
    regionSegments: Array<Array<Segment>>,
): Array<Array<Segment>> => {
    // return regionSegments;
    let remove: Array<number> = [];
    const regions = regionSegments.map(precalcRegion);
    regions.forEach((first, i) => {
        if (remove.includes(i)) {
            return;
        }
        for (let j = i + 1; j < regions.length; j++) {
            if (remove.includes(j)) {
                continue;
            }
            const second = regions[j];

            const result = checkContained(first, second);
            if (result == true) {
                // first is contained within second
                remove.push(i);
                // bail out of checking first, it'll be removed anyway
                return;
            } else if (result === false) {
                // second is contained within first
                remove.push(j);
            }
        }
    });

    return remove.length
        ? regionSegments.filter((_, i) => !remove.includes(i))
        : regionSegments;
};

export const findRegions = (
    segments: Array<PartialSegment>,
    froms: Froms,
): Array<Array<Segment>> => {
    const regions: Array<Array<Segment>> = [];

    let seen = new Array(segments.length).fill(false);
    segments.forEach(({ prev, segment, finalAngle }, i) => {
        if (seen[i]) {
            return;
        }

        let region: Array<Segment> = [];

        while (
            (!region.length ||
                !coordsEqual(region[region.length - 1].to, prev)) &&
            !seen[i]
        ) {
            seen[i] = true;
            const key = coordKey(segment.to);
            // eliminate the "just go to the next one"
            const otherExits = froms[key].exits
                //.filter(k => k !== i + 1)
                .map((k): [number, number] =>
                    k === i + 1
                        ? [Infinity, k]
                        : [
                              angleBetween(
                                  finalAngle,
                                  segments[k].initialAngle,
                                  true,
                              ),
                              k,
                          ],
                )
                // low to high, I think?
                .sort((a, b) => a[0] - b[0]);

            let exit = otherExits[0][1];
            region.push(segment);
            ({ segment, finalAngle } = segments[exit]);
            i = exit;
        }

        regions.push(region);
    });

    return regions; // regions.filter((region) => isClockwise(region));
};

export const cleanUpInsetSegmentsOld = (segments: Array<Segment>) => {
    const result = segmentsToNonIntersectingSegments(segments);
    return removeContainedRegions(
        findRegions(result.result, result.froms).filter(isClockwise),
    );
};

export const cleanUpInsetSegments = cleanUpInsetSegmentsOld;

// segments are assumed to be clockwise
export const findStraightInternalPos = (
    segments: Array<Segment>,
    internalMargin = INTERNAL_MARGIN,
): [number, number, Coord, Coord] | null => {
    for (let i = 0; i < segments.length; i++) {
        const next = segments[(i + 1) % segments.length];
        const segment = segments[i];
        if (next.type !== 'Line' && segment.type !== 'Line') {
            continue;
        }
        const prev = segments[i === 0 ? segments.length - 1 : i - 1].to;
        const thisTheta = segmentAngle(prev, segment, false, true);
        const nextTheta = segmentAngle(segment.to, next, true, true);
        const between = angleBetween(nextTheta, thisTheta + Math.PI, true);
        if (between < Math.PI) {
            return [
                thisTheta + Math.PI,
                nextTheta,
                push(segment.to, nextTheta + between / 2, internalMargin),
                segment.to,
            ];
        }
    }
    return null;
};

const INTERNAL_MARGIN = epsilon * 2; // 0.01;

export const findInsidePoint = (
    prev: Coord,
    one: Segment,
    two: Segment,
    internalMargin = INTERNAL_MARGIN,
): [number, number, Coord, Coord] | null => {
    if (one.type === 'Line' && two.type === 'Line') {
        const backTheta = angleTo(one.to, prev);
        const nextTheta = angleTo(one.to, two.to);
        const between = angleBetween(backTheta, nextTheta, false);
        if (between <= Math.PI) {
            return [
                backTheta,
                nextTheta,
                push(one.to, backTheta - between / 2, internalMargin),
                one.to,
            ];
        }
        return null;
    }

    if (one.type === 'Line' && two.type === 'Arc') {
        const backTheta = angleTo(one.to, prev);
        const d = dist(two.center, one.to);
        // so M / r radians gets you M distance around circumference
        const nextPoint = push(
            two.center,
            angleTo(two.center, one.to) +
                (internalMargin / d) * (two.clockwise ? 1 : -1),
            d,
        );
        const between = angleBetween(
            backTheta,
            angleTo(one.to, nextPoint),
            false,
        );
        if (between <= Math.PI) {
            const np = push(
                one.to,
                backTheta + (between / 2) * -1,
                internalMargin,
            );
            return [backTheta, angleTo(one.to, nextPoint), np, one.to];
        }
        return null;
    }

    if (one.type === 'Arc' && two.type === 'Line') {
        const nextTheta = angleTo(one.to, two.to);
        const d = dist(one.center, one.to);
        // so M / r radians gets you M distance around circumference
        const backPoint = push(
            one.center,
            angleTo(one.center, one.to) +
                (internalMargin / d) * (one.clockwise ? -1 : 1),
            d,
        );
        const between = angleBetween(
            nextTheta,
            angleTo(one.to, backPoint),
            true,
        );
        if (between <= Math.PI) {
            const np = push(
                one.to,
                nextTheta + (between / 2) * (one.clockwise ? 1 : 1),
                internalMargin,
            );
            return [angleTo(one.to, backPoint), nextTheta, np, one.to];
        }
        return null;
    }

    if (one.type === 'Arc' && two.type === 'Arc') {
        const d1 = dist(one.center, one.to);
        const d2 = dist(two.center, one.to);
        const backPoint = push(
            one.center,
            angleTo(one.center, one.to) +
                (internalMargin / d1) * (one.clockwise ? -1 : 1),
            d1,
        );
        const nextPoint = push(
            two.center,
            angleTo(two.center, one.to) +
                (internalMargin / d2) * (two.clockwise ? 1 : -1),
            d2,
        );
        const nextTheta = angleTo(one.to, nextPoint);
        const between = angleBetween(
            nextTheta,
            angleTo(one.to, backPoint),
            true,
        );
        if (between <= Math.PI) {
            const np = push(
                one.to,
                nextTheta + (between / 2) * (one.clockwise ? 1 : 1),
                internalMargin,
            );
            return [angleTo(one.to, backPoint), nextTheta, np, one.to];
        }
        return null;
    }

    return null;
};

// segments are assumed to be clockwise
export const findInternalPos = (
    segments: Array<Segment>,
    internalMargin = INTERNAL_MARGIN,
): [number, number, Coord, Coord] => {
    const straight = findStraightInternalPos(segments, internalMargin);
    if (straight) {
        return straight;
    }
    for (let i = 0; i < segments.length; i++) {
        const prev = segments[i === 0 ? segments.length - 1 : i - 1].to;
        const segment = segments[i];
        const next = segments[(i + 1) % segments.length];

        if (1 === 0) {
            const inside = findInsidePoint(prev, segment, next);
            if (inside) {
                return inside;
            }
        } else {
            const thisTheta = segmentAngle(prev, segment, false, true);
            const nextTheta = segmentAngle(segment.to, next, true, true);
            const between = angleBetween(nextTheta, thisTheta + Math.PI, true);
            if (between < Math.PI) {
                return [
                    thisTheta + Math.PI,
                    nextTheta,
                    push(segment.to, nextTheta + between / 2, internalMargin),
                    segment.to,
                ];
            }
        }
    }
    console.warn('no internal pos???', segments);
    // throw new Error(`nope`);
    return [0, 0, segments[0].to, segments[0].to];
};

export const cleanUpInsetSegments2 = (segments: Array<Segment>) => {
    const result = segmentsToNonIntersectingSegments(segments);
    const regions = findRegions(result.result, result.froms).filter(
        isClockwise,
    );
    return removeContainedRegions(removeNonWindingRegions(segments, regions));
};

export const removeNonWindingRegions = (
    originalSegments: Array<Segment>,
    regions: Array<Array<Segment>>,
) => {
    const primitives = pathToPrimitives(originalSegments);
    return regions.filter((region) => {
        const [, , pos] = findInternalPos(region);
        const wind = windingNumber(pos, primitives, originalSegments, false);
        const wcount = wind.reduce((c, w) => (w.up ? 1 : -1) + c, 0);

        return wcount > 0;
    });
};

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
