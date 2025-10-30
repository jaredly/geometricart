import {initialState} from '../state/initialState';
import {State} from '../types';

export const gcodeStateSuffix = (state: State) =>
    '\n;; ** STATE **\n;; ' +
    JSON.stringify({
        ...state,
        history: initialState.history,
    });
