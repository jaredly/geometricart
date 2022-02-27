/**
 * Clipping and stuff
 */

import { segmentsBounds } from '../editor/Export';
import { pathToPrimitives, segmentToPrimitive } from '../editor/findSelection';
import { Bounds } from '../editor/GuideElement';
import { ArcSegment, Coord, Path, PathGroup, Segment } from '../types';
import { coordKey } from './calcAllIntersections';
import {
    angleForSegment,
    getAngle,
    insidePath,
    isInside,
    windingNumber,
} from './clipPath';
import { boundsIntersect } from './findInternalRegions';
import { angleBetween } from './findNextSegments';
import { angleTo, dist, push } from './getMirrorTransforms';
import { simplifyPath } from './insetPath';
import { intersections, Primitive } from './intersect';
import { coordsEqual } from './pathsAreIdentical';
import { isClockwise } from './pathToPoints';
import {
    findExit,
    findFirstExit,
    HitTransitions,
    IntersectionError,
    SegmentIntersection,
    untangleHit,
} from './untangleHit';

export function addPrevsToSegments(
    segments: Segment[],
    shape: number,
): SegmentWithPrev[] {
    return segments.map((s, i) => ({
        shape,
        prev: i === 0 ? segments[segments.length - 1].to : segments[i - 1].to,
        segment: s,
    }));
}

export const HIGH_PRECISION = 4;

export type SegmentWithPrev = { prev: Coord; segment: Segment; shape: number };

export type HitsInfo = {
    hits: {
        [key: string]: {
            coord: Coord;
            parties: Array<SegmentIntersection>;
        };
    };
    entriesBySegment: {
        coord: Coord;
        entry: SegmentIntersection;
    }[][];
    exits: {
        [key: number]: SegmentIntersection;
    };
    entryCoords: {
        [key: number]: Coord;
    };
    hitPairs: {
        [key: string]: HitTransitions;
    };
};

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
export const getSomeHits = (
    segments: SegmentWithPrev[],
    debug = false,
): HitsInfo | null => {
    if (debug) {
        console.group('Get Some Hits');
        console.groupCollapsed(`Intersections`);
    }
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
        // if (
        //     coordsEqual(segments[i].prev, segments[i].segment.to) &&
        //     segments[i].segment.type === 'Arc'
        // ) {
        //     const arc = segments[i].segment as ArcSegment;

        //     // We have a circle!
        //     // Add a self-intersection at the to point
        //     const start: SegmentIntersection = {
        //         coordKey: coordKey(arc.to, HIGH_PRECISION),
        //         distance: 0,
        //         enter: true,
        //         exit: false,
        //         id: id++,
        //         segment: i,
        //         shape: segments[i].shape,
        //         theta: angleForSegment(arc.to, arc, arc.to),
        //     };
        //     exits[start.id] = start;
        //     entriesBySegment[i].push({ coord: arc.to, entry: start });
        //     entryCoords[start.id] = arc.to;
        //     if (!hits[start.coordKey]) {
        //         hits[start.coordKey] = { coord: arc.to, parties: [] };
        //     }
        //     hits[start.coordKey].parties.push(start);

        //     // We have a circle!
        //     // Add a self-intersection at the to point
        //     const end: SegmentIntersection = {
        //         coordKey: start.coordKey,
        //         distance: Math.PI * 2,
        //         enter: false,
        //         exit: true,
        //         id: id++,
        //         segment: i,
        //         shape: segments[i].shape,
        //         theta: angleForSegment(arc.to, arc, arc.to),
        //     };
        //     exits[end.id] = end;
        //     entriesBySegment[i].push({ coord: arc.to, entry: end });
        //     entryCoords[end.id] = arc.to;
        //     if (!hits[end.coordKey]) {
        //         hits[end.coordKey] = { coord: arc.to, parties: [] };
        //     }
        //     hits[end.coordKey].parties.push(end);
        // }

        for (let j = i + 1; j < segments.length; j++) {
            const found = intersections(primitives[i], primitives[j], debug);
            if (debug) {
                console.log(
                    `Intersecting`,
                    primitives[i],
                    primitives[j],
                    found,
                );
            }
            found.forEach((coord) => {
                const k = coordKey(coord, HIGH_PRECISION);
                if (!hits[k]) {
                    hits[k] = { coord, parties: [] };
                }
                if (!hits[k].parties.find((p) => p.segment === i)) {
                    const entryI = calcSI(id++, i, segments[i], coord, k);
                    hits[k].parties.push(entryI);
                    entriesBySegment[i].push({ coord, entry: entryI });
                    entryCoords[entryI.id] = coord;
                    if (entryI.exit) {
                        exits[entryI.id] = entryI;
                    }
                }

                if (!hits[k].parties.find((p) => p.segment === j)) {
                    const entryJ = calcSI(id++, j, segments[j], coord, k);
                    hits[k].parties.push(entryJ);
                    entriesBySegment[j].push({ coord, entry: entryJ });
                    entryCoords[entryJ.id] = coord;
                    if (entryJ.exit) {
                        exits[entryJ.id] = entryJ;
                    }
                }
            });
        }
    }
    if (debug) {
        console.groupEnd();
    }

    let hasCollision = false;
    Object.keys(hits).forEach((k) => {
        if (
            // It's a crossover
            hits[k].parties.length !== 2 ||
            // We're hitting the middle of a segment
            hits[k].parties.some((p) => p.enter && p.exit)
        ) {
            hasCollision = true;
        }
    });
    if (!hasCollision) {
        if (debug) {
            console.groupEnd();
        }
        return null;
    }

    if (debug) {
        console.groupCollapsed('Untangling');
    }
    const hitPairs: { [key: string]: HitTransitions } = {};
    Object.keys(hits).forEach((k) => {
        const pairs = untangleHit(hits[k].parties, debug);
        if (debug) {
            console.log(`Untangled`, k, pairs);
        }
        hitPairs[k] = pairs;
    });

    entriesBySegment.forEach((list) =>
        list.sort((a, b) => b.entry.distance - a.entry.distance),
    );
    if (debug) {
        console.groupEnd();
        console.groupEnd();
    }
    return { hits, entriesBySegment, exits, entryCoords, hitPairs };
};

const calcSI = (
    id: number,
    i: number,
    { segment, prev, shape }: SegmentWithPrev,
    coord: Coord,
    key: string,
): SegmentIntersection => {
    const theta = angleForSegment(prev, segment, coord);
    // const theta =
    //     segment.type === 'Line'
    //         ? angleTo(prev, segment.to)
    //         : // TODO: CHECK SIGN!!
    //           angleTo(segment.center, coord) +
    //           (Math.PI / 2) * (segment.clockwise ? 1 : -1);
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
        shape,
        theta,
        distance,
    };
};

// export const untangleHits = (hits: {[key: string]: {coord: Coord, parties: Array<SegmentIntersection>}}) => {

// }

export const clipPathTry = (
    path: Path,
    clip: Array<Segment>,
    clipBounds: Bounds,
    debug = false,
    groupMode?: PathGroup['clipMode'],
): Array<Path> => {
    try {
        return clipPathNew(path, clip, clipBounds, debug, groupMode);
    } catch (err) {
        console.error(err);
        return [];
    }
};

export const clipPathNew = (
    path: Path,
    clip: Array<Segment>,
    clipBounds: Bounds,
    debug = false,
    groupMode?: PathGroup['clipMode'],
): Array<Path> => {
    if (debug) {
        clip = simplifyPath(clip);
        console.groupCollapsed(`Clip path ${path.id}`);
        console.groupCollapsed(`Path & Clip`);
        console.log(path);
        console.log(clip);
        console.groupEnd();
    }
    if (!isClockwise(path.segments)) {
        throw new Error(`non-clockwise path`);
    }
    if (!isClockwise(clip)) {
        throw new Error(`non-clockwise clip`);
    }
    const clipMode = path.clipMode ?? groupMode;

    if (clipMode === 'none') {
        if (debug) {
            console.groupEnd();
        }
        return [path];
    }

    // UGH this is a cheating hack, but I don't realy know how to do it better???
    if (path.segments.length === 1 && path.segments[0].type === 'Arc') {
        const arc = path.segments[0];
        const mid1 = push(
            arc.center,
            angleTo(arc.center, arc.to) + Math.PI / 1000,
            dist(arc.to, arc.center),
        );
        const mid = push(
            arc.center,
            angleTo(arc.to, arc.center),
            dist(arc.to, arc.center),
        );
        path = {
            ...path,
            segments: [
                // {...arc, to: mid1},
                { type: 'Line', to: mid1 },
                // { type: 'Line', to: arc.to },
                arc,
            ],
        };
    }

    const pathBounding = segmentsBounds(path.segments);
    if (!boundsIntersect(pathBounding, clipBounds)) {
        if (debug) {
            console.log('no intersect', clipBounds, pathBounding);
            console.groupEnd();
        }
        return [];
    }

    // We have a circle!
    if (clip.length === 1 && clip[0].type === 'Arc') {
        const arc = clip[0];
        const mid1 = push(
            arc.center,
            angleTo(arc.center, arc.to) + Math.PI / 1000,
            dist(arc.to, arc.center),
        );
        const mid = push(
            arc.center,
            angleTo(arc.to, arc.center),
            dist(arc.to, arc.center),
        );
        // Make it into two half-circles, it will make things much simpler to think about
        clip = [
            // { ...arc, to: mid1 },
            { type: 'Line', to: mid1 },
            // { type: 'Line', to: arc.to },
            arc,
        ];
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

    const allSegments = addPrevsToSegments(path.segments, 0).concat(
        addPrevsToSegments(clip, 1),
    );

    const hitsResults = getSomeHits(allSegments, debug);

    if (debug) {
        console.log('wat');
    }
    if (!hitsResults) {
        if (insidePath(path.origin, pathToPrimitives(clip), clip)) {
            if (debug) {
                console.log(`Inside clip, all good`);
                const primitives = pathToPrimitives(clip);
                const wind = windingNumber(path.origin, primitives, clip);
                const wcount = wind.reduce((c, w) => (w.up ? 1 : -1) + c, 0);
                console.log(`Winding check`, path.origin, primitives, clip);
                console.log(wind, wcount);

                console.groupEnd();
            }
            return [path];
        } else {
            if (debug) {
                console.log('Not inside clip, no dice');
                console.groupEnd();
            }
            return [];
        }
    } else if (clipMode === 'remove') {
        if (debug) {
            console.log('GroupMode = remove');
            console.groupEnd();
        }
        return [];
    }
    const { hits, entriesBySegment, exits, entryCoords, hitPairs } =
        hitsResults;

    if (debug) {
        console.groupCollapsed(`Details`);
        console.log('by segment', entriesBySegment, hits, allSegments);
        console.log(JSON.stringify(hitPairs, null, 2));
        console.groupEnd();
    }

    // console.log(`Exits to hit ${Object.keys(exits).length}`);

    // whereeee to start?
    // like.
    // gotta start somewhere, right?
    // Ok, so current is always an exit. And we're looking for our next enter?
    let current = entriesBySegment[0][0].entry;

    type Region = {
        segments: Array<SegmentWithPrev>;
        isInternal: boolean | null;
    };

    // oh also we have to search around for things that haven't been hit yet. ok.
    const regions: Array<Region> = [];

    let region: Region = { isInternal: null, segments: [] };

    const firstExit = findFirstExit(hitPairs[current.coordKey], current.id);
    if (firstExit != null) {
        // throw new Error(`No first exit`);
        region.isInternal = firstExit;
    }
    if (debug) {
        console.group(`Region ${regions.length}`);
        console.log(
            `First exit:`,
            region.isInternal,
            hitPairs[current.coordKey],
            current.id,
        );
    }

    delete exits[current.id];
    // if (debug) {
    //     console.log(`del exit`, current.id);
    // }

    while (true) {
        // let next: {coord: Coord, entry: SegmentIntersection};

        const idx = entriesBySegment[current.segment].findIndex(
            (e) => e.entry.id === current.id,
        );
        const next = entriesBySegment[current.segment][idx + 1];
        if (!next) {
            console.warn(
                new IntersectionError(
                    `WHAT?? how is this an exit, and yet nothing next? ${idx}`,
                    entriesBySegment[current.segment].map((s) => s.entry),
                ),
            );
            break;
        }

        const exit = findExit(
            hitPairs[next.entry.coordKey],
            next.entry.id,
            region.isInternal,
            exits,
        );

        region.segments.push({
            prev: entryCoords[current.id],
            shape: exit ? exit[0].shape : -1,
            segment: {
                ...allSegments[current.segment].segment,
                to: next.coord,
            },
        });

        if (debug) {
            console.log(
                `Added a segment from ${current.segment} ix ${idx}. From`,
                entryCoords[current.id],
                `to`,
                next.coord,
                `Exiting:`,
                exit,
            );
            // console.log(
            //     'at',
            //     current.segment,
            //     idx,
            //     entryCoords[current.id],
            //     next.coord,
            //     // pair,
            //     exit,
            // );
            // console.log(
            //     `Current region status: Internal? ${region.isInternal}. ${region.segments.length} segments.`,
            // );
        }

        if (!exit) {
            console.log(idx, next, hitPairs);
            console.log(hitPairs[next.entry.coordKey]);
            throw new IntersectionError(
                `no pair foind for next ${idx + 1}`,
                entriesBySegment[current.segment].map((m) => m.entry),
            );
        }
        current = exit[0];
        if (exit[1] != null) {
            if (region.isInternal != null && region.isInternal !== exit[1]) {
                if (debug) {
                    console.warn(
                        `INTERNAL DISAGREEMENT`,
                        region.isInternal,
                        exit,
                    );
                }
                // This will exclude this region from the output.
                // But also, this is a bug!!!
                // region.isInternal = false;
                region.isInternal = exit[1];
            } else {
                region.isInternal = exit[1];
            }
        }
        if (!exits[current.id]) {
            if (debug) {
                console.log(
                    `Finished an ${
                        {
                            true: 'internal',
                            false: 'external',
                            null: 'unknown',
                        }[region.isInternal + '']
                    } region`,
                );
                if (
                    !coordsEqual(
                        region.segments[region.segments.length - 1].segment.to,
                        region.segments[0].prev,
                    )
                ) {
                    console.warn(`ERROR endpoints don't match up though`);
                }
                console.groupEnd();
            }
            regions.push(region);
            const k = Object.keys(exits)[0];
            if (!k) {
                break;
            }
            region = { isInternal: null, segments: [] };
            current = exits[+k];
            if (debug) {
                console.group(`Region ${regions.length}`);
                console.log(`First current:`, current);
            }
        }
        delete exits[current.id];
        // if (debug) {
        //     console.log(`del exit`, current.id);
        // }
    }

    if (debug) {
        console.log('regons', regions);
    }

    const filtered = regions
        .filter((region) => region.isInternal !== false)
        .map((region) => {
            // TODO: verify that the prevs actually do match up
            return region.segments
                .map((s, i) => {
                    const prev =
                        region.segments[
                            i === 0 ? region.segments.length - 1 : i - 1
                        ].segment.to;
                    if (!coordsEqual(s.prev, prev)) {
                        console.warn(`BAD PREV`, s.prev, prev, i);
                    }
                    return s.segment;
                })
                .concat(
                    coordsEqual(
                        region.segments[0].prev,
                        region.segments[region.segments.length - 1].segment.to,
                    )
                        ? []
                        : [
                              { type: 'Line', to: { x: 0, y: 0 } },
                              { type: 'Line', to: region.segments[0].prev },
                          ],
                );
        })
        .filter(isClockwise)
        .map((segments) => ({
            ...path,
            segments,
            origin: segments[segments.length - 1].to,
        }));
    if (debug) {
        console.log(`All done ${filtered.length} regions found`);
        console.groupEnd();
    }
    return filtered;

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
