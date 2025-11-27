import {useState} from 'react';
import {calcPathD} from '../../../editor/calcPathD';
import {angleIsBetween, negPiToPi} from '../../../rendering/epsilonToZero';
import {angleTo, dist, push} from '../../../rendering/getMirrorTransforms';
import {angleBetween} from '../../../rendering/isAngleBetween';
import {ArcSegment, BarePath, Coord, Segment} from '../../../types';
import {pk} from '../../pk';
import {shapeD} from '../../shapeD';

export const WhatIsArc = () => {
    const [t1, setT1] = useState(0);
    const [t2, setT2] = useState(Math.PI / 2);

    const [clock, setClock] = useState(true);

    const p1 = push({x: 0, y: 0}, t1, 1);
    const p2 = push({x: 0, y: 0}, t2, 1);

    // const [p1, setP1] = useState({x: 0, y: -1});
    // const [p2, setP2] = useState({x: 1, y: 0});

    const qw = arcToQuad({x: 0, y: 0}, p1, p2);
    const pk1 = pk.Path.MakeFromCmds([
        pk.MOVE_VERB,
        p1.x,
        p1.y,
        pk.CONIC_VERB,
        qw.c.x,
        qw.c.y,
        p2.x,
        p2.y,
        qw.w,
    ])!;

    return (
        <div>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox={`-3 -3 6 6`}
                style={{background: 'black', width: 800, height: 800}}
            >
                <circle cx={p1.x} cy={p1.y} r={0.1} fill="white" />
                <circle cx={p2.x} cy={p2.y} r={0.1} fill="blue" />
                <path d={pk1.toSVGString()} stroke="red" strokeWidth={0.01} fill="none" />
            </svg>
            <div className="flex-col flex gap-4">
                <input
                    type="range"
                    min={-Math.PI * 2}
                    max={Math.PI * 2}
                    step={0.01}
                    className="range"
                    value={t1}
                    onChange={(evt) => setT1(+evt.target.value)}
                />
                <input
                    type="range"
                    className="range"
                    min={-Math.PI * 2}
                    max={Math.PI * 2}
                    step={0.01}
                    value={t2}
                    onChange={(evt) => setT2(+evt.target.value)}
                />
            </div>
            {/* <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={p1.x}
                onChange={(evt) => setP1({...p1, x: +evt.target.value})}
            />
            <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={p1.y}
                onChange={(evt) => setP1({...p1, y: +evt.target.value})}
            /> */}
        </div>
    );
};

const segToCmds = (segment: Segment, prev: Coord, pts: Coord[]): number[] => {
    if (segment.type === 'Arc') {
        // const r = dist(segment.to, segment.center);
        // const largeArc = isLargeArc(segment, prev) ? 1 : 0;
        // const sweep = segment.clockwise ? 1 : 0;
        // const conics = svgArcToSkiaConics(
        //     prev.x,
        //     prev.y,
        //     r,
        //     r,
        //     0,
        //     largeArc,
        //     sweep,
        //     segment.to.x,
        //     segment.to.y,
        // );
        // return conics.flatMap(({cx, cy, w, x, y}) => [pk.CONIC_VERB, cx, cy, w, x, y]);
        // const {c, w} = arcToQuad(segment.center, prev, segment.to);
        // return [pk.CONIC_VERB, c.x * 2, c.y * 2, segment.to.x * 2, segment.to.y * 2, w];
        // return [pk.LINE_VERB, c.x, c.y, pk.LINE_VERB, segment.to.x, segment.to.y];

        const segs = arcToSegs(prev, segment, Math.PI / 3);
        console.log('segs', segs);
        return segs.flatMap((seg, i) => {
            const p = i === 0 ? prev : segs[i - 1].to;
            const {c, w} = arcToQuad(segment.center, p, seg.to);
            // console.log('got a', c, w);
            // return [pk.CONIC_VERB, c.x, c.y, seg.to.x, seg.to.y, w];
            pts.push(seg.to);
            return [
                pk.CONIC_VERB,
                c.x * 2,
                c.y * 2,
                seg.to.x * 2,
                seg.to.y * 2,
                w,
                // pk.LINE_VERB,
                // c.x,
                // c.y,
                // pk.LINE_VERB,
                // seg.to.x * 5,
                // seg.to.y * 5,
            ];
            // return [pk.LINE_VERB, seg.to.x, seg.to.y];
            // return [pk.LINE_VERB, c.x, c.y, pk.LINE_VERB, seg.to.x, seg.to.y];
        });
    }
    return segment.type === 'Line'
        ? [pk.LINE_VERB, segment.to.x * 2, segment.to.y * 2]
        : [pk.QUAD_VERB, segment.control.x, segment.control.y, segment.to.x, segment.to.y];
};

const segmentsCmds = (origin: Coord, segments: Segment[], pts: Coord[]) => {
    return [
        pk.MOVE_VERB,
        origin.x * 2,
        origin.y * 2,
        ...segments.flatMap((seg, i) => segToCmds(seg, i === 0 ? origin : segments[i - 1].to, pts)),
    ];
};

const pkPathWithCmds = (origin: Coord, segments: Segment[], pts: Coord[]) => {
    const got = pk.Path.MakeFromCmds(segmentsCmds(origin, segments, pts));
    if (!got) throw new Error(`unable to construct path`);
    return got;
};

const arcToSegs = (prev: Coord, next: ArcSegment, diff = Math.PI / 5) => {
    const t0 = negPiToPi(angleTo(next.center, prev));
    const t1 = angleTo(next.center, next.to);
    const rad = dist(next.center, next.to);
    const btw = angleBetween(t0, t1, next.clockwise);
    // const diff = Math.PI / 5; // 5? 20? idk
    const count = btw / diff;
    const angles = [];
    for (let i = 1; i < count; i++) {
        const t = negPiToPi(t0 + i * (next.clockwise ? diff : -diff));
        const p = i === 1 ? t0 : angles[i - 2];
        if (next.clockwise ? angleIsBetween(Math.PI, [p, t]) : angleIsBetween(Math.PI, [t, p])) {
            angles.push(Math.PI);
        }
        // angles.push(Math.PI / 2);
        angles.push(t);
    }
    angles.push(t1);
    return angles.map((angle) => ({
        type: 'Arc',
        center: next.center,
        clockwise: next.clockwise,
        to: push(next.center, angle, rad),
    }));

    // for (let i = 1; i < count - 1; i++) {
    //     res.push({
    //         type: 'Arc',
    //         center: next.center,
    //         clockwise: next.clockwise,
    //         to: push(next.center, t0 + i * (next.clockwise ? diff : -diff), rad),
    //     });
    // }
    // res.push({type: 'Arc', center: next.center, clockwise: next.clockwise, to: next.to});
    // return res;
};

const arcToQuad = (center: Coord, p0: Coord, p2: Coord) => {
    const {x: cx, y: cy} = center;

    const angleStart = angleTo(center, p0);
    const angleEnd = angleTo(center, p2);
    const radius = dist(center, p0);
    const theta = angleEnd - angleStart; // signed sweep
    // For |theta| >= π you usually split the arc first (see helper below).

    const cos = Math.cos;
    const sin = Math.sin;

    // Mid-angle
    const alphaMid = 0.5 * (angleStart + angleEnd);
    const cosHalfTheta = cos(0.5 * theta);

    // Guard: avoid division by zero if theta ~ ±π
    if (Math.abs(cosHalfTheta) < 1e-8) {
        return {c: {x: 0, y: 0}, w: 1};
        // throw new Error(
        //     'arcToRationalBezier: |angleEnd - angleStart| is too close to π; split the arc into smaller pieces.',
        // );
    }

    // Middle control point lies on the angle bisector at radius / cos(θ/2)
    const p1 = {
        x: cx + (radius / cosHalfTheta) * cos(alphaMid),
        y: cy + (radius / cosHalfTheta) * sin(alphaMid),
    };

    return {c: p1, w: cosHalfTheta};
};
