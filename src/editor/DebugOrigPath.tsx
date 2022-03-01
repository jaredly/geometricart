import * as React from 'react';
import {
    Angle,
    angleForSegment,
    anglesEqual,
    insidePath,
} from '../rendering/clipPath';
import { windingNumber } from '../rendering/windingNumber';
import { findInsidePoint, findRegions } from '../rendering/findInternalRegions';
import { segmentsToNonIntersectingSegments } from '../rendering/segmentsToNonIntersectingSegments';
import { angleTo, dist, push } from '../rendering/getMirrorTransforms';
import { insetSegmentsBeta } from '../rendering/insetPath';
import { simplifyPath } from '../rendering/simplifyPath';
import { Primitive } from '../rendering/intersect';
import { isClockwise } from '../rendering/pathToPoints';
import { Coord, Path, Segment } from '../types';
import { pathToPrimitives } from './findSelection';
import { RenderSegmentBasic } from './RenderSegment';
import { calcPathD, pathSegs, segmentArrow } from './RenderPath';
import {
    addPrevsToSegments,
    getSomeHits,
    SegmentWithPrev,
} from '../rendering/clipPathNew';
import { HitTransitions } from '../rendering/untangleHit';
import { coordsEqual, segmentsEqual } from '../rendering/pathsAreIdentical';
import { angleBetween } from '../rendering/findNextSegments';
import { segmentAngle } from '../rendering/segmentAngle';

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
                              pair.transitions[0].exit.theta.theta, // + Math.PI,
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
                              pair.transitions[1].exit.theta.theta, // + Math.PI,
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
                        pair.transition.exit.theta.theta, // + Math.PI,
                        size,
                        'orange',
                        null,
                    )}
                </>
            );
    }
};

export const DebugOrigPath = ({
    origPath,
    zoom,
    clip,
    path,
}: {
    origPath: Path;
    path: Path;
    zoom: number;
    clip?: { prims: Array<Primitive>; segments: Array<Segment> } | null;
}) => {
    let inset: number | null = null;
    if (
        path.style.lines.length &&
        origPath.style.lines[path.style.lines[0]?.originalIdx!]?.inset
    ) {
        inset =
            origPath.style.lines[path.style.lines[0]!.originalIdx!]?.inset ??
            null;
    } else if (path.style.fills.length && path.style.fills[0]) {
        inset =
            origPath.style.fills[path.style.fills[0]!.originalIdx!]?.inset ??
            null;
    }
    let insetEls = null;
    if (inset != null) {
        const insetSegments = insetSegmentsBeta(origPath.segments, inset / 100);
        const primitives = pathToPrimitives(insetSegments);
        const parts = segmentsToNonIntersectingSegments(insetSegments);
        const regions = findRegions(parts.result, parts.froms); //.filter(isClockwise);
        console.log(parts);
        const colors = ['#0f0', '#00f', '#ff0', '#f0f', '#0ff', '#aaa', '#555'];
        let mode = 0;
        if (mode === 0) {
            insetEls = (
                <>
                    <path
                        d={calcPathD(origPath, zoom)}
                        fill="none"
                        stroke="white"
                        strokeWidth={1}
                    />
                    <path
                        d={calcPathD(pathSegs(insetSegments), zoom)}
                        fill="none"
                        stroke="red"
                        strokeWidth={1}
                    />
                    {parts.result.map((part, i) => (
                        <RenderSegmentBasic
                            zoom={zoom}
                            segment={part.segment}
                            prev={part.prev}
                            key={i}
                            inner={{
                                stroke: 'red',
                                strokeDasharray: '5 5',
                            }}
                        />
                    ))}
                    {/* {regions.map((region, i) => (
                        <path
                            d={calcPathD(pathSegs(region), zoom)}
                            fill={colors[i % colors.length]}
                            key={i}
                            stroke="white"
                            strokeWidth={1}
                        />
                    ))} */}
                    {parts.result.map((part, i) =>
                        segmentArrow(
                            part.prev,
                            i,
                            part.segment,
                            zoom,
                            Math.max(5, Math.min(10, (1 / 100) * zoom)),
                        ),
                    )}
                    {regions.map((region, ri) => {
                        return region.map((seg, i) => {
                            const prev =
                                region[i === 0 ? region.length - 1 : i - 1].to;
                            const next = region[(i + 1) % region.length];
                            const res = findInsidePoint(
                                prev,
                                seg,
                                next,
                                25 / zoom,
                            );
                            if (!res) {
                                return;
                            }
                            let [t0, t1, pos, p0] = res;

                            const wind = windingNumber(
                                pos,
                                primitives,
                                insetSegments,
                                false,
                            );
                            const wcount = wind.reduce(
                                (c, w) => (w.up ? 1 : -1) + c,
                                0,
                            );
                            const scalePos = (p: Coord) => ({
                                x: p.x * zoom,
                                y: p.y * zoom,
                            });

                            pos = scalePos(pos);
                            p0 = scalePos(p0);
                            const pa = push(p0, t0, 35);
                            const pb = push(p0, t1, 30);

                            return (
                                <g key={`${ri}-${i}`}>
                                    <line
                                        x1={p0.x}
                                        y1={p0.y}
                                        x2={pa.x}
                                        y2={pa.y}
                                        stroke="white"
                                        strokeWidth={3}
                                    />
                                    <line
                                        x1={p0.x}
                                        y1={p0.y}
                                        x2={pb.x}
                                        y2={pb.y}
                                        stroke="black"
                                        strokeWidth={3}
                                    />
                                    <line
                                        x1={p0.x}
                                        y1={p0.y}
                                        x2={pos.x}
                                        y2={pos.y}
                                        stroke={wcount === 0 ? 'red' : '#af0'}
                                        strokeWidth={3}
                                    />
                                </g>
                            );
                        });
                    })}
                </>
            );
        } else {
            insetEls = (
                <>
                    <path
                        d={calcPathD(origPath, zoom)}
                        fill="none"
                        stroke="white"
                        strokeWidth={1}
                    />
                    <path
                        d={calcPathD(pathSegs(insetSegments), zoom)}
                        fill="none"
                        stroke="yellow"
                        strokeWidth={3}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                            console.log(
                                insetSegments,
                                origPath.segments,
                                inset,
                            );
                            console.log(regions.filter(isClockwise));
                        }}
                    />
                    {insetSegments.map((seg, i) =>
                        segmentArrow(
                            insetSegments[
                                i === 0 ? insetSegments.length - 1 : i - 1
                            ].to,
                            i,
                            seg,
                            zoom,
                            10,
                        ),
                    )}
                    {regions.map((region, ri) => {
                        return region.map((seg, i) => {
                            const prev =
                                region[i === 0 ? region.length - 1 : i - 1].to;
                            const next = region[(i + 1) % region.length];
                            const res = findInsidePoint(
                                prev,
                                seg,
                                next,
                                25 / zoom,
                            );
                            if (!res) {
                                return;
                            }
                            let [t0, t1, pos, p0] = res;

                            const wind = windingNumber(
                                pos,
                                primitives,
                                insetSegments,
                                false,
                            );
                            const wcount = wind.reduce(
                                (c, w) => (w.up ? 1 : -1) + c,
                                0,
                            );
                            const scalePos = (p: Coord) => ({
                                x: p.x * zoom,
                                y: p.y * zoom,
                            });

                            pos = scalePos(pos);
                            p0 = scalePos(p0);
                            const pa = push(p0, t0, 35);
                            const pb = push(p0, t1, 30);

                            return (
                                <g key={`${ri}-${i}`}>
                                    <line
                                        x1={p0.x}
                                        y1={p0.y}
                                        x2={pa.x}
                                        y2={pa.y}
                                        stroke="white"
                                        strokeWidth={3}
                                    />
                                    <line
                                        x1={p0.x}
                                        y1={p0.y}
                                        x2={pb.x}
                                        y2={pb.y}
                                        stroke="black"
                                        strokeWidth={3}
                                    />
                                    <line
                                        x1={p0.x}
                                        y1={p0.y}
                                        x2={pos.x}
                                        y2={pos.y}
                                        stroke={wcount === 0 ? 'red' : '#af0'}
                                        strokeWidth={3}
                                    />
                                </g>
                            );
                        });
                    })}
                    {regions.map((region, i) => (
                        <path
                            key={i}
                            d={calcPathD(pathSegs(region), zoom)}
                            strokeDasharray={'10 10'}
                            fill="none"
                            stroke="purple"
                            strokeWidth={4}
                        />
                    ))}
                </>
            );
        }
    }
    let clipEls = null;
    if (clip != null) {
        const hitsResults = getSomeHits(
            addPrevsToSegments(origPath.segments, 0).concat(
                addPrevsToSegments(simplifyPath(clip.segments), 1),
            ),
        );
        if (hitsResults) {
            const { hits, hitPairs } = hitsResults;
            clipEls = (
                <>
                    {Object.keys(hits).map((k) => {
                        const coord = hits[k].coord;
                        const type = hitPairs[k].type;
                        const colors = {
                            straight: 'red',
                            cross: 'green',
                            ambiguous: 'magenta',
                        };
                        return (
                            <React.Fragment key={k}>
                                <circle
                                    cx={coord.x * zoom}
                                    cy={coord.y * zoom}
                                    r={5}
                                    fill={colors[type]}
                                />
                                <ShowHitIntersection
                                    coord={coord}
                                    pair={hitPairs[k]}
                                    zoom={zoom}
                                />
                            </React.Fragment>
                        );
                    })}
                </>
            );
        }
    }
    return (
        <>
            {origPath.segments.map((seg, i) => (
                <circle
                    key={i}
                    cx={seg.to.x * zoom}
                    cy={seg.to.y * zoom}
                    r={10}
                    stroke={
                        clip && !insidePath(seg.to, clip.prims, clip.segments)
                            ? 'yellow'
                            : i === 0
                            ? 'red'
                            : 'blue'
                    }
                    strokeWidth={(1 / 100) * zoom}
                    fill={'none'}
                />
            ))}
            {false &&
                path.segments.map((seg, i) => (
                    <circle
                        key={i}
                        cx={seg.to.x * zoom}
                        cy={seg.to.y * zoom}
                        r={Math.min(10, (1 / 100) * zoom)}
                        fill={i === 0 ? 'red' : 'blue'}
                    />
                ))}

            {false && (
                <circle
                    cx={origPath.origin.x * zoom}
                    cy={origPath.origin.y * zoom}
                    r={10}
                    fill={'none'}
                    stroke={'green'}
                    strokeWidth={(1 / 100) * zoom}
                />
            )}
            {false && (
                <circle
                    cx={path.origin.x * zoom}
                    cy={path.origin.y * zoom}
                    r={10}
                    fill={'green'}
                />
            )}
            {false &&
                path.segments.map((seg, i) => (
                    <circle
                        key={`circle-${i}`}
                        cx={seg.to.x * zoom}
                        cy={seg.to.y * zoom}
                        r={Math.min(20, (2 / 100) * zoom)}
                        //   r={20}
                        fill="orange"
                    />
                ))}
            {insetEls}
            {clipEls}
        </>
    );
};
