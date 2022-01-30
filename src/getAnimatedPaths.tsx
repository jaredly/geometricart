import { angleTo, dist, push } from './getMirrorTransforms';
import { Coord, State } from './types';
import { getSelectedIds } from './Canvas';
import { angleBetween } from './findNextSegments';
import { segmentsBounds, segmentsCenter } from './Export';

export function getAnimatedPaths(
    state: State,
    scripts: ({
        key: string;
        fn: any;
        args: string[];
        phase: 'pre-inset' | 'post-inset';
        selection: { type: 'Path' | 'PathGroup'; ids: string[] } | undefined;
    } | null)[],
    currentAnimatedValues: { [key: string]: number },
) {
    const paths = { ...state.paths };
    scripts.forEach((script) => {
        if (!script) {
            return;
        }

        const selectedIds = script.selection
            ? getSelectedIds(paths, script.selection)
            : null;
        let subset = paths;
        if (selectedIds) {
            subset = {};
            Object.keys(selectedIds).forEach((id) => (subset[id] = paths[id]));
        }
        const args = [
            subset,
            ...script!.args.map((arg) => currentAnimatedValues[arg] || 0),
        ];
        try {
            script!.fn.apply(null, args);
        } catch (err) {
            console.error(err);
            console.log(`Bad fn invocation`, script!.key);
        }
        if (selectedIds) {
            Object.keys(selectedIds).forEach((id) => (paths[id] = subset[id]));
        }
    });
    return paths;
}

export function getAnimationScripts(state: State): ({
    key: string;
    fn: any;
    args: string[];
    phase: 'pre-inset' | 'post-inset';
    selection: { type: 'Path' | 'PathGroup'; ids: string[] } | undefined;
} | null)[] {
    return Object.keys(state.animations.scripts)
        .filter((k) => state.animations.scripts[k].enabled)
        .map((key) => {
            const script = state.animations.scripts[key];
            const line = script.code.match(
                /\s*\(((\s*\w+\s*,)+(\s*\w+)?\s*)\)\s*=>/,
            );
            console.log(line);
            if (!line) {
                console.log(`No match`);
                return null;
            }
            const args = line![1]
                .split(',')
                .map((m) => m.trim())
                .filter(Boolean);
            if (args[0] !== 'paths') {
                console.log('bad args', args);
                return null;
            }

            const lerpPos = (p1: Coord, p2: Coord, percent: number) => {
                return {
                    x: (p2.x - p1.x) * percent + p1.x,
                    y: (p2.y - p1.y) * percent + p1.y,
                };
            };

            const followPath = (points: Array<Coord>, percent: number) => {
                const dists = [];
                let total = 0;
                for (let i = 1; i < points.length; i++) {
                    const d = dist(points[i - 1], points[i]);
                    total += d;
                    dists.push(d);
                }
                const desired = percent * total;
                let at = 0;
                for (let i = 0; i < points.length - 1; i++) {
                    if (at + dists[i] > desired) {
                        return lerpPos(
                            points[i],
                            points[i + 1],
                            (desired - at) / dists[i],
                        );
                    }
                    at += dists[i];
                }
                return points[points.length - 1];
            };

            const builtins: { [key: string]: Function } = {
                dist,
                push,
                angleTo,
                angleBetween,
                segmentsBounds,
                segmentsCenter,
                followPath,
                lerpPos,
            };
            try {
                const fn = new Function(
                    Object.keys(builtins).join(','),
                    'return ' + script.code,
                )(...Object.keys(builtins).map((k) => builtins[k]));
                return {
                    key,
                    fn,
                    args: args.slice(1),
                    phase: script.phase,
                    selection: script.selection,
                };
            } catch (err) {
                console.log('Bad fn');
                console.error(err);
                return null;
            }
        })
        .filter(Boolean);
}
