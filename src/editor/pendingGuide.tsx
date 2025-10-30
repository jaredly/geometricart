import {Coord, GuideGeom} from '../types';

export const pendingGuide = (
    type: GuideGeom['type'],
    points: Array<Coord>,
    shiftKey: boolean,
    extent?: number,
    toggle?: boolean,
    angle?: number,
): GuideGeom => {
    switch (type) {
        case 'CircleMark':
            return {
                type,
                p1: points[0],
                p2: points[1],
                p3: points[2],
                angle: angle ?? 0,
            };
        case 'CloneCircle':
            return {
                type,
                p1: points[0],
                p2: points[1],
                p3: points[2],
            };
        case 'Split':
            return {
                type,
                p1: points[0],
                p2: points[1],
                count: extent ?? 2,
            };
        case 'Line':
            return {
                type,
                p1: points[0],
                p2: points[1],
                limit: shiftKey,
                extent,
            };
        case 'Polygon':
            return {
                type,
                p1: points[0],
                p2: points[1],
                sides: extent ?? 3,
                toCenter: !!toggle,
            };
        case 'Circle':
            return {
                type,
                center: points[0],
                radius: points[1],
                half: false,
                multiples: 0,
            };
        case 'InCircle':
        case 'CircumCircle':
        case 'AngleBisector':
            return {
                type,
                p1: points[0],
                p2: points[1],
                p3: points[2],
                // extent,
            };
        case 'PerpendicularBisector':
        case 'Perpendicular':
            return {
                type,
                p1: points[0],
                p2: points[1],
                // extent,
            };
    }
};
