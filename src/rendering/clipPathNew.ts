/**
 * Clipping and stuff
 */

import { segmentToPrimitive } from '../editor/findSelection';
import { Coord, Path, PathGroup, Segment } from '../types';
import { coordKey } from './calcAllIntersections';
import { angleBetween } from './findNextSegments';
import { angleTo, dist } from './getMirrorTransforms';
import { intersections, Primitive } from './intersect';
import { coordsEqual } from './pathsAreIdentical';
import { isClockwise } from './pathToPoints';
import {
    IntersectionError,
    SegmentIntersection,
    untangleHit,
} from './untangleHit';

export function addPrevsToSegments(segments: Segment[]): SegmentWithPrev[] {
    return segments.map((s, i) => ({
        prev: i === 0 ? segments[segments.length - 1].to : segments[i - 1].to,
        segment: s,
    }));
}

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
    const exits: { [key: number]: SegmentIntersection } = {};
    const entryCoords: { [key: number]: Coord } = {};

    const entriesBySegment: Array<
        Array<{ coord: Coord; entry: SegmentIntersection }>
    > = new Array(segments.length).fill([]).map(() => []);

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

                const entryI = calcSI(id++, i, segments[i], coord, k);
                hits[k].parties.push(entryI);
                entriesBySegment[i].push({ coord, entry: entryI });

                const entryJ = calcSI(id++, j, segments[j], coord, k);
                hits[k].parties.push(entryJ);
                entriesBySegment[j].push({ coord, entry: entryJ });

                entryCoords[entryI.id] = coord;
                entryCoords[entryJ.id] = coord;

                if (entryI.exit) {
                    exits[entryI.id] = entryI;
                }
                if (entryJ.exit) {
                    exits[entryJ.id] = entryJ;
                }
            });
        }
    }
    entriesBySegment.forEach((list) =>
        list.sort((a, b) => b.entry.distance - a.entry.distance),
    );
    return { hits, entriesBySegment, exits, entryCoords };
};

const calcSI = (
    id: number,
    i: number,
    { segment, prev }: SegmentWithPrev,
    coord: Coord,
    key: string,
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
        coordKey: key,
        theta,
        distance,
    };
};

// export const untangleHits = (hits: {[key: string]: {coord: Coord, parties: Array<SegmentIntersection>}}) => {

// }

export const clipPathNew = (
    path: Path,
    clip: Array<Segment>,
    // clipPrimitives: Array<Primitive>,
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

    const { hits, entriesBySegment, exits, entryCoords } =
        getSomeHits(allSegments);

    // console.log('by segment', entriesBySegment);

    const hitPairs: {
        [key: string]: Array<[SegmentIntersection, SegmentIntersection]>;
    } = {};
    Object.keys(hits).forEach((k) => {
        const pairs = untangleHit(hits[k].parties);
        hitPairs[k] = pairs;
    });

    // console.log(`Exits to hit ${Object.keys(exits).length}`);

    // whereeee to start?
    // like.
    // gotta start somewhere, right?
    // Ok, so current is always an exit. And we're looking for our next enter?
    let current = entriesBySegment[0][0].entry;
    delete exits[current.id];

    // oh also we have to search around for things that haven't been hit yet. ok.
    const regions: Array<Array<SegmentWithPrev>> = [];

    let region: Array<SegmentWithPrev> = [];

    while (true) {
        // let next: {coord: Coord, entry: SegmentIntersection};

        const idx = entriesBySegment[current.segment].findIndex(
            (e) => e.entry.id === current.id,
        );
        const next = entriesBySegment[current.segment][idx + 1];
        if (!next) {
            throw new IntersectionError(
                `WHAT?? how is this an exit, and yet nothing next? ${idx}`,
                entriesBySegment[current.segment].map((s) => s.entry),
            );
        }

        // console.log(
        //     'at',
        //     current.segment,
        //     idx,
        //     entryCoords[current.id],
        //     next.coord,
        // );

        region.push({
            prev: entryCoords[current.id],
            segment: {
                ...allSegments[current.segment].segment,
                to: next.coord,
            },
        });

        const pair = hitPairs[next.entry.coordKey].find(
            (p) => p[0].id === next.entry.id,
        );

        if (!pair) {
            console.log(idx, next, hitPairs);
            console.log(hitPairs[next.entry.coordKey]);
            throw new IntersectionError(
                `no pair foind for next ${idx + 1}`,
                entriesBySegment[current.segment].map((m) => m.entry),
            );
        }
        current = pair[1];
        if (!exits[current.id]) {
            // console.log('finished a region!');
            regions.push(region);
            const k = Object.keys(exits)[0];
            if (!k) {
                break;
            }
            region = [];
            current = exits[+k];
        }
        delete exits[current.id];
    }

    return regions
        .map((region) => {
            // TODO: verify that the prevs actually do match up
            return region.map((s) => s.segment);
        })
        .filter(isClockwise);

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

    // How to tell if a partialSegment is from the path or the clip?
    // if the originalIdx < path.segments.length, then it's path!

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

// export const segmentForEntries = (
//     current: SegmentIntersection,
//     prev: Coord,
//     next: { coord: Coord; entry: SegmentIntersection },
//     segment: Segment,
// ): SegmentWithPrev => {
//     return {
//         prev,
//         segment: {
//             ...segment,
//             to: next.coord,
//         },
//     };
// };
