import {angleTo, dist} from '../../../rendering/getMirrorTransforms';
import {ease, easeInOutCubic} from '../animator.screen/easeInOutCubic';

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

export const globals: Record<string, any> = {
    Math,
    dist,
    ease,
    angleTo,
    easeInOutCubic,
    tsplit,
};
