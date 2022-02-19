/**
 * Clipping and stuff
 */

import { pathToPrimitives, segmentToPrimitive } from '../editor/findSelection';
import { Coord, Path, PathGroup, Segment } from '../types';
import { coordKey } from './calcAllIntersections';
import { negPiToPi } from './clipPath';
import { angleBetween } from './findNextSegments';
import { angleTo, dist } from './getMirrorTransforms';
import { intersections, Primitive } from './intersect';
import { coordsEqual } from './pathsAreIdentical';
import { isClockwise } from './pathToPoints';
// import {
//     addPrevsToSegments,
//     calculateSortedHitsForSegments,
//     HIGH_PRECISION,
//     segmentsToNonIntersectingSegments,
//     SegmentWithPrev,
//     splitSegmentsByIntersections,
// } from './segmentsToNonIntersectingSegments';

export type SegmentWithPrev = { prev: Coord; segment: Segment };
export const HIGH_PRECISION = 4;

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

/** One segment's contribution to the hit intersection */
/**
 * Hmm I might actually want this to be different.
 * Have them actually be split up.
 * So that we can re-use them later? although ... then
 * hmmmm
 * maybe party needs an ID too.
 */
export type SegmentIntersection = {
    theta: number;
    // if false, this is the start of the segment
    enter: boolean;
    // if false, this is the end of the segment
    exit: boolean;
    // distance to the end of the segment. used for sorting.
    distance: number;
    // idx
    segment: number;
    id: number;
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

export class IntersectionError extends Error {
    constructor(message: string, entries: Array<SegmentIntersection>) {
        super(message + `: Entries ${JSON.stringify(entries)}`);
    }
}

/**
 * Ok what we do here is, from the entries,
 * produce a list of pairs.
 *
 * Now, if there are more than ... 2 enters and 2 exits, we need more help.
 * and this could in fact happen, in some degenerate cases? Will have to figure that out.
 * and tbh I could just bail?
 * hmmmm ok maybe it's not actually possible for this to happen.
 * ok I'll throw an error in that case, and catch it higher up
 */
export const untangleHit = (
    entries: Array<SegmentIntersection>,
): Array<[SegmentIntersection, SegmentIntersection]> => {
    const sides: Array<Side> = [];
    entries.forEach((entry) => {
        if (entry.enter) {
            sides.push({
                enter: true,
                entry,
                // So, we could instead to `angleBetween(0, entry.theta + Math.PI, true)`
                // which might more effectively normalize? idk.
                theta: negPiToPi(entry.theta + Math.PI),
            });
        }
        if (entry.exit) {
            sides.push({ enter: false, entry, theta: entry.theta });
        }
    });
    sides.sort((a, b) => a.theta - b.theta);
    if (sides.length === 2) {
        const [a, b] = sides;
        if (a.enter === b.enter) {
            throw new IntersectionError(
                `both sides have same entry? ${a.enter}`,
                entries,
            );
        }
        return [sidesPair(a, b)];
    }
    /**
     * So, going clockwise:
     * exit to enter, love it.
     * enter to exit, ONLY if the following one is also an exit.
     * exit to exit, nope. enter to enter, nope.
     */
    if (sides.length !== 4) {
        throw new IntersectionError(`Sides neither 2 nor 4`, entries);
    }
    // OPTIONS:
    // ab, cd
    // ad, bc
    // it's never an option, for non-adjacent sides to connect.
    const [a, b, c, d] = sides;
    if ((!a.enter && b.enter) || (a.enter && !b.enter && !c.enter)) {
        return [sidesPair(a, b), sidesPair(c, d)];
    }
    return [sidesPair(a, d), sidesPair(b, c)];
};
/**
 * Eh ok untangleHit could really use some unit tests.
 */

type Side = {
    enter: boolean;
    entry: SegmentIntersection;
    theta: number;
};

const sidesPair = (
    a: Side,
    b: Side,
): [SegmentIntersection, SegmentIntersection] =>
    a.enter ? [a.entry, b.entry] : [b.entry, a.entry];

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
