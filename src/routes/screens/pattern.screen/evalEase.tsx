import {Coord} from '../../../types';
import {easeInOutCubic} from '../animator.screen/easeInOutCubic';
import {State} from './export-types';

export const evalTimeline = (timeline: State['styleConfig']['timeline'], t: number) => {
    const tby = 1 / (timeline.ts.length - 1);
    t = Math.min(1, Math.max(0, t));
    const at = Math.floor(t / tby);
    const mid = t / tby - at;
    const values: Record<string, number | Function> = {};
    timeline.lanes.forEach((lane) => {
        if (at === lane.values.length - 1) {
            values[lane.name] = lane.ys[lane.values[at]];
        } else {
            const efn = easeFn(lane.easings[at] ?? 'straight');
            const btw = efn(mid);
            const prev = lane.ys[lane.values[at]];
            const next = lane.ys[lane.values[at + 1]];
            values[lane.name] = prev + (next - prev) * btw;
        }
        values[lane.name + '_fn'] = (t: number) => {
            t = Math.min(1, Math.max(0, t));
            const at = Math.floor(t / tby);
            const mid = t / tby - at;
            if (at === lane.values.length - 1) {
                return lane.ys[lane.values[at]];
            } else {
                const efn = easeFn(lane.easings[at] ?? 'straight');
                const btw = efn(mid);
                const prev = lane.ys[lane.values[at]];
                const next = lane.ys[lane.values[at + 1]];
                return prev + (next - prev) * btw;
            }
        };
    });
    return values;
};
const easeFn = (ease: string): ((n: number) => number) => {
    switch (ease) {
        case 'start':
            return (x) => (x === 0 ? 0 : 1);
        case 'end':
            return (x) => (x === 1 ? 1 : 0);
        case 'inout':
            return easeInOutCubic;
    }
    return (x) => x;
};
export const evalEase = (ease: string, p0: Coord, p1: Coord) => {
    const efn = easeFn(ease);
    const pts: Coord[] = [];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const m = 30;
    for (let i = 0; i <= m; i++) {
        const x = i / m;
        const y = efn(x);
        pts.push({x: p0.x + dx * x, y: p0.y + dy * y});
    }
    return pts;
};
