import { Primitive } from './intersect';
import { calculateIntersections } from './points';
import { Coord, Intersect } from '../types';
import { coordKey } from './coordKey';

export const calcAllIntersections = (
    primitives: Array<Primitive>,
    points?: Array<Coord>,
): { coords: Array<Intersect>; seenCoords: { [key: string]: Intersect } } => {
    const seenCoords: { [k: string]: Intersect } = {};
    const coords: Array<Intersect> = [
        { coord: { x: 0, y: 0 }, primitives: [] },
        { coord: { x: 0, y: -1 }, primitives: [] },
    ];
    coords.forEach((c) => (seenCoords[coordKey(c.coord)] = c));
    for (let i = 0; i < primitives.length; i++) {
        for (let j = i + 1; j < primitives.length; j++) {
            const current = primitives[i];
            if (current.type === 'circle') {
                const k = coordKey(current.center);
                if (!seenCoords[k]) {
                    seenCoords[k] = {
                        coord: current.center,
                        primitives: [],
                    };
                    coords.push(seenCoords[k]);
                }
            }
            const pair: [number, number] = [i, j];
            coords.push(
                ...(calculateIntersections(primitives[i], primitives[j])
                    .map((coord) => {
                        const k = coordKey(coord);
                        if (seenCoords[k]) {
                            seenCoords[k].primitives.push(pair);
                            return null;
                        }
                        return (seenCoords[k] = { coord, primitives: [pair] });
                    })
                    .filter(Boolean) as Array<Intersect>),
            );
        }
    }
    points?.forEach((coord) => {
        const k = coordKey(coord);
        if (!seenCoords[k]) {
            seenCoords[k] = {
                coord,
                primitives: [],
            };
            coords.push(seenCoords[k]);
        }
    });
    return { coords, seenCoords };
};
