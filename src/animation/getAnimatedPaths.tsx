import {getSelectedIds} from '../editor/SVGCanvas';
import {animationTimer, getBuiltins} from './getBuiltins';
import {State} from '../types';

export function getAnimatedPaths(
    state: State,
    scripts: {[key: string]: ParsedScript},
    animationPosition: number,
    currentAnimatedValues: {[key: string]: number},
) {
    let paths = {...state.paths};
    let view = {...state.view};

    state.animations.timelines.forEach((timeline) => {
        if (!timeline.enabled) {
            return;
        }
        // console.log('tl', timeline);
        const enabled = timeline.items.filter((t) => t.enabled);

        if (!enabled.length) {
            return;
        }

        const weights = enabled.map((t) => t.weight);
        let [idx, t] = animationTimer(animationPosition, weights);

        // console.log(idx, t);

        let current = enabled[idx];
        if (current.contents.type === 'spacer') {
            if (current.contents.still === 'left' && idx > 0) {
                idx -= 1;
                current = enabled[idx];
                t = 1;
            } else if (current.contents.still === 'right' && idx < enabled.length - 1) {
                idx += 1;
                current = enabled[idx];
                t = 0;
            }
        }

        if (current.contents.type === 'script') {
            const selectedIds = current.contents.selection
                ? getSelectedIds(paths, current.contents.selection)
                : null;
            let subset = paths;
            if (selectedIds) {
                subset = {};
                Object.keys(selectedIds).forEach((id) => {
                    subset[id] = paths[id];
                });
            }

            const script = scripts[current.contents.scriptId];
            if (!script) {
                console.error(`Missing script! ${current.contents.scriptId}`);
                return;
            }

            const args = [
                subset,
                ...script!.args.map((arg) =>
                    arg === 't' || arg === 't0'
                        ? t
                        : arg === 'view'
                          ? view
                          : currentAnimatedValues[arg] || 0,
                ),
            ];
            try {
                script!.fn.apply(null, args);
            } catch (err) {
                console.error(err);
                console.log(`Bad fn invocation`, script!.key);
            }
            if (selectedIds) {
                Object.keys(selectedIds).forEach((id) => {
                    if (!subset[id]) {
                        delete paths[id];
                    }
                });
                paths = {...paths, ...subset};
            }
        }
    });

    return {paths, view};
}

export type ParsedScript = {
    key: string;
    fn: any;
    args: string[];
};

export function getAnimationScripts(state: State): {
    [key: string]: ParsedScript;
} {
    const scripts: {[key: string]: ParsedScript} = {};
    Object.keys(state.animations.scripts)
        // .filter((k) => state.animations.scripts[k].enabled)
        .forEach((key) => {
            const script = state.animations.scripts[key];
            const line = script.code.match(/\s*\(((\s*\w+\s*,)+(\s*\w+)?\s*)\)\s*=>/);
            if (!line) {
                console.log(`No match`);
                return null;
            }
            const args = line![1]
                .split(',')
                .map((m) => m.trim())
                .filter(Boolean);
            if (args[0] !== 'paths') {
                console.log('bad args, expected first arg to be "paths"', args);
                return null;
            }

            try {
                const fn = functionWithBuiltins(script.code);
                scripts[key] = {
                    key,
                    fn,
                    args: args.slice(1),
                    // phase: script.phase,
                    // selection: script.selection,
                };
            } catch (err) {
                console.log('Bad fn');
                console.error(err);
                return null;
            }
        });
    return scripts;
}

export function functionWithBuiltins(code: string) {
    const builtins: {[key: string]: Function | number} = getBuiltins();
    const fn = new Function(Object.keys(builtins).join(','), 'return ' + code)(
        ...Object.keys(builtins).map((k) => builtins[k]),
    );
    return fn;
}
