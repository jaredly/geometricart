/* @jsx jsx */
/* @jsxFrag React.Fragment */
import * as React from 'react';
import { jsx } from '@emotion/react';
import { angleTo, dist, push, scale } from '../rendering/getMirrorTransforms';
import { GuideGeom } from '../types';
import { lineLine, lineToSlope, SlopeIntercept } from '../rendering/intersect';
import { getCircumCircle, getInCircle } from '../rendering/points';

export type Bounds = { x0: number; y0: number; x1: number; y1: number };

export const visibleEndPoints = (si: SlopeIntercept, bounds: Bounds) => {
    if (si.m === Infinity) {
        return [
            { x: si.b, y: bounds.y0 },
            { x: si.b, y: bounds.y1 },
        ];
    }
    return [
        { x: bounds.x0, y: bounds.x0 * si.m + si.b },
        { x: bounds.x1, y: bounds.x1 * si.m + si.b },
    ];
};

export const GuideElement = ({
    geom,
    zoom,
    original,
    bounds,
}: {
    geom: GuideGeom;
    zoom: number;
    bounds: Bounds;
    original: boolean;
}) => {
    switch (geom.type) {
        case 'CircumCircle': {
            const got = getCircumCircle(geom.p1, geom.p2, geom.p3);
            if (!got) {
                return null;
            }

            return (
                <>
                    <circle
                        cx={got.center.x * zoom}
                        cy={got.center.y * zoom}
                        r={got.r * zoom}
                        fill="none"
                        stroke={original ? '#fff' : '#888'}
                        strokeWidth={1}
                    />
                    {original ? (
                        <>
                            <line
                                x1={geom.p1.x * zoom}
                                y1={geom.p1.y * zoom}
                                x2={geom.p2.x * zoom}
                                y2={geom.p2.y * zoom}
                                stroke="#fff"
                                strokeWidth={1}
                            />
                            <line
                                x1={geom.p2.x * zoom}
                                y1={geom.p2.y * zoom}
                                x2={geom.p3.x * zoom}
                                y2={geom.p3.y * zoom}
                                stroke="#fff"
                                strokeWidth={1}
                            />
                            <line
                                x1={geom.p1.x * zoom}
                                y1={geom.p1.y * zoom}
                                x2={geom.p3.x * zoom}
                                y2={geom.p3.y * zoom}
                                stroke="#fff"
                                strokeWidth={1}
                            />
                            <circle
                                cx={got.m1.x * zoom}
                                cy={got.m1.y * zoom}
                                r={10}
                                fill="none"
                                stroke="#fff"
                                strokeWidth={1}
                            />
                            <circle
                                cx={got.m2.x * zoom}
                                cy={got.m2.y * zoom}
                                r={10}
                                fill="none"
                                stroke="#fff"
                                strokeWidth={1}
                            />
                        </>
                    ) : null}
                </>
            );
        }
        case 'InCircle': {
            const got = getInCircle(geom.p1, geom.p2, geom.p3);
            if (!got) {
                return null;
            }

            return (
                <>
                    <line
                        x1={geom.p1.x * zoom}
                        y1={geom.p1.y * zoom}
                        x2={geom.p2.x * zoom}
                        y2={geom.p2.y * zoom}
                        stroke="#fff"
                        strokeWidth={1}
                    />
                    <line
                        x1={geom.p2.x * zoom}
                        y1={geom.p2.y * zoom}
                        x2={geom.p3.x * zoom}
                        y2={geom.p3.y * zoom}
                        stroke="#fff"
                        strokeWidth={1}
                    />
                    <line
                        x1={geom.p1.x * zoom}
                        y1={geom.p1.y * zoom}
                        x2={geom.p3.x * zoom}
                        y2={geom.p3.y * zoom}
                        stroke="#fff"
                        strokeWidth={1}
                    />
                    <circle
                        cx={got.center.x * zoom}
                        cy={got.center.y * zoom}
                        r={got.r * zoom}
                        fill="none"
                        stroke="#fff"
                        strokeWidth={1}
                    />
                </>
            );
        }
        case 'Line': {
            const t1 = angleTo(geom.p1, geom.p2);
            const d = dist(geom.p1, geom.p2);
            const mid = {
                x: (geom.p1.x + geom.p2.x) / 2,
                y: (geom.p1.y + geom.p2.y) / 2,
            };
            const extent = geom.extent
                ? (geom.extent * d) / 2
                : geom.limit
                ? d * 0.5
                : null;
            const left = scale(push(mid, t1, -(extent ?? 10)), zoom);
            const right = scale(push(mid, t1, extent ?? 10), zoom);
            return (
                <>
                    <line
                        x1={left.x}
                        y1={left.y}
                        x2={right.x}
                        y2={right.y}
                        stroke={original ? '#ff0' : 'rgba(255,255,0,0.1)'}
                        strokeWidth={1}
                    />
                </>
            );
        }
        case 'Perpendicular': {
            const t1 = angleTo(geom.p1, geom.p2) + Math.PI / 2;
            const si = lineToSlope(geom.p1, push(geom.p1, t1, 2));
            const [left, right] = visibleEndPoints(si, bounds);
            return (
                <>
                    <line
                        x1={left.x * zoom}
                        y1={left.y * zoom}
                        x2={right.x * zoom}
                        y2={right.y * zoom}
                        stroke={original ? '#ff0' : '#880'}
                        strokeWidth={1}
                    />
                </>
            );
        }
        case 'PerpendicularBisector': {
            const t1 = angleTo(geom.p1, geom.p2);
            const d = dist(geom.p1, geom.p2);
            const mid = push(geom.p1, t1, d / 2);
            const left = push(mid, t1 + Math.PI / 2, 10);
            const right = push(mid, t1 + Math.PI / 2, -10);
            return (
                <>
                    <line
                        x1={left.x * zoom}
                        y1={left.y * zoom}
                        x2={right.x * zoom}
                        y2={right.y * zoom}
                        stroke={original ? '#ff0' : '#880'}
                        strokeWidth={1}
                    />
                    <line
                        x1={geom.p1.x * zoom}
                        y1={geom.p1.y * zoom}
                        x2={geom.p2.x * zoom}
                        y2={geom.p2.y * zoom}
                        strokeDasharray="5 5"
                        stroke="#666"
                        strokeWidth={1}
                    />
                </>
            );
        }
        case 'AngleBisector': {
            const t1 = angleTo(geom.p2, geom.p1);
            const t2 = angleTo(geom.p2, geom.p3);
            const left = push(geom.p2, (t1 + t2) / 2, 10);
            const right = push(geom.p2, (t1 + t2) / 2, -10);
            return (
                <>
                    <line
                        x1={geom.p1.x * zoom}
                        y1={geom.p1.y * zoom}
                        x2={geom.p2.x * zoom}
                        y2={geom.p2.y * zoom}
                        stroke="#666"
                        strokeDasharray="5 5"
                        strokeWidth={1}
                    />
                    <line
                        x1={geom.p3.x * zoom}
                        y1={geom.p3.y * zoom}
                        x2={geom.p2.x * zoom}
                        y2={geom.p2.y * zoom}
                        stroke="#666"
                        strokeDasharray="5 5"
                        strokeWidth={1}
                    />
                    <line
                        x1={left.x * zoom}
                        y1={left.y * zoom}
                        x2={right.x * zoom}
                        y2={right.y * zoom}
                        stroke={original ? '#ff0' : '#880'}
                        strokeWidth={1}
                    />
                </>
            );
        }
        case 'Circle':
            const r = dist(geom.radius, geom.center);
            const m = [];
            for (let i = 1; i <= geom.multiples + 1; i++) {
                m.push(
                    <circle
                        key={i}
                        cx={geom.center.x * zoom}
                        cy={geom.center.y * zoom}
                        r={r * i * zoom}
                        fill="none"
                        strokeDasharray={i === 1 ? '' : '5 5'}
                        // stroke="#666"
                        stroke={original ? '#ff0' : '#666'}
                        strokeWidth={1}
                    />,
                );
            }
            const a = angleTo(geom.center, geom.radius);
            const p1 = push(scale(geom.center, zoom), a, 2000);
            const p2 = push(scale(geom.center, zoom), a, -2000);
            return (
                <>
                    {/* <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke="green"
                        strokeWidth={0.5}
                    /> */}
                    {m}
                    {geom.half ? (
                        <circle
                            cx={geom.center.x * zoom}
                            cy={geom.center.y * zoom}
                            r={r * 0.5 * zoom}
                            strokeDasharray="5 5"
                            fill="none"
                            stroke="#666"
                            strokeWidth={1}
                        />
                    ) : null}
                    {/* {original ? (
                        <circle
                            cx={geom.center.x * zoom}
                            cy={geom.center.y * zoom}
                            r={5}
                            fill="white"
                        />
                    ) : null}
                    {original ? (
                        <circle
                            cx={geom.radius.x * zoom}
                            cy={geom.radius.y * zoom}
                            r={5}
                            fill="white"
                        />
                    ) : null} */}
                </>
            );
    }
};
