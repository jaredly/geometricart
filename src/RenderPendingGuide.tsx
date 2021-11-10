/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import { GuideElement } from './GuideElement';
import { Coord, GuideGeom, PendingGuide } from './types';

export const RenderPendingGuide = ({
    guide,
    pos,
    zoom,
    shiftKey,
}: {
    pos: Coord;
    guide: PendingGuide;
    zoom: number;
    shiftKey: boolean;
}) => {
    let offsets = [
        { x: -1, y: 1 },
        { x: 2, y: 1 },
    ];

    const points = guide.points.concat([pos]);
    offsets.slice(guide.points.length).forEach((off) => {
        points.push({ x: pos.x + off.x, y: pos.y + off.y });
    });

    // const prims = geomToPrimitives(pendingGuide(guide.kind, points, shiftKey));
    return (
        <g style={{ pointerEvents: 'none' }}>
            <GuideElement
                zoom={zoom}
                original={true}
                geom={pendingGuide(guide.kind, points, shiftKey)}
            />
        </g>
    );
};

export const pendingGuide = (
    type: GuideGeom['type'],
    points: Array<Coord>,
    shiftKey: boolean,
): GuideGeom => {
    switch (type) {
        case 'Line':
            return {
                type,
                p1: points[0],
                p2: points[1],
                limit: shiftKey,
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
            };
        case 'PerpendicularBisector':
            return {
                type,
                p1: points[0],
                p2: points[1],
            };
    }
};
