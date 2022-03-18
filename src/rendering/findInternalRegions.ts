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
import { insidePath } from './clipPath';
import { windingNumber } from './windingNumber';
import { pathToPrimitives } from '../editor/findSelection';
import { epsilon, Primitive, withinLimit } from './intersect';
import { coordsEqual } from './pathsAreIdentical';
import { Coord, Segment } from '../types';
import { angleTo, dist, push } from './getMirrorTransforms';
import { angleBetween } from './findNextSegments';
import { Bounds } from '../editor/GuideElement';
import { segmentBounds, segmentsBounds } from '../editor/Bounds';
import {
    HIGH_PRECISION,
    PartialSegment,
    Froms,
    segmentsToNonIntersectingSegments,
} from './segmentsToNonIntersectingSegments';
import { segmentAngle } from './segmentAngle';
import { cleanUpInsetSegments3 } from './clipPathNew';

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

    // This is fallible
    // for (let corner of Object.keys(first.corners)) {
    //     if (second.corners[corner]) {
    //         // they share a corner!
    //         // the one that's "inside" is the one with the ... smaller angle. the convex one, if you will.
    //         if (first.corners[corner] < second.corners[corner]) {
    //             return true; // first one goes
    //         } else {
    //             return false; // second one goes
    //         }
    //     }
    // }

    const fp = first.segments.find(
        (seg) => !second.corners[coordKey(seg.to, HIGH_PRECISION)],
    );
    if (fp) {
        if (insidePath(fp.to, second.primitives, second.segments)) {
            return true;
        }
    }
    const sp = second.segments.find(
        (seg) => !first.corners[coordKey(seg.to, HIGH_PRECISION)],
    );
    if (sp) {
        if (insidePath(sp.to, first.primitives, first.segments)) {
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
        corners[coordKey(segment.to, HIGH_PRECISION)] = angleBetween(
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
    if (regionSegments.length === 1) {
        return regionSegments;
    }
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
                !coordsEqual(
                    region[region.length - 1].to,
                    prev,
                    HIGH_PRECISION,
                )) &&
            !seen[i]
        ) {
            seen[i] = true;
            const key = coordKey(segment.to, HIGH_PRECISION);
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

const INTERNAL_MARGIN = epsilon * 10; // 0.01;

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

        if (1 === 1) {
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
    return [0, 0, segments[0].to, segments[0].to];
};

export const filterTooSmallSegments = (segments: Array<Segment>) => {
    // This is a circle probably
    if (segments.length === 1) {
        return segments;
    }
    return segments.filter((seg, i) => {
        let prev = segments[i === 0 ? segments.length - 1 : i - 1].to;
        if (coordsEqual(prev, seg.to, HIGH_PRECISION)) {
            console.log('SEGMETNS ZERO_LENTH', seg, prev);
            return false;
        }
        return true;
    });
};

export const cleanUpInsetSegments2 = (
    segments: Array<Segment>,
    originalCorners: Array<Coord>,
) => {
    try {
        return cleanUpInsetSegments3(segments, originalCorners);
    } catch (err) {
        const result = segmentsToNonIntersectingSegments(
            filterTooSmallSegments(segments),
        );
        let regions = findRegions(result.result, result.froms).filter(
            isClockwise,
        );
        return removeContainedRegions(
            removeNonWindingRegions(segments, regions),
        );
    }
};

export const removeNonWindingRegions = (
    originalSegments: Array<Segment>,
    regions: Array<Array<Segment>>,
) => {
    const primitives = pathToPrimitives(originalSegments);
    return regions.filter((region) => {
        for (let i = 0; i < region.length; i++) {
            const prev = region[i === 0 ? region.length - 1 : i - 1].to;
            const segment = region[i];
            const next = region[(i + 1) % region.length];

            const inside = findInsidePoint(prev, segment, next); //, 0.01);
            if (inside) {
                const [, , pos] = inside;
                const wind = windingNumber(
                    pos,
                    primitives,
                    originalSegments,
                    false,
                );
                const wcount = wind.reduce((c, w) => (w.up ? 1 : -1) + c, 0);

                if (wcount > 0) {
                    return true;
                }
            }
        }

        // const [, , pos] = findInternalPos(region);
        // const wind = windingNumber(pos, primitives, originalSegments, false);
        // const wcount = wind.reduce((c, w) => (w.up ? 1 : -1) + c, 0);

        // return wcount > 0;
        return false;
    });
};
