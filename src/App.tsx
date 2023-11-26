/* @jsx jsx */
import { jsx } from '@emotion/react';
import React from 'react';
import { Canvas } from './editor/Canvas';
import { reducer } from './state/reducer';
import { State } from './types';
import {
    getStateFromFile,
    useDropStateOrAttachmentTarget,
} from './editor/useDropTarget';
import { AnimationEditor } from './animation/AnimationUI';

import { GCodeEditor } from './gcode/GCodeEditor';
import { HistoryPlayback } from './history/HistoryPlayback';
import { handleKeyboard } from './handleKeyboard';
import { NewSidebar } from './sidebar/NewSidebar';
import { Action } from './state/Action';
import { useUIState } from './useUIState';
import { OverlayEditor } from './OverelayEditor';

export const useCurrent = <T,>(value: T) => {
    const ref = React.useRef(value);
    React.useEffect(() => {
        ref.current = value;
    });
    return ref;
};

export const App = ({
    initialState,
    saveState,
    lastSaved,
    closeFile,
}: {
    closeFile: () => unknown;
    initialState: State;
    saveState: (state: State) => unknown;
    lastSaved: {
        when: number;
        dirty: null | true | (() => void);
        id: string;
    } | null;
}) => {
    const [trueState, dispatch] = React.useReducer(reducer, initialState);

    const { uiState, uiSetters, uiDispatch, state } = useUIState(trueState);

    const { screen, hover, styleHover, pendingMirror, pendingDuplication } =
        uiState;

    const { setHover, setPendingMirror, setPendingDuplication } = uiSetters;

    // @ts-ignore
    window.state = state;

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

    useSaveState(state, initialState, saveState);

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
                            uiState,
                            // TODO replace with uiState & uiDispatch
                            hover,
                            pendingDuplication,
                            pendingMirror,
                            styleHover,
                            setHover,
                            setPendingDuplication,
                            setPendingMirror,

                            isTouchScreen,
                            state,
                            dispatch,
                            width: 100,
                            height: 100,
                        }}
                    />
                ) : screen === 'history' ? (
                    <HistoryPlayback state={state} dispatch={dispatch} />
                ) : screen === 'overlay' ? (
                    <OverlayEditor state={state} dispatch={dispatch} />
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
                        uiState={uiState}
                    />
                )}
            </div>
            <NewSidebar
                closeFile={closeFile}
                state={trueState}
                dispatch={dispatch}
                lastSaved={lastSaved}
                uiDispatch={uiDispatch}
                uiState={uiState}
            />
        </div>
    );
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

function useSaveState(
    state: State,
    initialState: State,
    saveState: (state: State) => unknown,
) {
    let firstChange = React.useRef(false);
    React.useEffect(() => {
        if (firstChange.current || state !== initialState) {
            firstChange.current = true;
            saveState(state);
        }
    }, [state]);
}
