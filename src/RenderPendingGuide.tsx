/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import { transformGuideGeom } from './calculateGuideElements';
import { applyMatrices, Matrix } from './getMirrorTransforms';
import { GuideElement } from './GuideElement';
import { Coord, GuideGeom, PendingGuide } from './types';

export const RenderPendingGuide = ({
    guide,
    pos,
    zoom,
    shiftKey,
    mirror,
}: {
    pos: Coord;
    guide: PendingGuide;
    zoom: number;
    shiftKey: boolean;
    mirror: null | Array<Array<Matrix>>;
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
            {mirror
                ? mirror.map((transform) => (
                      <GuideElement
                          zoom={zoom}
                          original={false}
                          geom={transformGuideGeom(
                              pendingGuide(
                                  guide.kind,
                                  points,
                                  shiftKey,
                                  guide.extent,
                              ),
                              (pos) => applyMatrices(pos, transform),
                          )}
                      />
                  ))
                : null}
            <GuideElement
                zoom={zoom}
                original={true}
                geom={pendingGuide(guide.kind, points, shiftKey, guide.extent)}
            />
        </g>
    );
};

export const pendingGuide = (
    type: GuideGeom['type'],
    points: Array<Coord>,
    shiftKey: boolean,
    extent?: number,
): GuideGeom => {
    switch (type) {
        case 'Line':
            return {
                type,
                p1: points[0],
                p2: points[1],
                limit: shiftKey,
                extent,
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
                extent,
            };
        case 'PerpendicularBisector':
        case 'Perpendicular':
            return {
                type,
                p1: points[0],
                p2: points[1],
                extent,
            };
    }
};
