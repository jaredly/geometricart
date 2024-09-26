import * as React from 'react';
import { Angle, angleForSegment } from '../rendering/clipPath';
import { anglesEqual } from '../rendering/epsilonToZero';
import { angleTo, dist, push } from '../rendering/getMirrorTransforms';
import { Coord } from '../types';
import { SegmentWithPrev } from '../rendering/clipPathNew';
import { HitTransitions } from '../rendering/untangleHit';
import { angleBetween } from '../rendering/findNextSegments';

export const ShowHitIntersection = ({
    zoom,
    pair,
    coord,
    arrowSize = 10 / 100,
    segments,
}: {
    coord: Coord;
    zoom: number;
    arrowSize?: number;
    pair: HitTransitions;
    segments?: Array<SegmentWithPrev>;
}) => {
    const segsWithAngles = segments ? segmentAngles(segments, coord) : null;
    const size = arrowSize;
    switch (pair.type) {
        case 'ambiguous':
            return (
                <>
                    {segsWithAngles
                        ? midPoint(
                              segsWithAngles,
                              pair.inside.theta,
                              size * 1.2,
                              zoom,
                              'magenta',
                              true,
                          )
                        : point(
                              false,
                              coord,
                              zoom,
                              pair.inside.theta.theta,
                              size * 1.2,
                              'magenta',
                              true,
                          )}
                    {segsWithAngles
                        ? midPoint(
                              segsWithAngles,
                              pair.outside.theta,
                              size * 0.7,
                              zoom,
                              'teal',
                              false,
                          )
                        : point(
                              false,
                              coord,
                              zoom,
                              pair.outside.theta.theta,
                              size * 0.7,
                              'teal',
                              false,
                          )}
                </>
            );
        case 'cross':
            return (
                <>
                    {segsWithAngles
                        ? midPoint(
                              segsWithAngles,
                              pair.transitions[0].entry.theta,
                              size * 0.8,
                              zoom,
                              '#f00',
                              pair.transitions[0].goingInside,
                          )
                        : point(
                              true,
                              coord,
                              zoom,
                              pair.transitions[0].entry.theta.theta,
                              size * 0.8,
                              '#f00',
                              pair.transitions[0].goingInside,
                          )}
                    {segsWithAngles
                        ? midPoint(
                              segsWithAngles,
                              pair.transitions[0].exit.theta,
                              size * 0.9,
                              zoom,
                              '#f00',
                              pair.transitions[0].goingInside,
                          )
                        : point(
                              false,
                              coord,
                              zoom,
                              pair.transitions[0].exit.theta.theta,
                              size * 0.9,
                              '#f00',
                              pair.transitions[0].goingInside,
                          )}
                    {segsWithAngles
                        ? midPoint(
                              segsWithAngles,
                              pair.transitions[1].entry.theta,
                              size * 0.8,
                              zoom,
                              '#0f0',
                              pair.transitions[1].goingInside,
                          )
                        : point(
                              true,
                              coord,
                              zoom,
                              pair.transitions[1].entry.theta.theta,
                              size * 0.8,
                              '#0f0',
                              pair.transitions[1].goingInside,
                          )}
                    {segsWithAngles
                        ? midPoint(
                              segsWithAngles,
                              pair.transitions[1].exit.theta,
                              size,
                              zoom,
                              '#0f0',
                              pair.transitions[1].goingInside,
                          )
                        : point(
                              true,
                              coord,
                              zoom,
                              pair.transitions[1].exit.theta.theta,
                              size,
                              '#0f0',
                              pair.transitions[1].goingInside,
                          )}
                </>
            );
        case 'straight':
            return (
                <>
                    {point(
                        true,
                        coord,
                        zoom,
                        pair.transition.entry.theta.theta,
                        size * 0.8,
                        'orange',
                        null,
                    )}
                    {point(
                        false,
                        coord,
                        zoom,
                        pair.transition.exit.theta.theta,
                        size,
                        'orange',
                        null,
                    )}
                </>
            );
    }
};
const point = (
    back: boolean | 'mid',
    center: Coord,
    zoom: number,
    theta: number,
    size: number,
    color: string,
    inside: boolean | null,
) => {
    center =
        back === 'mid'
            ? push(center, theta, -size / 3)
            : back
            ? push(center, theta, -size)
            : center;
    const mid = push(center, theta, size / 2);
    return (
        <>
            <polygon
                fill={color}
                opacity={0.7}
                // stroke={outline ? 'magenta' : color}
                // strokeWidth={size / 10}
                points={[
                    push(center, theta + Math.PI / 2, size / 3),
                    push(center, theta + Math.PI / 2, -size / 3),
                    push(center, theta, size),
                ]
                    .map((p) => `${p.x * zoom},${p.y * zoom}`)
                    .join(' ')}
            />
            {inside != null ? (
                <circle
                    cx={mid.x * zoom}
                    cy={mid.y * zoom}
                    r={(size / 8) * zoom}
                    fill={inside ? 'black' : 'white'}
                />
            ) : null}
        </>
    );
};

export const segmentMindpoint = (segment: SegmentWithPrev) => {
    if (segment.segment.type === 'Line') {
        return {
            x: (segment.prev.x + segment.segment.to.x) / 2,
            y: (segment.prev.y + segment.segment.to.y) / 2,
        };
    } else if (segment.segment.type === 'Quad') {
        throw new Error('noa');
    } else {
        const t0 = angleTo(segment.segment.center, segment.prev);
        const t1 = angleTo(segment.segment.center, segment.segment.to);
        const diff = angleBetween(t0, t1, segment.segment.clockwise);
        return push(
            segment.segment.center,
            t0 + (diff / 2) * (segment.segment.clockwise ? 1 : -1),
            dist(segment.segment.center, segment.prev),
        );
    }
};

export const segmentAngles = (
    segments: Array<SegmentWithPrev>,
    coord: Coord,
) => {
    return segments.map((segment) => {
        // const first = coordsEqual(segment.prev, coord);
        const mid = segmentMindpoint(segment);
        return {
            segment,
            angle: angleForSegment(segment.prev, segment.segment, coord),
            // angle: segmentAngle(segment.prev, segment.segment, first),
            mid,
            atMid: angleForSegment(segment.prev, segment.segment, mid),
        };
    });
};

export const findSegmentMidpoint = (
    segments: Array<{
        segment: SegmentWithPrev;
        mid: Coord;
        angle: Angle;
        atMid: Angle;
    }>,
    angle: Angle,
) => {
    return segments?.find((s) => anglesEqual(s.angle, angle));
};

export const midPoint = (
    segsWithAngles: Array<{
        segment: SegmentWithPrev;
        atMid: Angle;
        angle: Angle;
        mid: Coord;
    }>,
    angle: Angle,
    size: number,
    zoom: number,
    color: string,
    inside: boolean | null,
) => {
    const found = findSegmentMidpoint(segsWithAngles, angle);
    if (!found) {
        return null;
    }
    return point(
        'mid',
        found.mid,
        zoom,
        found.atMid.theta,
        size,
        color,
        inside,
    );
};
