import Prando from 'prando';
import React from 'react';
import {useRef} from 'react';
import {sortedVisibleInsetPaths} from '../rendering/sortedVisibleInsetPaths';
import {State} from '../types';
import {PKInsetCache, getClips} from '../rendering/pkInsetPaths';

export function usePathsToShow(state: State) {
    const selectedIds = React.useMemo(() => {
        return getSelectedIds(state.paths, state.selection);
    }, [state.selection, state.paths]);

    const rand = React.useRef(new Prando('ok'));
    rand.current.reset();

    const insetCache = useRef({} as PKInsetCache);

    let {res: pathsToShow, clip} = React.useMemo(() => {
        const clip = getClips(state);
        const now = performance.now();
        const res = sortedVisibleInsetPaths(
            state.paths,
            state.pathGroups,
            rand.current,
            clip,
            state.view.hideDuplicatePaths,
            state.view.laserCutMode ? state.palette : undefined,
            undefined,
            selectedIds,
            insetCache.current,
        );
        return {res, clip};
    }, [
        state.paths,
        state.pathGroups,
        state.clips,
        state.view.hideDuplicatePaths,
        state.view.laserCutMode,
        selectedIds,
    ]);
    return {pathsToShow, selectedIds, clip, rand};
}

export function getSelectedIds(paths: State['paths'], selection: State['selection']) {
    const selectedIds: {[key: string]: boolean} = {};
    if (selection?.type === 'Path') {
        selection.ids.forEach((id) => (selectedIds[id] = true));
    } else if (selection?.type === 'PathGroup') {
        Object.keys(paths).forEach((id) => {
            if (selection!.ids.includes(paths[id].group!)) {
                selectedIds[id] = true;
            }
        });
    }
    return selectedIds;
}
