import {angleTo, dist, push, scale} from '../rendering/getMirrorTransforms';
import {GuideGeom} from '../types';
import {lineToSlope} from '../rendering/intersect';
import {calcPolygon, getCircumCircle, getInCircle} from '../rendering/points';
import {Bounds} from './Bounds';
import {visibleEndPoints} from './visibleEndPoints';

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
        case 'Polygon': {
            const {center, points} = calcPolygon(geom.p1, geom.p2, geom.sides, geom.toCenter);
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
                    {[center, ...points].map((pos, i) => (
                        <circle
                            key={i}
                            cx={pos.x * zoom}
                            cy={pos.y * zoom}
                            r={0.01 * zoom}
                            fill="none"
                            stroke="#fff"
                            strokeWidth={1}
                        />
                    ))}
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
        case 'Split': {
            const dx = geom.p2.x - geom.p1.x;
            const dy = geom.p2.y - geom.p1.y;
            const circles = [];
            const count = Math.max(2, geom.count);
            const bx = dx / count;
            const by = dy / count;
            const theta = angleTo(geom.p1, geom.p2);
            for (let i = 1; i < count; i++) {
                const mid = {x: geom.p1.x + bx * i, y: geom.p1.y + by * i};
                const p1 = push(mid, theta + Math.PI / 2, 10 / zoom);
                const p2 = push(mid, theta - Math.PI / 2, 10 / zoom);
                circles.push(
                    <line
                        key={i}
                        stroke={original ? '#ff0' : 'rgba(255,255,0,0.1)'}
                        strokeWidth={1}
                        x1={p1.x * zoom}
                        y1={p1.y * zoom}
                        x2={p2.x * zoom}
                        y2={p2.y * zoom}
                    />,
                );
            }
            return (
                <>
                    <line
                        x1={geom.p1.x * zoom}
                        y1={geom.p1.y * zoom}
                        x2={geom.p2.x * zoom}
                        y2={geom.p2.y * zoom}
                        stroke={original ? '#ff0' : 'rgba(255,255,0,0.1)'}
                        strokeWidth={1}
                    />
                    {circles}
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
            const extent = geom.extent ? (geom.extent * d) / 2 : geom.limit ? d * 0.5 : null;
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
        case 'CloneCircle': {
            const r = dist(geom.p1, geom.p2);
            return (
                <circle
                    cx={geom.p3.x * zoom}
                    cy={geom.p3.y * zoom}
                    r={r * zoom}
                    strokeDasharray="5 5"
                    fill="none"
                    stroke="#666"
                    strokeWidth={1}
                />
            );
        }
        case 'CircleMark': {
            const r = dist(geom.p1, geom.p2);
            const td = Math.PI / 30;
            const start = push(geom.p3, geom.angle - td, r);
            const end = push(geom.p3, geom.angle + td, r);
            const largeArcFlag = 0;
            const sweepFlag = 1;
            const d = `M${start.x * zoom},${start.y * zoom} A${r * zoom},${
                r * zoom
            } 0 ${largeArcFlag},${sweepFlag} ${end.x * zoom},${end.y * zoom}`;

            return <path fill="none" stroke="#666" strokeWidth={1} d={d} />;
        }
        case 'Circle': {
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
            return (
                <>
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
                </>
            );
        }
    }
};
