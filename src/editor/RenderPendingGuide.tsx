import {transformGuideGeom} from '../rendering/calculateGuideElements';
import {angleTo, applyMatrices, Matrix} from '../rendering/getMirrorTransforms';
import {GuideElement} from './GuideElement';
import {Bounds} from './Bounds';
import {Coord, GuideGeom, guideNeedsAngle, guidePoints, PendingGuide} from '../types';
import {pendingGuide} from './pendingGuide';

export const RenderPendingGuide = ({
    guide,
    pos,
    zoom,
    bounds,
    shiftKey,
    mirror,
}: {
    pos: Coord;
    guide: PendingGuide;
    bounds: Bounds;
    zoom: number;
    shiftKey: boolean;
    mirror: null | Array<Array<Matrix>>;
}) => {
    let offsets = [
        {x: -1, y: 1},
        {x: 2, y: 1},
    ];

    const points = guide.points.concat([pos]);
    offsets.slice(guide.points.length).forEach((off) => {
        points.push({x: pos.x + off.x, y: pos.y + off.y});
    });
    const angle =
        guideNeedsAngle(guide.kind) && guide.points.length >= guidePoints[guide.kind]
            ? angleTo(guide.points[guide.points.length - 1], pos)
            : undefined;

    return (
        <g style={{pointerEvents: 'none'}}>
            {mirror
                ? mirror.map((transform, i) => (
                      <GuideElement
                          key={i}
                          zoom={zoom}
                          bounds={bounds}
                          original={false}
                          geom={transformGuideGeom(
                              pendingGuide(
                                  guide.kind,
                                  points,
                                  shiftKey,
                                  guide.extent,
                                  guide.toggle,
                                  angle,
                              ),
                              (pos) => applyMatrices(pos, transform),
                          )}
                      />
                  ))
                : null}
            <GuideElement
                zoom={zoom}
                bounds={bounds}
                original={true}
                geom={pendingGuide(guide.kind, points, shiftKey, guide.extent, guide.toggle, angle)}
            />
            {/* <circle
                cx={pos.x * zoom}
                cy={pos.y * zoom}
                r={10}
                fill="white"
                opacity={0.5}
                stroke={'red'}
                strokeWidth={2}
            /> */}
            <line
                x1={pos.x * zoom}
                x2={pos.x * zoom}
                y1={pos.y * zoom - 10}
                y2={pos.y * zoom + 10}
                stroke="red"
                strokeWidth={1}
            />
            <line
                x1={pos.x * zoom - 10}
                x2={pos.x * zoom + 10}
                y1={pos.y * zoom}
                y2={pos.y * zoom}
                stroke="red"
                strokeWidth={1}
            />
        </g>
    );
};

