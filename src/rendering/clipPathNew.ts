/**
 * Clipping and stuff
 */

import { pathToPrimitives, segmentToPrimitive } from '../editor/findSelection';
import { Coord, Path, PathGroup, Segment } from '../types';
import { coordKey } from './calcAllIntersections';
import { angleBetween } from './findNextSegments';
import { angleTo, dist } from './getMirrorTransforms';
import { intersections, Primitive } from './intersect';
import { coordsEqual } from './pathsAreIdentical';
import { isClockwise } from './pathToPoints';
import {
    addPrevsToSegments,
    calculateSortedHitsForSegments,
    segmentsToNonIntersectingSegments,
    splitSegmentsByIntersections,
} from './segmentsToNonIntersectingSegments';
import { SegmentIntersection } from './untangleHit';

export const HIGH_PRECISION = 4;

export type SegmentWithPrev = { prev: Coord; segment: Segment };

/**
 * what do I need from a 'hit'?
 *
 * and, importantly: Do I need to "dedup" hits?
 *
 * Ok I should really make a testing page for this first.
 * ok, we have the basics.
 */

/**
 * Ok, so here I'm not paying attention to the fact that some segments
 * belong to one shape, and some to another.
 *
 * Should I?
 *
 * I could cut down on a lot of collision tests.
 * But, it would be quite nice to reuse this logic from the inset stuff.
 * So, maybe I'll just leave it.
 */
export const getSomeHits = (segments: SegmentWithPrev[]) => {
    const hits: {
        [key: string]: {
            coord: Coord;
            parties: Array<SegmentIntersection>;
        };
    } = {};

    const entriesBySegment: Array<
        Array<{ coord: Coord; entry: SegmentIntersection }>
    > = new Array(segments.length).fill([]);

    const primitives = segments.map(({ prev, segment }) =>
        segmentToPrimitive(prev, segment),
    );

    let id = 0;

    for (let i = 0; i < segments.length; i++) {
        for (let j = i + 1; j < segments.length; j++) {
            const found = intersections(primitives[i], primitives[j]);
            found.forEach((coord) => {
                const k = coordKey(coord, HIGH_PRECISION);
                if (!hits[k]) {
                    hits[k] = { coord, parties: [] };
                }

                const entryI = calcSI(id++, i, segments[i], coord);
                hits[k].parties.push(entryI);
                entriesBySegment[i].push({ coord, entry: entryI });

                const entryJ = calcSI(id++, j, segments[j], coord);
                hits[k].parties.push(entryJ);
                entriesBySegment[j].push({ coord, entry: entryJ });
            });
        }
    }
    return { hits, entriesBySegment };
};

const calcSI = (
    id: number,
    i: number,
    { segment, prev }: SegmentWithPrev,
    coord: Coord,
): SegmentIntersection => {
    const theta =
        segment.type === 'Line'
            ? angleTo(prev, segment.to)
            : // TODO: CHECK SIGN!!
              angleTo(segment.center, coord) +
              Math.PI * (segment.clockwise ? 1 : -1);
    const distance =
        segment.type === 'Line'
            ? dist(coord, segment.to)
            : angleBetween(
                  angleTo(segment.center, coord),
                  angleTo(segment.center, segment.to),
                  segment.clockwise,
              );
    return {
        id,
        segment: i,
        enter: !coordsEqual(coord, prev, HIGH_PRECISION),
        exit: !coordsEqual(coord, segment.to, HIGH_PRECISION),
        theta,
        distance,
    };
};

// export const untangleHits = (hits: {[key: string]: {coord: Coord, parties: Array<SegmentIntersection>}}) => {

// }

export const clipPathNew = (
    path: Path,
    clip: Array<Segment>,
    clipPrimitives: Array<Primitive>,
    groupMode?: PathGroup['clipMode'], // TODO this should definitely be a path level attribute
) => {
    if (!isClockwise(path.segments)) {
        throw new Error(`non-clockwise path`);
    }

    /*
    so our goal data structure ... is ...
    a directed segment ...
    and it's a graph, right?
    where segments are reified
    and points are ... hmmmm coords? I mean they could also not be I guess.
    Unless we have some co-incident things ... in which case it could get weird?
    so honestly, if we start with non-self-intersecting dealios, we can't have
    too many things.

    but do I want to support self-intersectings? tbh I might.

    ok but if I ignore that for now...

    ok so the first question to answer is "for each of these primitives, what are the intersections, in order?"
    right?

    ok, so we have a reliable answer to that question.

    Now: 

    */

    const allSegments = addPrevsToSegments(path.segments).concat(
        addPrevsToSegments(clip),
    );

    const { hits, entriesBySegment } = getSomeHits(allSegments);

    // const { sorted, allHits } = calculateSortedHitsForSegments(allSegments);
    // const split = splitSegmentsByIntersections(allSegments, sorted);

    /**
     * Ok, so now we've done that.
     *
     * and now we want to ... examine each intersection ...
     * ...
     * ...
     * hmmm ok, so we do need a list of segments
     * ...
     * and then, taking each intersection in turn, we want to figure out
     * how to connect up the relevant segments.
     *
     * like, each intersection has two entering and two exiting segments,
     * each with their own respective angles. (tangent angle in the case of an arc).
     * and we connect up each entering segment with an exiting segment.
     * and at the end of the day, we traverse the map of segments.
     *
     * now .. we want to turn these interesctions ... into continuations.
     * so at the end of the say, each segments has
     *
     * so, it is definitely possible for there to be dups.
     */

    const connections: {
        [enteringSegment: number]: number; // to exiting segment ID
    } = {};

    // How to tell if a partialSegment is from the path or the clip?
    // if the originalIdx < path.segments.length, then it's path!
    const { result, froms } = segmentsToNonIntersectingSegments(
        path.segments.concat(clip),
    );

    // What'st he data structure?
    // [{in, theta}, {out: theta}, {in: theta}, {out: theta}]
    // [{in, theta}, {in: theta}, {out: theta}, {out: theta}]

    // {type: 'cross', ins: [theta, theta], outs: [theta, theta]}
    // {type: 'bounce', ins: [theta, theta], outs: [theta, theta]}

    // {type: 'cross', one: {in: theta, out: theta}, two: {in: theta, out: theta}}

    // hmmmm
    // ok, so it looks like:
    // - I can essentially disconnect all these crossovers.
    // - and then just follow them around.
    // also, if I see something going /into/ the other, I can disable that crossover.
    // and paths with disabled parts get ignored.
    // but, what about more complex joins?
    // I'll just pretend those don't exist for the moment.
};
