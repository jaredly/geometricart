import {undoAction} from '../editor/history';
import {coordsEqual} from '../rendering/pathsAreIdentical';
import {Action, UndoAction} from '../state/Action';
import {undo} from '../state/reducer';
import {State, View} from '../types';

export type ViewPoints = {
    idx: number;
    view: Pick<View, 'zoom' | 'center'>;
};

export const mergeViewPoints = (vp: ViewPoints[], zooms?: ViewPoints[]) => {
    const one = vp.map((v) => ({v, from: 'vp'})).concat(zooms?.map((v) => ({v, from: 'zp'})) ?? []);
    return one
        .sort((a, b) =>
            a.v.idx === b.v.idx
                ? a.from !== b.from
                    ? a.from === 'vp'
                        ? -1
                        : 1
                    : 0
                : a.v.idx - b.v.idx,
        )
        .map((v) => v.v);
};

export function findViewPoints(histories: StateAndAction[]) {
    let points: ViewPoints[] = [];
    histories.forEach((item, i) => {
        let prev = points.length ? points[points.length - 1] : null;
        if (
            !prev ||
            prev.view.zoom !== item.state.view.zoom ||
            !coordsEqual(item.state.view.center, prev.view.center)
        ) {
            points.push({
                view: {
                    zoom: item.state.view.zoom,
                    center: item.state.view.center,
                },
                idx: i,
            });
        }
    });
    return points;
}

export function getHistoriesList(state: State, overrideZoom?: boolean) {
    let states: StateAndAction[] = [];
    let current = state;
    while (true) {
        const [history, action] = undoAction(current.history);
        if (!action) {
            states.unshift({state: current, action: null, undo: null});
            break;
        }
        states.unshift({
            state: overrideZoom
                ? {
                      ...current,
                      view: {...current.view, zoom: state.view.zoom},
                  }
                : current,
            action: action.action,
            undo: action,
        });
        current = undo({...current, history}, action);
    }
    const simple = simplifyHistory(
        states,
        state.historyView?.preapplyPathUpdates ?? false,
        state.historyView?.hideOverlays ?? false,
    );
    return simple.slice(state.historyView?.start ?? 0, state.historyView?.end ?? simple.length);
}

export type StateAndAction = {
    state: State;
    action: Action | null;
    undo: UndoAction | null;
};

export function simplifyHistory(
    history: StateAndAction[],
    preapplyPathUpdates: boolean,
    hideOverlays: boolean,
): StateAndAction[] {
    // Remove pending guides that end up being cancelled.
    let result: StateAndAction[] = [];
    for (let i = 0; i < history.length; i++) {
        const {action} = history[i];
        if (!action) {
            result.push(history[i]);
            continue;
        }
        if (
            hideOverlays &&
            (action.type === 'overlay:add' ||
                action.type === 'overlay:update' ||
                action.type === 'overlay:delete')
        ) {
            continue;
        }
        if (action.type === 'pending:type' && action.kind === null) {
            const toRemove: number[] = [];
            for (let j = result.length - 1; j >= 0; j--) {
                const {action} = result[j];
                if (!action) {
                    continue;
                }
                if (action.type === 'pending:point') {
                    toRemove.push(j);
                    continue;
                }
                if (action.type === 'pending:type') {
                    toRemove.push(j);
                    break;
                }
            }
            result = result.filter((_, j) => !toRemove.includes(j));
            continue;
        }
        // Skip some?
        if (action.type === 'mirror:active' || action.type === 'pending:extent') {
            continue;
        }
        // Collapse all view updates.
        if (action.type === 'view:update' && result.length) {
            const last = result[result.length - 1];
            if (last.action?.type === 'view:update') {
                result[result.length - 1] = history[i];
                continue;
            }
        }

        if (action.type === 'path:delete:many' && preapplyPathUpdates) {
            result.forEach((item) => {
                action.ids.forEach((id) => {
                    delete item.state.paths[id];
                });
            });
            continue;
        }

        if (action.type === 'path:delete' && preapplyPathUpdates) {
            result.forEach((item) => {
                delete item.state.paths[action.id];
            });
            continue;
        }

        if (action.type === 'group:delete' && preapplyPathUpdates) {
            result.forEach((item) => {
                Object.keys(item.state.paths).forEach((id) => {
                    if (item.state.paths[id].group === action.id) {
                        delete item.state.paths[id];
                    }
                });
            });
            continue;
        }

        // Collapse path updates
        if (action.type === 'path:update' && preapplyPathUpdates) {
            result.forEach((item) => {
                if (item.state.paths[action.id]) {
                    item.state.paths[action.id] = action.path;
                }
            });
            continue;
        }
        if (action.type === 'path:update:many' && preapplyPathUpdates) {
            result.forEach((item) => {
                Object.entries(action.changed).forEach(([id, path]) => {
                    if (!path) delete item.state.paths[id];
                    else if (item.state.paths[id]) {
                        item.state.paths[id] = path;
                    }
                });
            });
            continue;
        }

        result.push(history[i]);
    }
    if (hideOverlays) {
        result.forEach((item) => {
            item.state.overlays = {};
        });
    }
    return result;
}