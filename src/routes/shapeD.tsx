import {Coord} from '../types';

export const shapeD = (points: Coord[], z = true) =>
    'M' +
    points
        .map((p) => `${Math.round(p.x * 1000) / 1000} ${Math.round(p.y * 1000) / 1000}`)
        .join('L') +
    (z ? 'Z' : '');

export function arcPathFromCenter(opts: {
    center: {x: number; y: number};
    theta0: number; // start angle (rad)
    theta1: number; // end angle (rad)
    clockwise: boolean; // true => sweepFlag=1 (clockwise on-screen)
    r: number; // circle radius
    xAxisRotationDeg?: number; // ellipse rotation (degrees), default 0
    decimals?: number; // round output coords, default 3
}): string {
    const {
        center: {x: cx, y: cy},
        theta0,
        theta1,
        clockwise,
        r,
        xAxisRotationDeg = 0,
        decimals = 3,
    } = opts;

    const TAU = Math.PI * 2;

    // Normalize angle to [0, 2π)
    const norm = (a: number) => ((a % TAU) + TAU) % TAU;
    const t0 = norm(theta0);
    const t1 = norm(theta1);

    // Angular distance along the chosen direction
    // ccwDist is the smaller positive CCW angle from t0 to t1
    const ccwDist = (t1 - t0 + TAU) % TAU;
    const dist = clockwise ? (TAU - ccwDist) % TAU : ccwDist;

    const largeArcFlag = dist < Math.PI ? 1 : 0;
    // In SVG, sweep-flag=1 draws the arc in the "positive-angle" screen direction,
    // which (because Y increases downward) corresponds to CLOCKWISE on screen.
    const sweepFlag = clockwise ? 1 : 0;

    // Convert ellipse rotation (SVG expects degrees in the A command, but we need radians for point math)
    const phi = (xAxisRotationDeg * Math.PI) / 180;

    // Point on rotated ellipse centered at (cx,cy):
    // local (u, v) = (rx*cos t, ry*sin t)
    // rotate by phi: x = cx + u*cosφ - v*sinφ ; y = cy + u*sinφ + v*cosφ
    const pt = (t: number) => {
        const u = r * Math.cos(t);
        const v = r * Math.sin(t);
        const x = cx + u * Math.cos(phi) - v * Math.sin(phi);
        const y = cy + u * Math.sin(phi) + v * Math.cos(phi);
        return {x, y};
    };

    const p0 = pt(t0);
    const p1 = pt(t1);

    const fmt = (n: number) => (Number.isFinite(decimals) ? n.toFixed(decimals) : String(n));

    // Build the path using absolute commands
    // M x0 y0 A rx ry xAxisRotation largeArcFlag sweepFlag x1 y1
    return [
        'M',
        fmt(p0.x),
        fmt(p0.y),
        'A',
        fmt(r),
        fmt(r),
        fmt(xAxisRotationDeg),
        largeArcFlag,
        sweepFlag,
        fmt(p1.x),
        fmt(p1.y),
    ].join(' ');
}
