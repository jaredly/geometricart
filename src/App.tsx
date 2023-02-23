/* @jsx jsx */
import { jsx } from '@emotion/react';
import React, { useState } from 'react';
import { Canvas } from './editor/Canvas';
import { reducer } from './state/reducer';
import { Hover } from './editor/Sidebar';
import { Coord, Id, State } from './types';
import {
    getStateFromFile,
    useDropStateOrAttachmentTarget,
} from './editor/useDropTarget';
import { AnimationEditor } from './animation/AnimationUI';
import { PendingDuplication } from './editor/Guides';

import { GCodeEditor } from './gcode/GCodeEditor';
import { HistoryPlayback } from './history/HistoryPlayback';
import { handleKeyboard } from './handleKeyboard';
import { NewSidebar } from './sidebar/NewSidebar';
import { StyleHover } from './editor/MultiStyleForm';
import { saveState } from './run';
import { SaveDest } from './MirrorPicker';
import dayjs from 'dayjs';
import { Action } from './state/Action';

export const useCurrent = <T,>(value: T) => {
    const ref = React.useRef(value);
    React.useEffect(() => {
        ref.current = value;
    });
    return ref;
};

export type PendingMirror = {
    rotations: number;
    center: Coord | null;
    reflect: boolean;
    parent: Id | null;
};
export type Screen = 'edit' | 'animate' | 'gcode' | 'history';

export const applyActions = (actions: Action[], state: State) => {
    for (let action of actions) {
        state = reducer(state, action);
    }
    return state;
};

export type UIState = {
    screen: Screen;
    hover: null | Hover;
    styleHover: null | StyleHover;
    pendingMirror: null | PendingMirror;
    pendingDuplication: null | PendingDuplication;
    previewActions: Action[];
};

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

export const useUIState = (trueState: State) => {
    const [uiState, uiDispatch] = React.useReducer(reduceUIState, {
        screen: 'edit',
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
        uiSetters: {
            setScreen,
            setHover,
            setStyleHover,
            setPendingMirror,
            setPendingDuplication,
            setPreviewActions,
        },
        uiDispatch,
        state,
    };
};

export const App = ({
    initialState,
    dest,
    id,
}: {
    dest: SaveDest;
    initialState: State;
    id: string;
}) => {
    const [trueState, dispatch] = React.useReducer(reducer, initialState);
    const [lastSaved, setLastSaved] = React.useState({
        when: Date.now(),
        dirty: null as null | true | (() => void),
        id,
    });

    const { uiState, uiSetters, state } = useUIState(trueState);

    const { screen, hover, styleHover, pendingMirror, pendingDuplication } =
        uiState;

    const {
        setScreen,
        setHover,
        setStyleHover,
        setPendingMirror,
        setPendingDuplication,
        setPreviewActions,
    } = uiSetters;

    // @ts-ignore
    window.state = state;

    usePreventNavAway(lastSaved);
    useHandlePaste(dispatch);

    const [dragging, callbacks] = useDropStateOrAttachmentTarget(
        (state) => dispatch({ type: 'reset', state }),
        (name, src, width, height) => {
            const id = Math.random().toString(36).slice(2);
            dispatch({
                type: 'attachment:add',
                attachment: {
                    id,
                    contents: src,
                    height,
                    width,
                    name,
                },
                id,
            });
            dispatch({
                type: 'overlay:add',
                attachment: id,
            });
        },
    );

    useSaveState(state, initialState, dest, setLastSaved, id);

    const latestState = useCurrent(state);
    const currentPendingDuplication = useCurrent(pendingDuplication);
    React.useEffect(() => {
        const fn = handleKeyboard(
            latestState,
            dispatch,
            setHover,
            setPendingMirror,
            currentPendingDuplication,
            setPendingDuplication,
        );
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, []);

    const ref = React.useRef(null as null | SVGSVGElement);

    const width = Math.min(1000, window.innerWidth);
    const height = Math.min(1000, window.innerHeight);
    const isTouchScreen = 'ontouchstart' in window;

    return (
        <div
            css={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'stretch',
                justifyContent: 'center',
                height: '100vh',
                width: '100vw',
                overflow: 'auto',
                background: dragging
                    ? 'rgba(255,255,255,0.1)'
                    : 'var(--surface-ground)',
                '@media (max-width: 1400px)': {
                    flexDirection: 'column-reverse',
                    overflow: 'visible',
                    height: 'unset',
                },
            }}
            {...callbacks}
        >
            <div
                css={{
                    position: 'relative',
                    alignSelf: 'stretch',
                    '@media (max-width: 1000px)': {
                        padding: 0,
                    },
                }}
            >
                {screen === 'animate' ? (
                    <AnimationEditor state={state} dispatch={dispatch} />
                ) : screen === 'gcode' ? (
                    <GCodeEditor
                        state={state}
                        dispatch={dispatch}
                        canvasProps={{
                            hover,
                            setHover,
                            pendingDuplication,
                            setPendingDuplication,
                            isTouchScreen,
                            pendingMirror,
                            setPendingMirror,
                            state,
                            dispatch,
                            width: 100,
                            height: 100,
                            styleHover,
                        }}
                    />
                ) : screen === 'history' ? (
                    <HistoryPlayback state={state} />
                ) : (
                    <Canvas
                        state={state}
                        hover={hover}
                        setHover={setHover}
                        pendingDuplication={pendingDuplication}
                        setPendingDuplication={setPendingDuplication}
                        isTouchScreen={isTouchScreen}
                        innerRef={(node) => (ref.current = node)}
                        dispatch={dispatch}
                        pendingMirror={pendingMirror}
                        setPendingMirror={setPendingMirror}
                        width={width}
                        height={height}
                        styleHover={styleHover}
                    />
                )}
            </div>
            <NewSidebar
                state={trueState}
                dispatch={dispatch}
                lastSaved={dest.type === 'gist' ? lastSaved : null}
                setPreviewActions={setPreviewActions}
                hover={hover}
                screen={screen}
                setScreen={setScreen}
                setHover={setHover}
                setStyleHover={setStyleHover}
            />
        </div>
    );
};

/**
 * Debounce a function.
 */
let tid: NodeJS.Timeout | null = null;
export const debounce = (
    fn: () => Promise<void>,
    time: number,
): (() => void) => {
    if (tid != null) {
        clearTimeout(tid);
    }
    tid = setTimeout(() => {
        tid = null;
        fn();
    }, time);
    return () => {
        if (tid != null) {
            clearTimeout(tid);
            tid = null;
            fn();
        }
    };
    // lol
    // if (!bounce) {
    //     setTimeout(() => {
    //         bounce && bounce();
    //         bounce = null;
    //     }, time);
    // }
    // bounce = () => {
    //     bounce = null;
    //     fn();
    // };
};
function useHandlePaste(dispatch: React.Dispatch<Action>) {
    React.useEffect(() => {
        const fn = (evt: ClipboardEvent) => {
            if (document.activeElement !== document.body) {
                return;
            }
            if (evt.clipboardData?.files.length) {
                getStateFromFile(
                    evt.clipboardData.files[0],
                    (state) => {
                        if (state) {
                            dispatch({ type: 'reset', state });
                        }
                    },
                    (name, src, width, height) => {
                        const id = Math.random().toString(36).slice(2);
                        dispatch({
                            type: 'attachment:add',
                            attachment: {
                                id,
                                contents: src,
                                height,
                                width,
                                name,
                            },
                            id,
                        });
                        dispatch({
                            type: 'overlay:add',
                            attachment: id,
                        });
                    },
                    (err) => {
                        console.log(err);
                        alert(err);
                    },
                );
            }
        };
        document.addEventListener('paste', fn);
        return () => document.removeEventListener('paste', fn);
    });
}

function usePreventNavAway(lastSaved: {
    when: number;
    dirty: true | (() => void) | null;
    id: string;
}) {
    React.useEffect(() => {
        if (lastSaved.dirty) {
            const fn = (evt: BeforeUnloadEvent) => {
                evt.preventDefault();
                evt.stopPropagation();
                return (evt.returnValue = 'Are you sure?');
            };
            window.addEventListener('beforeunload', fn, { capture: true });
            return () =>
                window.removeEventListener('beforeunload', fn, {
                    capture: true,
                });
        }
    }, [lastSaved.dirty]);
}

function useSaveState(
    state: State,
    initialState: State,
    dest: SaveDest,
    setLastSaved: React.Dispatch<
        React.SetStateAction<{
            when: number;
            dirty: true | (() => void) | null;
            id: string;
        }>
    >,
    id: string,
) {
    let firstChange = React.useRef(false);
    React.useEffect(() => {
        if (firstChange.current || state !== initialState) {
            firstChange.current = true;
            if (dest.type === 'gist') {
                const force = debounce(() => {
                    setLastSaved((s) => ({ ...s, dirty: true }));
                    return saveState(state, id, dest).then(() => {
                        setLastSaved({ when: Date.now(), dirty: null, id });
                    });
                }, 10000);
                setLastSaved((s) => ({ ...s, dirty: force }));
            } else {
                saveState(state, id, dest);
            }
        }
    }, [state]);
}
