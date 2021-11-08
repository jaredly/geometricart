import { angleTo } from './getMirrorTransforms';
import { Primitive } from './intersect';
import {
    Coord,
    Intersect,
    PendingPath,
    PendingSegment,
    Segment,
} from './types';

const dedup = (numbers: Array<number>) => {
    const seen: { [k: number]: true } = {};
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
    const coordsForPrimitive: { [key: number]: Array<Intersect> } = {};
    touchingPrimitives.forEach((id) => (coordsForPrimitive[id] = []));
    coords.forEach((int) => {
        int.primitives.forEach((pair) => {
            pair.forEach((id) => {
                if (touchingPrimitives.includes(id)) {
                    coordsForPrimitive[id].push(int);
                }
            });
        });
    });
    return ([] as Array<PendingSegment>).concat(
        ...touchingPrimitives.map((id) => {
            // Each primitive should give me 2 segments. Right?
            return calcPendingSegments(
                primitives[id],
                next,
                coordsForPrimitive[id],
            );
        }),
    );
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
