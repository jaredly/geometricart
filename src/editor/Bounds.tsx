import { Bounds } from './GuideElement';
import { isAngleBetween } from '../rendering/findNextSegments';
import { angleTo, dist, push } from '../rendering/getMirrorTransforms';
import { Coord, Segment } from '../types';

export type PendingBounds = {
    x0: null | number;
    x1: null | number;
    y0: null | number;
    y1: null | number;
};

export function addCoordToBounds(bounds: PendingBounds, c: Coord, margin = 0) {
    bounds.x0 = bounds.x0 == null ? c.x : Math.min(c.x - margin, bounds.x0);
    bounds.x1 = bounds.x1 == null ? c.x : Math.max(c.x + margin, bounds.x1);
    bounds.y0 = bounds.y0 == null ? c.y : Math.min(c.y - margin, bounds.y0);
    bounds.y1 = bounds.y1 == null ? c.y : Math.max(c.y + margin, bounds.y1);
}
export function newPendingBounds(): PendingBounds {
    return { x0: null, y0: null, x1: null, y1: null };
}

export const boundsForCoords = (...coords: Array<Coord>) => {
    const xs = coords.map((c) => c.x);
    const ys = coords.map((c) => c.y);
    return {
        x0: Math.min(...xs),
        x1: Math.max(...xs),
        y0: Math.min(...ys),
        y1: Math.max(...ys),
    };
};

export const mergeBounds = (b1: Bounds, b2: Bounds): Bounds => ({
    x0: Math.min(b1.x0, b2.x0),
    y0: Math.min(b1.y0, b2.y0),
    x1: Math.max(b1.x1, b2.x1),
    y1: Math.max(b1.y1, b2.y1),
});

export const largestDimension = ({ x0, x1, y0, y1 }: Bounds) =>
    Math.max(Math.abs(x0), Math.abs(x1), Math.abs(y0), Math.abs(y1));

export const adjustBounds = (
    { x0, x1, y0, y1 }: Bounds,
    { x, y }: Coord,
): Bounds => ({
    x0: x0 - x,
    x1: x1 - x,
    y0: y0 - y,
    y1: y1 - y,
});

export const segmentsCenter = (segments: Array<Segment>): Coord => {
    const bounds = segmentsBounds(segments);
    return boundsMidpoint(bounds);
};

export const segmentsBounds = (segments: Array<Segment>): Bounds => {
    let bounds = segmentBounds(segments[segments.length - 1].to, segments[0]);
    for (let i = 1; i < segments.length; i++) {
        const next = segmentBounds(segments[i - 1].to, segments[i]);
        bounds = mergeBounds(bounds, next);
    }
    return bounds;
};

export const segmentBounds = (prev: Coord, segment: Segment): Bounds => {
    switch (segment.type) {
        case 'Line':
            return {
                x0: Math.min(segment.to.x, prev.x),
                x1: Math.max(segment.to.x, prev.x),
                y0: Math.min(segment.to.y, prev.y),
                y1: Math.max(segment.to.y, prev.y),
            };
        case 'Quad':
            // throw new Error('bound quad');
            return {
                x0: Math.min(segment.to.x, prev.x),
                x1: Math.max(segment.to.x, prev.x),
                y0: Math.min(segment.to.y, prev.y),
                y1: Math.max(segment.to.y, prev.y),
            };
        case 'Arc': {
            // Hmmm ok what we really need is:
            // start & end & the 4 cardinal points if they are crossed.
            const t0 = angleTo(segment.center, prev);
            const t1 = angleTo(segment.center, segment.to);

            const r = dist(segment.center, segment.to);

            return boundsForCoords(
                prev,
                segment.to,
                ...[0, Math.PI, Math.PI / 2, -Math.PI / 2]
                    .filter((t) => isAngleBetween(t0, t, t1, segment.clockwise))
                    .map((t) => push(segment.center, t, r)),
            );
        }
    }
};

export function boundsMidpoint(bounds: Bounds): Coord {
    return { x: (bounds.x0 + bounds.x1) / 2, y: (bounds.y0 + bounds.y1) / 2 };
}
