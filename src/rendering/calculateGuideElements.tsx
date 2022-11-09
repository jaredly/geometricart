import {
    applyMatrices,
    getTransformsForNewMirror,
    Matrix,
    push,
} from './getMirrorTransforms';
import { Coord, Guide, GuideGeom, Id, Mirror } from '../types';
import { getCircumCircle } from './points';

// These are NOT in /view/ coordinates!

export const calculateInactiveGuideElements = (
    guides: { [key: Id]: Guide },
    mirrorTransforms: { [key: Id]: Array<Array<Matrix>> },
) => {
    const elements: Array<GuideElement> = [];
    Object.keys(guides).forEach((k) => {
        if (guides[k].active) {
            return;
        }
        elements.push(
            ...geomsForGiude(
                guides[k],
                typeof guides[k].mirror === 'string'
                    ? mirrorTransforms[guides[k].mirror as string]
                    : guides[k].mirror
                    ? getTransformsForNewMirror(guides[k].mirror as Mirror)
                    : null,
            ),
        );
    });
    return elements;
};

export const geomPoints = (geom: GuideGeom): Array<Coord> => {
    switch (geom.type) {
        case 'Split': {
            const points = [];
            const dx = geom.p2.x - geom.p1.x;
            const dy = geom.p2.y - geom.p1.y;
            const count = Math.max(2, geom.count);
            const bx = dx / count;
            const by = dy / count;
            for (let i = 1; i < count; i++) {
                points.push({ x: geom.p1.x + bx * i, y: geom.p1.y + by * i });
            }
            return points;
        }
        case 'CircumCircle': {
            const got = getCircumCircle(geom.p1, geom.p2, geom.p3);
            if (!got) {
                return [];
            }
            return [got.center];
        }
    }
    return [];
};

export const calculateGuideElements = (
    guides: { [key: Id]: Guide },
    mirrorTransforms: { [key: Id]: Array<Array<Matrix>> },
) => {
    const elements: Array<GuideElement> = [];
    Object.keys(guides).forEach((k) => {
        if (!guides[k].active) {
            return;
        }
        elements.push(
            ...geomsForGiude(
                guides[k],
                typeof guides[k].mirror === 'string'
                    ? mirrorTransforms[guides[k].mirror as string]
                    : guides[k].mirror
                    ? getTransformsForNewMirror(guides[k].mirror as Mirror)
                    : null,
            ),
        );
    });
    return elements;
};

export type GuideElement = {
    id: Id;
    geom: GuideGeom;
    active: boolean;
    original: boolean;
};

export const transformGuideGeom = (
    geom: GuideGeom,
    transform: (pos: Coord) => Coord,
): GuideGeom => {
    switch (geom.type) {
        case 'InCircle':
        case 'AngleBisector':
        case 'CircumCircle':
            return {
                ...geom,
                p1: transform(geom.p1),
                p2: transform(geom.p2),
                p3: transform(geom.p3),
            };
        case 'Split':
        case 'Line':
        case 'PerpendicularBisector':
        case 'Perpendicular':
            return { ...geom, p1: transform(geom.p1), p2: transform(geom.p2) };
        case 'Circle':
            return {
                ...geom,
                center: transform(geom.center),
                radius: transform(geom.radius),
            };
    }
};

export const geomsForGiude = (
    guide: Guide,
    mirror: Array<Array<Matrix>> | null,
) => {
    const elements: Array<GuideElement> = [];

    if (mirror) {
        mirror.forEach((matrices) => {
            elements.push({
                id: guide.id,
                active: guide.active,
                geom: transformGuideGeom(guide.geom, (pos) =>
                    applyMatrices(pos, matrices),
                ),
                original: false,
            });
        });
    }
    elements.push({
        id: guide.id,
        geom: guide.geom,
        active: guide.active,
        original: true,
    });

    return elements;
};
