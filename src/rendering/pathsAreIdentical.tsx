import { coordKey } from './coordKey';
import { segmentKey } from './segmentKey';
import { Coord, Segment } from '../types';

// export const genId = () => Math.random().toString(36).slice(2);

export const coordsEqual = (one: Coord, two: Coord, precision?: number) =>
    coordKey(one, precision) === coordKey(two, precision);
export const segmentsEqual = (prev: Coord, one: Segment, two: Segment) =>
    segmentKey(prev, one) === segmentKey(prev, two);

export const pathToSegmentKeys = (origin: Coord, segments: Array<Segment>) =>
    segments.map((seg, i) =>
        segmentKey(i === 0 ? origin : segments[i - 1].to, seg),
    );

export const reverseSegment = (prev: Coord, segment: Segment): Segment => {
    switch (segment.type) {
        case 'Line':
        case 'Quad':
            return { ...segment, to: prev };
        case 'Arc':
            return {
                ...segment,
                clockwise: !segment.clockwise,
                to: prev,
            };
    }
};

export const pathToReversedSegmentKeys = (
    origin: Coord,
    segments: Array<Segment>,
) => {
    const result = [];
    for (let i = segments.length - 1; i >= 0; i--) {
        const seg = segments[i];
        const prev = i === 0 ? origin : segments[i - 1].to;
        result.push(segmentKey(seg.to, reverseSegment(prev, seg)));
    }
    return result;
};

export const pathsAreIdentical = (
    one: Array<string>,
    two: Array<string>,
): boolean => {
    if (one.length !== two.length) {
        return false;
    }
    for (let i = 0; i < two.length; i++) {
        if (two[i] !== one[0]) {
            continue;
        }
        return one.every((item, j) => item === two[(i + j) % two.length]);
    }
    return false;
};
