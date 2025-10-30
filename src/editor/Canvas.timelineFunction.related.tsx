import {TLSegmentCurve} from './Canvas';
import {epsilon} from '../rendering/epsilonToZero';
import {Bezier, createLookupTable, evaluateBezier, evaluateLookUpTable} from '../lerp';
import {Animations, Coord, FloatLerp, LerpPoint} from '../types';
import {functionWithBuiltins} from '../animation/getAnimatedPaths';

export type TLSegment = {type: 'straight'; y0: number; span: number; x0: number} | TLSegmentCurve;

export const evaluateSegment = (seg: TLSegment, percent: number) => {
    if (seg.type === 'straight') {
        return seg.y0 + seg.span * percent;
    }
    const t = evaluateLookUpTable(seg.lookUpTable, percent);
    return evaluateBezier(seg.bezier, t).y;
};

export const segmentForPoints = (left: LerpPoint, right: LerpPoint): TLSegment => {
    if (!left.rightCtrl && !right.leftCtrl) {
        return {
            type: 'straight',
            y0: left.pos.y,
            span: right.pos.y - left.pos.y,
            x0: left.pos.x,
        };
    }
    const dx = right.pos.x - left.pos.x;
    const c1 = left.rightCtrl
        ? {x: left.rightCtrl.x / dx, y: left.rightCtrl.y + left.pos.y}
        : {x: 0, y: left.pos.y};
    const c2 = right.leftCtrl
        ? {x: (dx + right.leftCtrl.x) / dx, y: right.leftCtrl.y + right.pos.y}
        : {x: 1, y: right.pos.y};
    const bezier: Bezier = {y0: left.pos.y, c1, c2, y1: right.pos.y};
    return {
        type: 'curve',
        bezier,
        lookUpTable: createLookupTable(bezier, 10),
        x0: left.pos.x,
    };
};

export const timelineFunction = (timeline: FloatLerp) => {
    const segments: Array<TLSegment> = timelineSegments(timeline);
    // console.log(segments);
    return (x: number) => {
        for (let i = 0; i < segments.length; i++) {
            const x0 = segments[i].x0;
            const next = i === segments.length - 1 ? 1 : segments[i + 1].x0;
            if (x < next) {
                // const x1 = i === segments.length - 1 ? 1 : segments[i + 1].x0;
                const percent = (x - x0) / (next - x0);
                return evaluateSegment(segments[i], percent);
            }
        }
        const last = segments[segments.length - 1];
        if (last.type === 'straight') {
            return last.y0 + last.span;
        }
        return last.bezier.y1;
    };
};

export type AnimatedFunctions = {
    [key: string]: ((n: number) => number) | ((n: Coord) => Coord) | ((n: number) => Coord);
};

export const getAnimatedFunctions = (animations: Animations): AnimatedFunctions => {
    const fn: AnimatedFunctions = {};
    Object.keys(animations.lerps).forEach((key) => {
        if (key === 't') {
            console.warn(`Can't have a custom vbl named t. Ignoring`);
            return;
        }
        const vbl = animations.lerps[key];
        if (vbl.type === 'float') {
            fn[key] = timelineFunction(vbl);
        } else {
            try {
                const k = functionWithBuiltins(vbl.code);
                fn[key] = k as (n: number) => number;
            } catch (err) {
                console.warn(`Zeroing out ${key}, there was an error evaliation.`);
                console.error(err);
                fn[key] = (n: number) => {
                    return 0;
                };
            }
        }
    });
    return fn;
};

export const evaluateAnimatedValues = (animatedFunctions: AnimatedFunctions, position: number) => {
    return {...animatedFunctions, t: position};
};

export function timelineSegments(timeline: FloatLerp) {
    const segments: Array<TLSegment> = [];
    const points = timeline.points.slice();
    if (!points.length || points[0].pos.x > 0) {
        points.unshift({pos: {x: 0, y: 0}});
    }
    if (points[points.length - 1].pos.x < 1 - epsilon) {
        points.push({pos: {x: 1, y: 1}});
    }
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const now = points[i];
        segments.push(segmentForPoints(prev, now));
    }
    return segments;
}