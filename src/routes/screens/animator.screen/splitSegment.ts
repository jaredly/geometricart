import {ArcSegment, Coord, Segment} from '../../../types';

export const pointOnPath = (prev: Coord, segment: Segment, t: number): Coord => {
    switch (segment.type) {
        case 'Line':
            return lerpPt(prev, segment.to, t);
        case 'Arc': {
            const info = arcParamInfo(segment.center, prev, segment.to, segment.clockwise);
            return pointOnArc(prev, info, t);
        }
        case 'Quad':
            return evalQuad(prev, segment.control, segment.to, t);
    }
};

/** Split a segment (starting at `initial`) at the given split points (which lie on the segment). */
export function splitSegment(initial: Coord, segment: Segment, splitPoints: Coord[]): Segment[] {
    const tol = 1e-6;

    // Filter out any points that are ~equal to the start or end (avoid zero-length pieces)
    const end = segment.to;
    const keep = splitPoints.filter((p) => !nearEqPt(p, initial, tol) && !nearEqPt(p, end, tol));

    if (keep.length === 0) return [segment];

    switch (segment.type) {
        case 'Line': {
            const P0 = initial,
                P1 = segment.to;
            const tList = keep.map((p) => clamp01(paramOnLine(P0, P1, p)));
            const ts = uniqueSortedTs(tList, tol);
            return splitLineAtTs(P0, P1, ts).map((to) => ({type: 'Line', to}));
        }

        case 'Quad': {
            const P0 = initial,
                C = segment.control,
                P2 = segment.to;
            // Estimate t for each split point on the curve
            const tList = keep.map((p) => paramOnQuadratic(P0, C, P2, p));
            const ts = uniqueSortedTs(tList, tol);
            const pieces = splitQuadAtTs(P0, C, P2, ts);
            return pieces.map((q) => ({type: 'Quad', control: q.control, to: q.to}));
        }

        case 'Arc': {
            const {center, clockwise} = segment;
            const P0 = initial,
                P1 = segment.to;

            // Compute directed sweep and a function to get directed fraction for any angle on the arc
            const info = arcParamInfo(center, P0, P1, clockwise);
            const tList = keep.map((p) => arcTForPoint(center, info, p));
            const ts = uniqueSortedTs(tList, tol);

            // Assemble smaller arc segments: we only need to set the new 'to' points
            const ptsInOrder: Coord[] = ts.map((t) => pointOnArc(center, info, t));
            const out: ArcSegment[] = [];
            let curStart = P0;

            for (const p of ptsInOrder) {
                out.push({type: 'Arc', center, to: p, clockwise});
                curStart = p;
            }
            // Final tail to original end
            out.push({type: 'Arc', center, to: P1, clockwise});
            return out;
        }
    }
}

/* ----------------------------- math helpers ----------------------------- */

function nearEq(a: number, b: number, eps = 1e-9) {
    return Math.abs(a - b) <= eps;
}
function nearEqPt(a: Coord, b: Coord, eps = 1e-9) {
    return Math.hypot(a.x - b.x, a.y - b.y) <= eps;
}
function clamp01(t: number) {
    return Math.max(0, Math.min(1, t));
}

function uniqueSortedTs(ts: number[], tol: number): number[] {
    const arr = ts.slice().sort((a, b) => a - b);
    const out: number[] = [];
    for (const t of arr) {
        if (out.length === 0 || Math.abs(t - out[out.length - 1]) > tol) {
            if (t > tol && t < 1 - tol) out.push(t);
        }
    }
    return out;
}

/* ----------------------------- Line splitting --------------------------- */

function paramOnLine(P0: Coord, P1: Coord, P: Coord): number {
    const dx = P1.x - P0.x,
        dy = P1.y - P0.y;
    const denom = dx * dx + dy * dy;
    if (denom === 0) return 0;
    const t = ((P.x - P0.x) * dx + (P.y - P0.y) * dy) / denom;
    return t;
}

function splitLineAtTs(P0: Coord, P1: Coord, ts: number[]): Coord[] {
    const points: Coord[] = [];
    let A = P0,
        B = P1;
    let tPrev = 0;

    for (const t of ts) {
        const localT = (t - tPrev) / (1 - tPrev);
        const M = lerpPt(A, B, localT);
        points.push(M);
        A = M;
        tPrev = t;
    }
    points.push(P1);
    return points;
}

function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}
function lerpPt(A: Coord, B: Coord, t: number): Coord {
    return {x: lerp(A.x, B.x, t), y: lerp(A.y, B.y, t)};
}

/* ----------------------------- Quadratic Bézier ------------------------- */

function evalQuad(P0: Coord, C: Coord, P2: Coord, t: number): Coord {
    const u = 1 - t;
    const x = u * u * P0.x + 2 * u * t * C.x + t * t * P2.x;
    const y = u * u * P0.y + 2 * u * t * C.y + t * t * P2.y;
    return {x, y};
}
function derivQuad(P0: Coord, C: Coord, P2: Coord, t: number): Coord {
    // B'(t) = 2((1-t)(C-P0) + t(P2-C))
    const u = 1 - t;
    return {
        x: 2 * (u * (C.x - P0.x) + t * (P2.x - C.x)),
        y: 2 * (u * (C.y - P0.y) + t * (P2.y - C.y)),
    };
}
function secondDerivQuad(P0: Coord, C: Coord, P2: Coord): Coord {
    // B''(t) = 2(P2 - 2C + P0), constant
    return {x: 2 * (P2.x - 2 * C.x + P0.x), y: 2 * (P2.y - 2 * C.y + P0.y)};
}

/** Find parameter t for a point on a quadratic Bézier using Newton iterations. */
function paramOnQuadratic(P0: Coord, C: Coord, P2: Coord, S: Coord): number {
    // Start guess: projection on chord
    const chordT = paramOnLine(P0, P2, S);
    let t = clamp01(chordT);
    const Bpp = secondDerivQuad(P0, C, P2);

    for (let i = 0; i < 20; i++) {
        const B = evalQuad(P0, C, P2, t);
        const Bp = derivQuad(P0, C, P2, t);
        const rx = B.x - S.x,
            ry = B.y - S.y;

        // Stationarity condition for closest approach: F(t) = (B(t)-S)·B'(t) = 0
        const F = rx * Bp.x + ry * Bp.y;
        const Fp = Bp.x * Bp.x + Bp.y * Bp.y + (rx * Bpp.x + ry * Bpp.y);

        if (Math.abs(F) < 1e-12) break;
        if (Fp === 0) break;

        t -= F / Fp;
        t = clamp01(t);
    }
    return t;
}

/** Split one quadratic at a single t using De Casteljau; returns [left, right]. */
function splitQuadOnce(
    P0: Coord,
    C: Coord,
    P2: Coord,
    t: number,
): [{control: Coord; to: Coord}, {control: Coord; to: Coord; P0?: Coord}] {
    const P0C = lerpPt(P0, C, t);
    const CP2 = lerpPt(C, P2, t);
    const M = lerpPt(P0C, CP2, t);

    // Left quad: P0 -> P0C -> M
    // Right quad: M -> CP2 -> P2
    return [
        {control: P0C, to: M},
        {control: CP2, to: P2},
    ];
}

/** Split a quadratic at multiple ascending t's. */
function splitQuadAtTs(
    P0: Coord,
    C: Coord,
    P2: Coord,
    ts: number[],
): Array<{control: Coord; to: Coord}> {
    const out: Array<{control: Coord; to: Coord}> = [];
    let curP0 = P0,
        curC = C,
        curP2 = P2;
    let tPrev = 0;

    for (const t of ts) {
        const localT = (t - tPrev) / (1 - tPrev);
        const [left, right] = splitQuadOnce(curP0, curC, curP2, localT);

        out.push(left);
        // Prepare for next iteration: right quad becomes current, with start at M (= left.to)
        curP0 = left.to;
        curC = right.control;
        curP2 = right.to;
        tPrev = t;
    }
    // Final tail
    out.push({control: curC, to: curP2});
    return out;
}

/* ----------------------------- Circular arcs ---------------------------- */

type ArcParamInfo = {
    theta0: number; // start angle
    sweep: number; // signed sweep from start to end (cw negative, ccw positive)
    r: number; // radius
};

/** Build directed sweep info for an arc from P0 to P1 about center, given CW/CCW. */
function arcParamInfo(center: Coord, P0: Coord, P1: Coord, clockwise: boolean): ArcParamInfo {
    const θ0 = Math.atan2(P0.y - center.y, P0.x - center.x);
    const θ1 = Math.atan2(P1.y - center.y, P1.x - center.x);
    let Δ = normalizeAngle(θ1 - θ0); // in (-π, π]

    // Convert to the desired direction with magnitude in (0, 2π)
    if (clockwise) {
        if (Δ > 0) Δ -= 2 * Math.PI; // make it negative
    } else {
        if (Δ < 0) Δ += 2 * Math.PI; // make it positive
    }

    const r = Math.hypot(P0.x - center.x, P0.y - center.y);
    return {theta0: θ0, sweep: Δ, r};
}

/** Normalize angle to (-π, π]. */
function normalizeAngle(a: number): number {
    const TWO_PI = 2 * Math.PI;
    a = ((((a + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI) - Math.PI;
    return a;
}

/** Fraction t∈[0,1] along the directed arc for a point lying on the arc. */
function arcTForPoint(center: Coord, info: ArcParamInfo, P: Coord): number {
    const θ = Math.atan2(P.y - center.y, P.x - center.x);
    let δ = normalizeAngle(θ - info.theta0);

    // Ensure δ has same sign as overall sweep and |δ| ≤ |sweep|
    if (info.sweep < 0) {
        if (δ > 0) δ -= 2 * Math.PI; // go the CW way
    } else {
        if (δ < 0) δ += 2 * Math.PI; // go the CCW way
    }
    const t = δ / info.sweep;
    return clamp01(t);
}

/** Point on arc at fraction t. */
function pointOnArc(center: Coord, info: ArcParamInfo, t: number): Coord {
    const θ = info.theta0 + info.sweep * t;
    return {x: center.x + info.r * Math.cos(θ), y: center.y + info.r * Math.sin(θ)};
}
