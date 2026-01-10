import {boundsForCoords} from '../../../../editor/Bounds';
import {closeEnough, closeEnoughAngle} from '../../../../rendering/epsilonToZero';
import {angleTo, dist} from '../../../../rendering/getMirrorTransforms';
import {Coord} from '../../../../types';
import {centroid} from '../../../findReflectionAxes';
import {ease, easeInOutCubic} from '../../animator.screen/easeInOutCubic';
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

type Chunk =
    | number
    | [number, number]
    | [number, number, string]
    | [number, number, string, number];

export const chunk = (config: Chunk[], t: number) => {
    if (t == null) return 0;
    const weights = config.map((item) => (Array.isArray(item) ? (item[3] ?? 1) : 1));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const scaled = weights.map((w) => w / totalWeight);
    let soFar = 0;
    let at = scaled.findIndex((weight) => {
        if (soFar + weight > t) {
            return true;
        }
        soFar += weight;
    });
    let self = 0;
    if (at === -1) {
        at = config.length - 1;
        self = 1;
    } else {
        self = (t - soFar) / scaled[at];
        if (closeEnough(self, 1)) {
            self = 1;
        }
    }
    const current = config[at];
    if (typeof current === 'number') {
        return current;
    } else {
        const [min, max, ease = 'straight'] = current;
        return easeFn(ease)(self) * (max - min) + min;
    }
};

export const chunks = (num: number, config: Chunk[], t: number) => {
    const values: number[] = [];
    for (let i = 0; i < num; i++) {
        const expanded: Chunk[] = [];
        config.forEach((item) => {
            for (let j = 0; j < num; j++) {
                if (typeof item === 'number') {
                    expanded.push(item);
                } else {
                    expanded.push(j < i ? item[0] : j > i ? item[1] : item);
                }
            }
        });
        values.push(chunk(expanded, t));
    }
    return values;
};

// export const chunks = (config: Chunk[], t: number): number[] => {
//     if (t == null) return config.map(() => 0);
//     const weights = config.map((item) => (Array.isArray(item) ? (item[3] ?? 1) : 1));
//     const totalWeight = weights.reduce((a, b) => a + b, 0);
//     const scaled = weights.map((w) => w / totalWeight);
//     let soFar = 0;
//     let at = scaled.findIndex((weight) => {
//         if (soFar + weight > t) {
//             return true;
//         }
//         soFar += weight;
//     });
//     let self = 0;
//     if (at === -1) {
//         at = config.length - 1;
//         self = 1;
//     } else {
//         self = (t - soFar) / scaled[at];
//         if (closeEnough(self, 1)) {
//             self = 1;
//         }
//     }
//     return config.map((current, i) => {
//         const iself = i === at ? self : i < at ? 1 : 0;
//         if (typeof current === 'number') {
//             return current;
//         } else {
//             const [min, max, ease = 'straight'] = current;
//             return easeFn(ease)(iself) * (max - min) + min;
//         }
//     });
// };

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

// biome-ignore lint: this one is fine
export const globals: Record<string, any> = {
    Math,
    dist,
    ease,
    angleTo,
    centroid,
    easeInOutCubic,
    closeEnough,
    closeEnoughAngle,
    bbox: (c: Coord[]) => boundsForCoords(...c),
    tsplit,
    chunk,
    chunks,
    zJump(t: number, p = 0.1) {
        if (t < p) return t / p;
        if (t > 1 - p) return (1 - t) / p;
        return 1;
    },
    // chunk(values: number[], t: number) {
    //     const v = t * values.length;
    //     const t0 = Math.floor(v);
    //     return values[Math.min(t0, values.length - 1)];
    // },
};
