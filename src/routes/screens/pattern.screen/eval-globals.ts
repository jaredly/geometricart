import {angleTo, dist} from '../../../rendering/getMirrorTransforms';
import {ease, easeInOutCubic} from '../animator.screen/easeInOutCubic';
import {easeFn} from './evalEase';

const clamp = (a: number, b: number, c: number) => (a < b ? b : a > c ? c : a);
const stretch = (m: number, by: number) => clamp(m * (1 + by * 2) - by, 0, 1);

const tsplit = (t: number, count: number, by: number, ease = easeInOutCubic) => {
    const section = 1 / count;
    const ok = (prev: number) => ease(stretch((t - prev) / section, by)) / count + prev;
    // const ok = (prev: number) => stretch(ease((t - prev) / section), by) / count + prev;
    for (let i = 1; i < count; i++) {
        if (t < i * section) {
            return ok((i - 1) * section);
        }
    }
    return ok((count - 1) * section);
};

export const chunk = (
    config: (number | [number, number] | [number, number, string])[],
    t: number,
) => {
    const v = t * config.length;
    const t0 = Math.floor(v);
    const current = config[Math.min(t0, config.length - 1)];
    const amount = t0 === config.length ? 1 : v - t0;
    if (typeof current === 'number') {
        return current;
    } else {
        const [min, max, ease = 'straight'] = current;
        return easeFn(ease)(amount) * (max - min) + min;
    }
};

export function mulberry32(seed: number) {
    let a = seed >>> 0; // force to unsigned 32-bit

    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // 2^32
    };
}

export const globals: Record<string, any> = {
    Math,
    dist,
    ease,
    angleTo,
    easeInOutCubic,
    tsplit,
    chunk,
    // chunk(values: number[], t: number) {
    //     const v = t * values.length;
    //     const t0 = Math.floor(v);
    //     return values[Math.min(t0, values.length - 1)];
    // },
};
