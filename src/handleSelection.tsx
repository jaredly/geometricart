import { Path, State } from './types';
import { Action } from './Action';

export const handleSelection = (
    path: Path,
    state: State,
    dispatch: (a: Action) => void,
    shiftKey: boolean,
) => {
    if (shiftKey && state.selection) {
        // ugh
        // I'll want to be able to select both paths
        // and pathgroups.
        // because what if this thing doesn't have a group
        // we're out of luck
        if (state.selection.type === 'PathGroup') {
            if (!path.group) {
                return; // ugh
            }
            if (state.selection.ids.includes(path.group)) {
                dispatch({
                    type: 'selection:set',
                    selection: {
                        type: 'PathGroup',
                        ids: state.selection.ids.filter(
                            (id) => id !== path.group,
                        ),
                    },
                });
            } else {
                dispatch({
                    type: 'selection:set',
                    selection: {
                        type: 'PathGroup',
                        ids: state.selection.ids.concat([path.group]),
                    },
                });
            }
        }
        if (state.selection.type === 'Path') {
            if (state.selection.ids.includes(path.id)) {
                dispatch({
                    type: 'selection:set',
                    selection: {
                        type: 'Path',
                        ids: state.selection.ids.filter((id) => id !== path.id),
                    },
                });
            } else {
                dispatch({
                    type: 'selection:set',
                    selection: {
                        type: 'Path',
                        ids: state.selection.ids.concat([path.id]),
                    },
                });
            }
        }
        return;
    }
    if (
        path.group &&
        !(
            state.selection?.type === 'PathGroup' &&
            state.selection.ids.includes(path.group)
        )
    ) {
        dispatch({
            type: 'tab:set',
            tab: 'PathGroups',
        });
        dispatch({
            type: 'selection:set',
            selection: {
                type: 'PathGroup',
                ids: [path.group],
            },
        });
    } else {
        dispatch({
            type: 'tab:set',
            tab: 'Paths',
        });
        dispatch({
            type: 'selection:set',
            selection: {
                type: 'Path',
                ids: [path.id],
            },
        });
    }
};
