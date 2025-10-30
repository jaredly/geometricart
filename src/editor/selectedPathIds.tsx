import {State} from '../types';

export const selectedPathIds = (state: State) => {
    if (state.selection?.type === 'PathGroup' || state.selection?.type === 'Path') {
        return state.selection.type === 'PathGroup'
            ? Object.keys(state.paths).filter((k) =>
                  state.selection!.ids.includes(state.paths[k].group!),
              )
            : state.selection.ids;
    }
    return [];
};
