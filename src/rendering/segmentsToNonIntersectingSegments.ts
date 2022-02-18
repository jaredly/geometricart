import { coordKey } from './calcAllIntersections';
import { sortHitsForPrimitive } from './clipPath';
import { pathToPrimitives } from '../editor/findSelection';
import { intersections, Primitive } from './intersect';
import { coordsEqual } from './pathsAreIdentical';
import { Hit } from './pruneInsetPath';
import { Coord, Segment } from '../types';
import { angleTo } from './getMirrorTransforms';
import { segmentAngle } from './findInternalRegions';

export type Intersection = { entering: Array<number>; exiting: Array<number> };

export const splitSegmentsByIntersections = (
    segments: Array<Segment>,
    sorted: Array<Array<Hit>>,
) => {
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
        let hitStart = null as null | number;
        while (
            !coordsEqual(prev, segment.to, HIGH_PRECISION) &&
            intersection <= sorted[i].length
        ) {
            const key = coordKey(prev, HIGH_PRECISION);
            const to =
                intersection === sorted[i].length
                    ? segment.to
                    : sorted[i][intersection].coord;
            let hitEnd =
                intersection === sorted[i].length
                    ? null
                    : sorted[i][intersection].idx;
            if (!coordsEqual(prev, to, HIGH_PRECISION)) {
                if (!froms[key]) {
                    froms[key] = { coord: prev, exits: [] };
                }
                froms[key].exits.push(result.length);
                if (segment.type === 'Arc') {
                    const initialAngle = segmentAngle(
                        prev,
                        { ...segment, to },
                        true,
                        true,
                    );
                    const finalAngle = segmentAngle(
                        prev,
                        { ...segment, to },
                        false,
                        true,
                    );
                    result.push({
                        prev,
                        segment: { ...segment, to },
                        sourceIdx: i,
                        initialAngle,
                        finalAngle,
                        hitStart,
                        hitEnd,
                    });
                } else {
                    const theta = angleTo(prev, to);
                    result.push({
                        prev,
                        segment: { ...segment, to },
                        sourceIdx: i,
                        initialAngle: theta,
                        finalAngle: theta,
                        hitStart,
                        hitEnd,
                    });
                }
            }
            prev = to;
            intersection++;
        }
    });
    return { result, froms };
};

export const segmentsToNonIntersectingSegments = (segments: Array<Segment>) => {
    const { sorted } = calculateSortedHitsForSegments(segments);

    return splitSegmentsByIntersections(segments, sorted);
};

export const HIGH_PRECISION = 4;
// Ok, so now the game plan is:
// take those segments, follow them around ...
// and ... hmmm
// so the rule is: always switch! We assume there will only ever be
// 2 exits from a given point, because we're wildly optimistic.
// I mean, we could say:
// if there's one to the right or left, then take it?

export type Froms = {
    [key: string]: {
        coord: Coord;
        exits: Array<number>;
    };
};
// So there's probably a weird edge case if two corners happen to touch
// ... not super likely, but idk what would happen.

export type PartialSegment = {
    prev: Coord;
    segment: Segment;
    sourceIdx: number;
    initialAngle: number;
    finalAngle: number;
    hitStart: number | null;
    hitEnd: number | null;
};

export function calculateSortedHitsForSegments(
    segments: Segment[],
    /** Do we want to include intersections that are just two endpoints meeting? */
    allowEndpoints = false,
) {
    const primitives = pathToPrimitives(segments);
    const hits: Array<Array<Hit>> = new Array(segments.length)
        .fill([])
        .map((m) => []);
    let hitIdx = 0;
    const allHits: Array<Hit> = [];
    for (let i = 0; i < segments.length; i++) {
        const previ =
            i === 0 ? segments[segments.length - 1].to : segments[i - 1].to;
        for (let j = i + 1; j < segments.length; j++) {
            const prevj =
                j === 0 ? segments[segments.length - 1].to : segments[j - 1].to;
            const these = intersections(primitives[i], primitives[j]);
            these.forEach((coord) => {
                if (!allowEndpoints) {
                    const iend =
                        coordsEqual(coord, previ, HIGH_PRECISION) ||
                        coordsEqual(coord, segments[i].to, HIGH_PRECISION);
                    const jend =
                        coordsEqual(coord, prevj, HIGH_PRECISION) ||
                        coordsEqual(coord, segments[j].to, HIGH_PRECISION);
                    // This is just two segments meeting. no big deal.
                    // Note that if we managed to get in a place where four lines met in the same place,
                    // this logic would break. here's hoping.
                    if (iend && jend) {
                        return;
                    }
                }
                const hit = { first: i, second: j, coord, idx: hitIdx++ };
                hits[i].push(hit);
                hits[j].push(hit);
                allHits.push(hit);
            });
        }
    }

    const sorted = hits.map((hits, i) =>
        sortHitsForPrimitive(hits, primitives[i], segments[i]),
    );
    return { sorted, allHits };
}
