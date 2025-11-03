import {useEffect, useMemo, useRef} from 'react';
import {useFetcher} from 'react-router';
import {plerp} from '../../../plerp';
import {Coord, Guide, GuideGeom, PendingGuide} from '../../../types';

export const findExtraPoints = (line: Coord[], count: number) => {
    const first = line.slice(0, -1);
    const last = line[line.length - 1];
    const dupLast = true;
    if (dupLast) {
        for (let i = 0; i <= count; i++) {
            first.push(last);
        }
        return first;
    }
    const next = line[line.length - 2];
    const dx = (last.x - next.x) / (count + 1);
    const dy = (last.y - next.y) / (count + 1);
    for (let i = 1; i <= count; i++) {
        first.push({x: next.x + dx * i, y: next.y + dy * i});
    }
    first.push(last);
    return first;
};

export const lineAt = (frames: {at: number; points: Coord[]}[], at: number) => {
    const exact = frames.find((f) => f.at === at);
    if (exact) return exact.points;
    const after = frames.findIndex((f) => f.at > at);
    if (after === 0 || after === -1) return;
    let prev = frames[after - 1];
    let post = frames[after];
    const btw = (at - prev.at) / (post.at - prev.at);
    let left = prev.points;
    let right = post.points;
    if (left.length < right.length) left = findExtraPoints(left, right.length - left.length);
    if (right.length < left.length) right = findExtraPoints(right, left.length - right.length);
    return left.map((p, i) => plerp(p, right[i], btw));
};

const debounce = (act: () => void, wait: number, max: number) => {
    let last = 0;
    let tid: NodeJS.Timeout | null = null;
    return () => {
        if (tid) {
            clearTimeout(tid);
            tid = null;
        }
        if (Date.now() - last > max) {
            last = Date.now();
            act();
            return;
        }
        tid = setTimeout(() => {
            last = Date.now();
            tid = null;
            act();
        }, wait);
    };
};

export type State = {
    layers: {pattern: string; visible: boolean}[];
    guides?: GuideGeom[];
    lines: {
        keyframes: {
            at: number;
            points: Coord[];
        }[];
    }[];
};

export const useFetchBounceState = (state: State) => {
    const fetcher = useFetcher();
    const firstLoad = useRef(true);
    const latest = useRef(state);
    latest.current = state;
    const fref = useRef(fetcher);
    const bouncer = useMemo(
        () =>
            debounce(
                () =>
                    fref.current.submit({state: JSON.stringify(latest.current)}, {method: 'POST'}),
                300,
                5000,
            ),
        [],
    );
    useEffect(() => {
        if (firstLoad.current) {
            firstLoad.current = false;
            return;
        }

        const _changed = state;
        bouncer();
    }, [state, bouncer]);
};

function easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

const ease = (at: number) => {
    at *= 2;
    if (at < 1) {
        return at < 0.1 ? 0 : at > 0.9 ? 1 : easeInOutCubic((at - 0.1) / 0.9);
    }
    at -= 1;
    return 1 - (at < 0.1 ? 0 : at > 0.9 ? 1 : easeInOutCubic((at - 0.1) / 0.9));
};

export const useAnimate = (
    animate: boolean,
    setAnimate: (b: boolean) => void,
    setPreview: (p: number) => void,
) => {
    useEffect(() => {
        if (!animate) return;
        let at = 0;
        let it = setInterval(() => {
            at += 0.002;
            if (at >= 1) {
                clearInterval(it);
                setAnimate(false);
            }

            setPreview(
                ease(at),

                // Math.max(
                //     0,
                //     Math.min(1, 1.1 - (Math.cos(at * Math.PI * 2) + 1) * 0.6),
                // ),
            );
        }, 20);

        return () => clearInterval(it);
    }, [animate, setAnimate, setPreview]);
};
export type Pending = {type: 'line'; idx?: number; points: Coord[]} | PendingGuide;
