import { Coord, FloatLerp } from './types';

// export const timelineLerp = (timeline: FloatLerp) => {};

/*

P0 (-t^3 + 3t^2 - 3t + 1) +
P1 (3t^3 - 6t^2 + 3t) +
P2 (-3t^3  + 3t^2) +
P3 (t^3)

*/

/*

x position = just the x components of these things.

and then ... I want the inverse, I think?
let's try it....

also: P1x and P2x are between P0 and P3. Which might help.
- P0x <= P1x <= P3x
- P0x <= P2x <= P3x


x =
P0 ( -t^3 + 3t^2 - 3t + 1) +
P1 ( 3t^3 - 6t^2 + 3t) +
P2 (-3t^3 + 3t^2) +
P3 (t^3)

I want something that I put in x, and get out t
because then I can pass it to the y function.

ugh ok I'll just do a lookup table :P

*/

export type Bezier = {
    y0: number;
    c1: Coord;
    c2: Coord;
    y1: number;
};

export const evaluateBezier = ({ y0, c1, c2, y1 }: Bezier, t: number) => {
    const t2 = t * t;
    const t3 = t2 * t;
    const b0 = /*    */ -t3 + 3 * t2 - 3 * t + 1;
    const b1 = /* */ 3 * t3 - 6 * t2 + 3 * t;
    const b2 = /**/ -3 * t3 + 3 * t2;
    const b3 = t3;
    const x = /* 0 * b0 + */ c1.x * b1 + c2.x * b2 + 1 * b3;
    const y = /**/ y0 * b0 + c1.y * b1 + c2.y * b2 + y1 * b3;
    return { x, y };
};

export type LookUpTable = Array<{ t: number; pos: Coord }>;

export const createLookupTable = (bezier: Bezier, count: number) => {
    const table: LookUpTable = [{ t: 0, pos: { x: 0, y: bezier.y0 } }];
    for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        table.push({ t, pos: evaluateBezier(bezier, t) });
    }
    return table.concat([{ t: 1, pos: { x: 1, y: bezier.y1 } }]);
};

export const evaluateLookUpTable = (table: LookUpTable, x: number) => {
    if (x === 0) {
        return 0;
    }
    for (let i = 1; i < table.length; i++) {
        const prev = table[i - 1];
        const now = table[i];
        if (prev.pos.x <= x && x <= now.pos.x) {
            const percent = (x - prev.pos.x) / (now.pos.x - prev.pos.x);
            const t = (now.t - prev.t) * percent + prev.t;
            // console.log(
            //     `ok`,
            //     x,
            //     prev.pos.x,
            //     now.pos.x,
            //     percent,
            //     prev.t,
            //     now.t,
            //     t,
            // );
            return t;
        }
    }
    return 1;
};
