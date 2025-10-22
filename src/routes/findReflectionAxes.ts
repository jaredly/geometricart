import {dist} from '../rendering/getMirrorTransforms';

type Pt = {x: number; y: number};
export type Axis = {src: Pt; dir: Pt; point: Pt; dest: Pt; angle: number; length: number}; // dir is unit length

/**
 * Find all reflectional symmetry axes of a polygon given by ordered vertices.
 * Vertices can be CW or CCW; polygon can be convex or non-convex, but should be simple.
 */
export function findReflectionAxes(poly: Pt[], eps?: number): Axis[] {
    const n = poly.length;
    if (n < 2) return [];
    // numeric tolerance: scale with polygon size
    const scale = boundingDiameter(poly);
    const tol = eps ?? scale * 1e-9;

    // reflect point p about infinite line through A with direction u (unit)
    const reflect = (p: Pt, A: Pt, u: Pt): Pt => {
        const AP = sub(p, A);
        const projLen = dot(AP, u);
        const perp = sub(AP, mul(u, projLen));
        const mirrored = sub(p, mul(perp, 2));
        return {x: mirrored.x, y: mirrored.y};
    };

    // index helpers
    const at = (i: number) => poly[((i % n) + n) % n];
    const midpoint = (p: Pt, q: Pt): Pt => mul(add(p, q), 0.5);

    // Candidate axes and their index “centers”.
    // For an axis with center parameter s (integer in [0..2n-1]),
    // the reflection must map vertex k -> (s - k) mod n.
    type Candidate = {A: Pt; B: Pt; s: number};
    const cands: Candidate[] = [];

    if (n % 2 === 0) {
        // Even n: two families (n/2 each)
        for (let i = 0; i < n / 2; i++) {
            // Through opposite vertices i and i+n/2
            cands.push({A: at(i), B: at(i + n / 2), s: (2 * i) % n}); // s even
        }
        for (let i = 0; i < n / 2; i++) {
            // Through midpoints of opposite edges (i,i+1) and (i+n/2, i+n/2+1)
            const M1 = midpoint(at(i), at(i + 1));
            const M2 = midpoint(at(i + n / 2), at(i + n / 2 + 1));
            cands.push({A: M1, B: M2, s: (2 * i + 1) % n}); // s odd
        }
    } else {
        // Odd n: each axis goes through vertex i and midpoint of the opposite edge
        const half = (n - 1) / 2;
        for (let i = 0; i < n; i++) {
            const j = i + half;
            const M = midpoint(at(j), at(j + 1));
            cands.push({A: at(i), B: M, s: (2 * i) % n}); // s even
        }
    }

    // Deduplicate passing axes using (angle, signed distance) bin
    const seen = new Set<string>();
    const axes: Axis[] = [];

    for (const {A, B, s} of cands) {
        let u = unit(sub(B, A));
        if (norm(u) < tol) continue; // degenerate

        // Normalize axis “direction” so opposite directions hash the same:
        if (u.y < 0 || (u.y === 0 && u.x < 0)) u = {x: -u.x, y: -u.y};

        // Quick centroid test (a true mirror line must pass through centroid of vertices)
        const C = centroid(poly);
        const distC = pointLineDistance(C, A, u);
        if (distC > 1e3 * tol) {
            // Not definitive, but rejects many wrong axes fast
            continue;
        }

        // Verify mapping k -> (s - k) mod n by direct reflection
        let ok = true;
        for (let k = 0; k < n; k++) {
            const k2 = (((s - k) % n) + n) % n;
            const p = at(k);
            const qExpected = at(k2);
            const q = reflect(p, A, u);
            if (!almostEqualPts(q, qExpected, tol)) {
                ok = false;
                break;
            }
        }
        if (!ok) continue;

        // Canonicalize an axis representative: use the point = projection of centroid on axis
        const t = dot(sub(C, A), u);
        const P0 = add(A, mul(u, t));

        // Hash by angle & offset from origin
        const angle = Math.atan2(u.y, u.x); // [-pi,pi]
        const rho = signedOffset(P0, u); // signed distance from origin to the line
        const key = `${round(angle, 1e-10)}|${round(rho, 1e-8)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        axes.push({point: P0, dir: u, src: A, dest: B, angle, length: dist(A, B)});
    }

    return axes;
}

// ---------- math utils ----------
export function centroid(pts: Pt[]): Pt {
    // vertex-average centroid (good enough for symmetry axis test)
    let sx = 0,
        sy = 0;
    for (const p of pts) {
        sx += p.x;
        sy += p.y;
    }
    const inv = 1 / pts.length;
    return {x: sx * inv, y: sy * inv};
}

function pointLineDistance(p: Pt, A: Pt, u: Pt): number {
    const v = sub(p, A);
    const proj = mul(u, dot(v, u));
    const perp = sub(v, proj);
    return norm(perp);
}

function signedOffset(P: Pt, u: Pt): number {
    // Signed distance of line (through P with direction u) from origin.
    // For normalized u, distance = (P ⟂ · u), where P⟂ = ( -P.y, P.x )
    return -P.y * u.x + P.x * u.y;
}

function round(x: number, tol: number): number {
    return Math.round(x / tol) * tol;
}

function almostEqual(a: number, b: number, t: number): boolean {
    const d = Math.abs(a - b);
    return d <= t || d <= t * Math.max(1, Math.abs(a), Math.abs(b));
}
function almostEqualPts(a: Pt, b: Pt, t: number): boolean {
    return almostEqual(a.x, b.x, t) && almostEqual(a.y, b.y, t);
}

function boundingDiameter(pts: Pt[]): number {
    let minx = Infinity,
        miny = Infinity,
        maxx = -Infinity,
        maxy = -Infinity;
    for (const p of pts) {
        if (p.x < minx) minx = p.x;
        if (p.y < miny) miny = p.y;
        if (p.x > maxx) maxx = p.x;
        if (p.y > maxy) maxy = p.y;
    }
    return Math.hypot(maxx - minx, maxy - miny);
}

// Helpers
const add = (a: Pt, b: Pt): Pt => ({x: a.x + b.x, y: a.y + b.y});
const sub = (a: Pt, b: Pt): Pt => ({x: a.x - b.x, y: a.y - b.y});
const mul = (a: Pt, k: number): Pt => ({x: a.x * k, y: a.y * k});
const dot = (a: Pt, b: Pt): number => a.x * b.x + a.y * b.y;
const norm = (a: Pt): number => Math.hypot(a.x, a.y);
const unit = (a: Pt): Pt => {
    const l = norm(a);
    return l === 0 ? {x: 1, y: 0} : {x: a.x / l, y: a.y / l};
};
