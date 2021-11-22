import { coordKey } from './calcAllIntersections';
import { closeEnough } from './clipPath';
import { segmentKey } from './DrawPath';
import { angleTo } from './getMirrorTransforms';
import { epsilon, Primitive } from './intersect';
import {
    Coord,
    Intersect,
    PendingPath,
    PendingSegment,
    Segment,
} from './types';

export const dedup = (numbers: Array<number>) => {
    const seen: { [k: number]: true } = {};
    return numbers.filter((n) => (seen[n] ? false : (seen[n] = true)));
};

export const dedupString = (numbers: Array<string>) => {
    const seen: { [k: string]: true } = {};
    return numbers.filter((n) => (seen[n] ? false : (seen[n] = true)));
};

export const findNextSegments = (
    pending: PendingPath,
    primitives: Array<Primitive>,
    coords: Array<Intersect>,
): Array<PendingSegment> => {
    const next = pending.parts.length
        ? pending.parts[pending.parts.length - 1].to
        : pending.origin;
    const intersections = next.primitives;
    const touchingPrimitives = dedup(
        ([] as Array<number>).concat(...intersections),
    );
    const coordsForPrimitive: { [key: number]: { [key: string]: Intersect } } =
        {};
    touchingPrimitives.forEach((id) => (coordsForPrimitive[id] = {}));
    coords.forEach((int) => {
        int.primitives.forEach((pair) => {
            pair.forEach((id) => {
                if (touchingPrimitives.includes(id)) {
                    coordsForPrimitive[id][coordKey(int.coord)] = int;
                }
            });
        });
    });
    const prev =
        pending.parts.length === 0
            ? null
            : pending.parts.length === 1
            ? null
            : pending.parts[pending.parts.length - 2].to.coord;
    const seen: { [key: string]: true } = {};
    const res = ([] as Array<PendingSegment>)
        .concat(
            ...touchingPrimitives.map((id) => {
                // Each primitive should give me 2 segments. Right?
                return calcPendingSegments(
                    primitives[id],
                    next,
                    Object.keys(coordsForPrimitive[id]).map(
                        (k) => coordsForPrimitive[id][k],
                    ),
                );
            }),
        )
        .filter((p) => {
            if (prev && coordKey(p.to.coord) === coordKey(prev)) {
                return false;
            }
            const k = segmentKey(next.coord, p.segment);
            if (seen[k]) {
                return false;
            }
            return (seen[k] = true);
        });
    return res;
};

export const calcPendingSegments = (
    primitive: Primitive,
    coord: Intersect,
    allCoords: Array<Intersect>,
): Array<PendingSegment> => {
    if (primitive.type === 'line') {
        const sorted =
            primitive.m === Infinity
                ? allCoords.sort((a, b) => a.coord.y - b.coord.y)
                : allCoords.sort((a, b) => a.coord.x - b.coord.x);
        const idx = sorted.findIndex((c) => c === coord);
        if (idx === -1) {
            throw new Error(`coord not in allcoords?`);
        }
        const left = idx > 0 ? sorted[idx - 1] : null;
        const right = idx < sorted.length - 1 ? sorted[idx + 1] : null;
        return ([left, right].filter(Boolean) as Array<Intersect>).map(
            (to) => ({
                to,
                segment: {
                    type: 'Line',
                    to: to.coord,
                },
            }),
        );
    } else {
        const withTheta = allCoords.map((coord) => ({
            coord,
            theta: angleTo(primitive.center, coord.coord),
        }));
        withTheta.sort((a, b) => a.theta - b.theta);
        const idx = withTheta.findIndex((c) => c.coord === coord);
        if (idx === -1) {
            throw new Error(`coord not in allcoords?`);
        }
        const left =
            idx > 0 ? withTheta[idx - 1] : withTheta[withTheta.length - 1];
        const right =
            idx < withTheta.length - 1 ? withTheta[idx + 1] : withTheta[0];
        return [left, right].map((item, i) => ({
            to: item.coord,
            segment: {
                type: 'Arc',
                center: primitive.center,
                to: item.coord.coord,
                // what does this even mean, idk
                clockwise: i !== 0,
            },
        }));
    }
};

export const angleDiff = (one: number, two: number) => {
    const diff = one - two;
    if (diff < -Math.PI) {
        return diff + Math.PI * 2;
    }
    if (diff > Math.PI) {
        return diff - Math.PI * 2;
    }
    return diff;
};

// true if middle is between left and right, going from left to right around the circle {clockwise/or not}
// if middle is equal to left or right, also return true
export const isAngleBetween = (
    left: number,
    middle: number,
    right: number,
    clockwise: boolean,
) => {
    if (closeEnough(left, right)) {
        return true;
    }
    if (closeEnough(middle, right)) {
        return true;
    }
    const lm = angleBetween(left, middle, clockwise);
    const lr = angleBetween(left, right, clockwise);
    return lm <= lr;
};

// left & right are assumed to be between -PI and PI
// The result will always be positive, and between 0 and 2PI
export const angleBetween = (
    left: number,
    right: number,
    clockwise: boolean,
) => {
    if (!clockwise) {
        [left, right] = [right, left];
    }
    if (Math.abs(right - left) < epsilon) {
        return 0;
    }
    if (right >= left) {
        return right - left;
    }
    return right + Math.PI * 2 - left;
};
