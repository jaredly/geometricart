import { applyMatrices, Matrix } from './getMirrorTransforms';
import { Coord, Guide, GuideGeom, Id } from './types';

// These are NOT in /view/ coordinates!

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
                guides[k].mirror ? mirrorTransforms[guides[k].mirror!] : null,
            ),
        );

        // const g = guides[k];
        // if (g.mirror) {
        //     mirrorTransforms[g.mirror].forEach((matrices) => {
        //         elements.push({
        //             id: g.id,
        //             active: g.active,
        //             geom: transformGuideGeom(g.geom, (pos) =>
        //                 applyMatrices(pos, matrices),
        //             ),
        //             original: false,
        //         });
        //     });
        // }
        // elements.push({
        //     id: g.id,
        //     geom: g.geom,
        //     active: g.active,
        //     original: true,
        // });
    });
    console.log(elements);
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
        case 'Line':
        case 'PerpendicularBisector':
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
