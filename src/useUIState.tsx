import React from 'react';
import { reducer } from './state/reducer';
import { Hover } from './editor/Sidebar';
import { Coord, Id, State } from './types';
import { PendingDuplication } from './editor/Guides';
import { StyleHover } from './editor/MultiStyleForm';
import { Action } from './state/Action';

export type UIState = {
    screen: Screen;
    clipboard?:
        | { type: 'circle'; radius: number }
        | {
              type: 'line';
              dx: number;
              dy: number;
          }; // ooh I could do whole shapes here folks
    hover: null | Hover;
    styleHover: null | StyleHover;
    pendingMirror: null | PendingMirror;
    pendingDuplication: null | PendingDuplication;
    previewActions: Action[];
};

export const applyActions = (actions: Action[], state: State) => {
    for (let action of actions) {
        state = reducer(state, action);
    }
    return state;
};

export type PendingMirror = {
    rotations: number;
    center: Coord | null;
    reflect: boolean;
    parent: Id | null;
};
export type Screen =
    | 'edit'
    | 'animate'
    | 'gcode'
    | 'history'
    | 'overlay'
    | '3d';

type UIAction =
    | { type: 'screen'; screen: UIState['screen'] }
    | { type: 'hover'; hover: UIState['hover'] }
    | { type: 'styleHover'; styleHover: UIState['styleHover'] }
    | {
          type: 'pendingMirror';
          pendingMirror:
              | UIState['pendingMirror']
              | ((
                    previous: UIState['pendingMirror'],
                ) => UIState['pendingMirror']);
      }
    | {
          type: 'pendingDuplication';
          pendingDuplication: UIState['pendingDuplication'];
      }
    | {
          type: 'previewActions';
          previewActions:
              | UIState['previewActions']
              | ((
                    previous: UIState['previewActions'],
                ) => UIState['previewActions']);
      };
const reduceUIState = (state: UIState, action: UIAction): UIState => {
    switch (action.type) {
        case 'screen':
            return { ...state, screen: action.screen };
        case 'hover':
            return { ...state, hover: action.hover };
        case 'styleHover':
            return { ...state, styleHover: action.styleHover };
        case 'pendingMirror':
            return {
                ...state,
                pendingMirror:
                    typeof action.pendingMirror === 'function'
                        ? action.pendingMirror(state.pendingMirror)
                        : action.pendingMirror,
            };
        case 'pendingDuplication':
            return { ...state, pendingDuplication: action.pendingDuplication };
        case 'previewActions':
            return {
                ...state,
                previewActions:
                    typeof action.previewActions === 'function'
                        ? action.previewActions(state.previewActions)
                        : action.previewActions,
            };
    }
    return state;
};
export type UIDispatch = React.Dispatch<UIAction>;

export const useUIState = (trueState: State) => {
    const [uiState, uiDispatch] = React.useReducer(reduceUIState, {
        screen: 'edit', // 'history', // 'edit',
        hover: null,
        styleHover: null,
        pendingMirror: null,
        pendingDuplication: null,
        previewActions: [],
    });

    const updateUIState = <T,>(attr: keyof UIState): ((value: T) => void) => {
        return (value: T) => {
            uiDispatch({ type: attr, [attr]: value } as any);
        };
    };

    const setScreen = React.useCallback(
        updateUIState<UIState['screen']>('screen'),
        [],
    );
    const setHover = React.useCallback(
        updateUIState<UIState['hover']>('hover'),
        [],
    );
    const setStyleHover = React.useCallback(
        updateUIState<UIState['styleHover']>('styleHover'),
        [],
    );
    const setPendingMirror = React.useCallback(
        (
            pendingMirror: Extract<
                UIAction,
                { type: 'pendingMirror' }
            >['pendingMirror'],
        ) => uiDispatch({ type: 'pendingMirror', pendingMirror }),
        [],
    );
    const setPendingDuplication = React.useCallback(
        updateUIState<UIState['pendingDuplication']>('pendingDuplication'),
        [],
    );
    const setPreviewActions = React.useCallback(
        (
            previewActions: Extract<
                UIAction,
                { type: 'previewActions' }
            >['previewActions'],
        ) => uiDispatch({ type: 'previewActions', previewActions }),
        [],
    );
    const state = applyActions(uiState.previewActions, trueState);

    // Reset when state changes
    React.useEffect(() => {
        setPendingMirror(null);
    }, [state.mirrors, state.guides]);

    if (
        uiState.pendingMirror &&
        uiState.pendingMirror.parent !== state.activeMirror
    ) {
        uiState.pendingMirror.parent = state.activeMirror;
    }

    return {
        uiState,
        uiSetters: React.useMemo(
            () => ({
                setScreen,
                setHover,
                setStyleHover,
                setPendingMirror,
                setPendingDuplication,
                setPreviewActions,
            }),
            [],
        ),
        uiDispatch,
        state,
    };
};
