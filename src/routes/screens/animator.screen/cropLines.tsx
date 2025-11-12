import {Coord, BarePath, Segment} from '../../../types';
import {State} from './animator.utils';
import {clipToPathData, pkPathWithCmds, splitPathByClip} from './cropPath';

export const cropLines = (lines: {points: Coord[]; alpha: number}[], crops: State['crops']) => {
    if (!crops?.length) return lines;
    let asSegs: {path: BarePath; alpha: number}[] = lines.map((line) => {
        const segments: Segment[] = [];
        for (let i = 1; i < line.points.length; i++) {
            segments.push({type: 'Line', to: line.points[i]});
        }
        return {path: {origin: line.points[0], segments, open: true}, alpha: line.alpha};
    });
    for (let one of crops) {
        if (one.disabled) continue;
        const pd = clipToPathData(one.segments);
        const pk = pkPathWithCmds(one.segments[one.segments.length - 1].to, one.segments);
        asSegs = asSegs.flatMap((line) => {
            const parts = splitPathByClip(pd, pk, line.path);
            return parts
                .filter((part) => part.inside === !one.hole)
                .map((part) => ({path: part.path, alpha: line.alpha}));
        });
    }
    return asSegs.map(({path, alpha}) => {
        const points = [path.origin, ...path.segments.map((s) => s.to)];
        return {points, alpha};
    });
};
