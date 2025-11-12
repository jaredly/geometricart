// svgArcToSkiaConic.ts
// Converts a single SVG elliptical arc command into one or more Skia conic segments.
// Works with Skia APIs that accept (cx, cy, w, x2, y2) for conicTo.
// Input corresponds to SVG 'A rx ry φ largeArcFlag sweepFlag x y' with known current point (x0,y0).

type ConicSeg = {
    // Conic control point, weight, and end point in *device* space (already transformed from ellipse)
    cx: number;
    cy: number;
    w: number;
    x: number;
    y: number;
};

export function svgArcToSkiaConics(
    x0: number,
    y0: number, // current point (start of arc)
    rx: number,
    ry: number, // radii
    phiDeg: number, // x-axis-rotation in degrees
    largeArc: 0 | 1, // large-arc-flag
    sweep: 0 | 1, // sweep-flag
    x1: number,
    y1: number, // arc end point
): ConicSeg[] {
    // Degenerate cases
    if ((x0 === x1 && y0 === y1) || rx === 0 || ry === 0) return [];

    // 1) Normalize inputs
    const φ = ((phiDeg % 360) * Math.PI) / 180;
    const cosφ = Math.cos(φ),
        sinφ = Math.sin(φ);

    // Step 1a: transform to the ellipse-aligned frame (per SVG spec)
    // Compute midpoint between points in rotated frame
    const dx2 = (x0 - x1) / 2;
    const dy2 = (y0 - y1) / 2;
    const x1p = cosφ * dx2 + sinφ * dy2;
    const y1p = -sinφ * dx2 + cosφ * dy2;

    // Step 1b: ensure radii are large enough (radii correction)
    let rxAbs = Math.abs(rx);
    let ryAbs = Math.abs(ry);

    const rCheck = (x1p * x1p) / (rxAbs * rxAbs) + (y1p * y1p) / (ryAbs * ryAbs);
    if (rCheck > 1) {
        const s = Math.sqrt(rCheck);
        rxAbs *= s;
        ryAbs *= s;
    }

    // Step 1c: compute center in the rotated frame
    const sign = largeArc === sweep ? -1 : 1;
    const rx2 = rxAbs * rxAbs,
        ry2 = ryAbs * ryAbs;
    const num = rx2 * ry2 - rx2 * (y1p * y1p) - ry2 * (x1p * x1p);
    const den = rx2 * (y1p * y1p) + ry2 * (x1p * x1p);
    // Guard against tiny negatives due to fp error
    const k = sign * Math.sqrt(Math.max(0, num / den));

    const cxp = (k * (rxAbs * y1p)) / ryAbs;
    const cyp = (k * (-ryAbs * x1p)) / rxAbs;

    // Center in original coordinates
    const cx = cosφ * cxp - sinφ * cyp + (x0 + x1) / 2;
    const cy = sinφ * cxp + cosφ * cyp + (y0 + y1) / 2;

    // Step 1d: compute angles θ0 and Δ (in the ellipse-aligned frame)
    function angle(uX: number, uY: number, vX: number, vY: number): number {
        // angle between (u) and (v), signed for cross product
        const dot = uX * vX + uY * vY;
        const mag = Math.hypot(uX, uY) * Math.hypot(vX, vY);
        let ang = Math.acos(Math.min(1, Math.max(-1, dot / mag)));
        const cross = uX * vY - uY * vX;
        if (cross < 0) ang = -ang;
        return ang;
    }

    // Unit vectors from center to start/end in the rotated+scaled frame
    const ux = (x1p - cxp) / rxAbs;
    const uy = (y1p - cyp) / ryAbs;
    const vx = (-x1p - cxp) / rxAbs;
    const vy = (-y1p - cyp) / ryAbs;

    let θ0 = angle(1, 0, ux, uy);
    let Δ = angle(ux, uy, vx, vy);

    // Adjust Δ for sweep flag to be within (-2π, 2π] with desired sign
    if (sweep === 0 && Δ > 0) Δ -= 2 * Math.PI;
    if (sweep === 1 && Δ < 0) Δ += 2 * Math.PI;

    // 2) Split into segments of at most 90°
    const segCount = Math.max(1, Math.ceil(Math.abs(Δ) / (Math.PI / 2)));
    const Δi = Δ / segCount;

    const result: ConicSeg[] = [];

    // Precompute the ellipse affine map (unit circle -> ellipse)
    function mapToEllipse(x: number, y: number): {x: number; y: number} {
        // [ rx cosφ  -ry sinφ ] [x] + [cx]
        // [ rx sinφ   ry cosφ ] [y]   [cy]
        return {
            x: rxAbs * cosφ * x - ryAbs * sinφ * y + cx,
            y: rxAbs * sinφ * x + ryAbs * cosφ * y + cy,
        };
    }

    // 3) Build conic(s)
    for (let i = 0; i < segCount; i++) {
        const θs = θ0 + i * Δi; // start angle of this segment
        const θe = θs + Δi; // end angle
        const half = (θs + θe) / 2;
        const halfSpan = (θe - θs) / 2; // = Δi/2, signed

        // Unit circle points
        const P0 = {x: Math.cos(θs), y: Math.sin(θs)};
        const P2 = {x: Math.cos(θe), y: Math.sin(θe)};
        const Pm = {x: Math.cos(half), y: Math.sin(half)};

        // For a circular arc, the rational quad with:
        //   weight w = cos(|Δi|/2)
        //   control P1 = Pm / w
        // gives an exact arc on the unit circle.
        const w = Math.cos(Math.abs(halfSpan));
        // If Δi is ~0, avoid division noise
        const invW = w !== 0 ? 1 / w : 0;

        const P1 = {x: Pm.x * invW, y: Pm.y * invW};

        // Map to ellipse space
        const C = mapToEllipse(P1.x, P1.y);
        const E = mapToEllipse(P2.x, P2.y);

        result.push({cx: C.x, cy: C.y, w, x: E.x, y: E.y});
    }

    return result;
}
