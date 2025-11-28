import {Coord} from '../../../types';
import {easeInOutCubic} from '../animator.screen/easeInOutCubic';
import {State} from './export-types';

export const tlpos = (ts: number[], t: number) => {
    t = Math.min(1, Math.max(0, t));
    const total = ts.reduce((a, b) => a + b, 0);
    if (total === 1) return {at: 0, t: 0};
    const tby = 1 / total;
    const at = Math.floor(t / tby);
    const mid = t / tby - at;
    let cur = 0;
    for (let i = 0; i < ts.length; i++) {
        const off = at - cur;
        if (off < ts[i]) {
            return {at: i, t: (mid + off) / ts[i]};
        }
        cur += ts[i];
    }
    return {at: ts.length - 1, t: 1};
};

const tlpos2 = (timeline: State['styleConfig']['timeline'], t: number) => {
    t = Math.min(1, Math.max(0, t));
    const tby = 1 / (timeline.ts.length - 1);
    const at = Math.floor(t / tby);
    const mid = t / tby - at;
    return {at, t: mid};
};

export const evalLane = (
    lane: State['styleConfig']['timeline']['lanes'][0],
    pos: {t: number; at: number},
) => {
    if (pos.at === lane.values.length - 1) {
        return lane.ys[lane.values[pos.at]];
    } else {
        const efn = easeFn(lane.easings[pos.at] ?? 'straight');
        const btw = efn(pos.t);
        const prev = lane.ys[lane.values[pos.at]];
        const next = lane.ys[lane.values[pos.at + 1]];
        return prev + (next - prev) * btw;
    }
};

export const evalTimeline = (timeline: State['styleConfig']['timeline'], t: number) => {
    const pos = tlpos(timeline.ts, t);
    const values: Record<string, number | Function> = {};
    timeline.lanes.forEach((lane) => {
        values[lane.name] = evalLane(lane, pos);
        values[lane.name + '_fn'] = (t: number) => {
            const pos = tlpos(timeline.ts, t);
            return evalLane(lane, pos);
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
