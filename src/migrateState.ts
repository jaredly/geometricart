import { ensureClockwise } from './pathToPoints';
import { initialState } from './initialState';
import { simplifyPath } from './insetPath';
import { combineStyles } from './Canvas';
import { State, Path, PathGroup } from './types';

export const migrateState = (state: State) => {
    if (!state.version) {
        // @ts-ignore
        state.version = 1;
        if (!state.overlays) {
            state.overlays = {};
            state.attachments = {};
        }
        if (!state.palettes) {
            state.palettes = {};
            state.tab = 'Guides';
            state.selection = null;
        }
        if (!state.activePalette) {
            state.palettes['default'] = initialState.palettes['default'];
            state.activePalette = 'default';
        }
        if (!state.meta) {
            state.meta = {
                created: Date.now(),
                title: '',
                description: '',
                ppi: 170,
            };
        }
    }
    if (!state.overlays) {
        state.overlays = {};
        // @ts-ignore
        delete state.underlays;
    }
    if (state.version < 2) {
        Object.keys(state.paths).forEach((k) => {
            state.paths[k] = {
                ...state.paths[k],
                segments: simplifyPath(
                    ensureClockwise(state.paths[k].segments),
                ),
            };
        });
        // @ts-ignore
        state.version = 2;
    }
    if (state.version < 3) {
        // @ts-ignore
        state.version = 3;
        if ((state.view as any).clip) {
            state.clips = {
                migrated: (state.view as any).clip,
            };
            state.view.activeClip = 'migrated';
            // @ts-ignore
            delete state.view.clip;
        } else {
            state.clips = {};
            state.view.activeClip = null;
        }
    }
    if (state.version < 4) {
        Object.keys(state.paths).forEach((k) => {
            const path = state.paths[k];
            if (path.group) {
                path.style = combinedPathStyles(path, state.pathGroups);
            }
        });

        Object.keys(state.pathGroups).forEach((k) => {
            const group = state.pathGroups[k];
            // @ts-ignore
            delete group.style;
        });
    }
    if (state.version < 5) {
        state.animations = {
            // @ts-ignore
            timeline: {},
            scripts: {},
        };
    }
    if (state.version < 6) {
        state.version = 6;
        // @ts-ignore
        state.animations.lerps = state.animations.timeline;
        // @ts-ignore
        delete state.animations.timeline;
    }
    if (state.meta.ppi == null) {
        state.meta.ppi = 170;
    }
    return state;
};
function combinedPathStyles(path: Path, groups: { [key: string]: PathGroup }) {
    const styles = [path.style];
    if (path.group) {
        let group = groups[path.group];
        // @ts-ignore
        styles.unshift(group.style);
        while (group.group) {
            group = groups[group.group];
            // @ts-ignore
            styles.unshift(group.style);
        }
    }
    const style = combineStyles(styles);
    return style;
}
