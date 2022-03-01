/**
 * Clipping and stuff
 */

import { segmentsBounds } from '../editor/Bounds';
import { pathToPrimitives, segmentToPrimitive } from '../editor/findSelection';
import { Bounds } from '../editor/GuideElement';
import { ArcSegment, Coord, Path, PathGroup, Segment } from '../types';
import { coordKey } from './calcAllIntersections';
import { angleForSegment, getAngle, insidePath, isInside } from './clipPath';
import { windingNumber } from './windingNumber';
import { boundsIntersect } from './findInternalRegions';
import { angleBetween } from './findNextSegments';
import { angleTo, dist, push } from './getMirrorTransforms';
import { simplifyPath } from './simplifyPath';
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

export const intersectSegments = (
    segments: Array<SegmentWithPrev>,
    debug = false,
) => {
    const primitives = segments.map(({ prev, segment }) =>
        segmentToPrimitive(prev, segment),
    );
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

    let id = 0;
    if (debug) {
        console.groupCollapsed(`Intersections`);
    }
    for (let i = 0; i < segments.length; i++) {
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

    entriesBySegment.forEach((list) =>
        list.sort((a, b) => b.entry.distance - a.entry.distance),
    );

    return { hits, entriesBySegment, entryCoords, exits };
};

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
    }

    const { hits, entriesBySegment, entryCoords, exits } =
        intersectSegments(segments);

    if (!hasNonEndpointCollision(hits)) {
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
        // clip = simplifyPath(clip);
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
        // ugh or just hack a small line. I don't love it.
        clip = [
            // { ...arc, to: mid1 },
            { type: 'Line', to: mid1 },
            // { type: 'Line', to: arc.to },
            arc,
        ];
    }

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

    const { hits, entriesBySegment, hitPairs } = hitsResults;

    if (debug) {
        console.groupCollapsed(`Details`);
        console.log('by segment', entriesBySegment, hits, allSegments);
        console.log(JSON.stringify(hitPairs, null, 2));
        console.groupEnd();
    }

    // console.log(`Exits to hit ${Object.keys(exits).length}`);
    const regions = collectRegions(allSegments, hitsResults, debug);

    // whereeee to start?
    // like.
    // gotta start somewhere, right?
    // Ok, so current is always an exit. And we're looking for our next enter?

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
};

export const prevSegmentsToShape = (
    segments: Array<SegmentWithPrev>,
): null | Array<Segment> => {
    let bad = false;
    const singles = segments.map((s, i) => {
        const prev = segments[i === 0 ? segments.length - 1 : i - 1].segment.to;
        if (!coordsEqual(s.prev, prev)) {
            bad = true;
            console.warn(`BAD PREV`, s.prev, prev, i);
        }
        return s.segment;
    });
    return bad ? null : singles;
    // .concat(
    //     coordsEqual(
    //         segments[0].prev,
    //         segments[segments.length - 1].segment.to,
    //     )
    //         ? []
    //         : [
    //               { type: 'Line', to: { x: 0, y: 0 } },
    //               { type: 'Line', to: segments[0].prev },
    //           ],
    // );
};

export function hasNonEndpointCollision(hits: {
    [key: string]: { coord: Coord; parties: Array<SegmentIntersection> };
}) {
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
    return hasCollision;
}

export const collectRegions = (
    allSegments: Array<SegmentWithPrev>,
    hitsResults: HitsInfo,
    debug = false,
    ignoreUnclosed = false,
) => {
    const { entriesBySegment, exits, entryCoords, hitPairs } = hitsResults;

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

    while (true) {
        const idx = entriesBySegment[current.segment].findIndex(
            (e) => e.entry.id === current.id,
        );
        const next = entriesBySegment[current.segment][idx + 1];
        if (!next) {
            if (!ignoreUnclosed) {
                console.warn(
                    new IntersectionError(
                        `WHAT?? how is this an exit, and yet nothing next? ${idx}`,
                        entriesBySegment[current.segment].map((s) => s.entry),
                    ),
                );
            }
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
            const closed = coordsEqual(
                region.segments[region.segments.length - 1].segment.to,
                region.segments[0].prev,
            );
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
                if (!closed) {
                    console.warn(`ERROR endpoints don't match up though`);
                }
                console.groupEnd();
            }
            // TODO: Should I allow opens via a param?
            // Could be helpful for debugging.
            if (closed) {
                regions.push(region);
            }
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
    }
    return regions;
};
