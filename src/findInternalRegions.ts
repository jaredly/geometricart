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
import { sortHitsForPrimitive } from './clipPath';
import { pathToPrimitives } from './findSelection';
import { intersections } from './intersect';
import { coordsEqual } from './pathsAreIdentical';
import { Hit } from './pruneInsetPath';
import { Coord, Segment } from './types';
import { angleTo } from './getMirrorTransforms';
import { angleBetween } from './findNextSegments';

export const segmentsToNonIntersectingSegments = (segments: Array<Segment>) => {
    const primitives = pathToPrimitives(segments);
    const hits: Array<Array<Hit>> = new Array(segments.length)
        .fill([])
        .map((m) => []);
    const allHits: Array<Hit> = [];
    for (let i = 0; i < segments.length; i++) {
        const previ =
            i === 0 ? segments[segments.length - 1].to : segments[i - 1].to;
        for (let j = i + 1; j < segments.length; j++) {
            const prevj =
                j === 0 ? segments[segments.length - 1].to : segments[j - 1].to;
            const these = intersections(primitives[i], primitives[j]);
            these.forEach((coord) => {
                if (coord.x === -0) {
                    coord.x = 0;
                }
                if (coord.y === -0) {
                    coord.y = 0;
                }
                const iend =
                    coordsEqual(coord, previ) ||
                    coordsEqual(coord, segments[i].to);
                const jend =
                    coordsEqual(coord, prevj) ||
                    coordsEqual(coord, segments[j].to);
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

export const findClockwiseRegions = (
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

        // let exit = otherExits.length ? otherExits[0] :
        // if (!otherExits.length) {
        // 	exit =
        // }
    });

    return regions.filter((region) => isClockwise(region));
};
