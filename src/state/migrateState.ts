import { ensureClockwise } from '../rendering/pathToPoints';
import { initialState } from './initialState';
import { simplifyPath } from '../rendering/simplifyPath';
import { combineStyles } from '../editor/Canvas';
import { State, Path, PathGroup } from '../types';

export const maybeMigrate = (state: State | undefined): State | undefined => {
    if (!state) {
        return state;
    }
    migrateState(state);
    return state;
};

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
            state.tab = 'Undo';
            state.selection = null;
        }
        // @ts-ignore
        if (!state.activePalette) {
            state.palettes['default'] = initialState.palettes['default'];
            // @ts-ignore
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
            // @ts-ignore
            state.view.activeClip = 'migrated';
            // @ts-ignore
            delete state.view.clip;
        } else {
            state.clips = {};
            // @ts-ignore
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
        // @ts-ignore
        state.animations.lerps = state.animations.timeline;
        // @ts-ignore
        delete state.animations.timeline;
    }
    if (state.version < 7) {
        state.animations.config = initialState.animations.config;
    }
    if (state.version < 8) {
        state.animations.timelines = Object.keys(state.animations.scripts).map(
            (id) => ({
                enabled: true,
                items: [
                    {
                        // @ts-ignore
                        enabled: state.animations.scripts[id].enabled,
                        weight: 1,
                        contents: {
                            type: 'script',
                            custom: {},
                            scriptId: id,
                            // @ts-ignore
                            phase: state.animations.scripts[id].phase,
                            // @ts-ignore
                            selection: state.animations.scripts[id].selection,
                        },
                    },
                ],
            }),
        );
    }
    if (state.meta.ppi == null) {
        state.meta.ppi = 170;
    }
    if (state.version < 9) {
        state.gcode = { items: [], clearHeight: 5, pauseHeight: 30 };
    }
    if (state.version < 10) {
        // @ts-ignore
        state.palette = state.palettes[state.activePalette];
        // @ts-ignore
        delete state.activePalette;
    }
    if (state.version < 11) {
        Object.keys(state.clips).forEach((k) => {
            const shape = state.clips[k] as any;
            // @ts-ignore
            const active = state.view.activeClip;
            state.clips[k] = {
                shape,
                active: active === k,
                outside: false,
            };
        });
    }
    if (state.version < 12) {
        state.tilings = {};
    }
    state.version = 12;
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
