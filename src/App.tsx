/* @jsx jsx */
import { jsx } from '@emotion/react';
import React from 'react';
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
import { saveState } from './state/persistence';

import { GCodeEditor } from './gcode/GCodeEditor';
import { HistoryPlayback } from './history/HistoryPlayback';
import { handleKeyboard } from './handleKeyboard';
import { NewSidebar } from './sidebar/NewSidebar';
import { StyleHover } from './editor/MultiStyleForm';

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

export const App = ({ initialState }: { initialState: State }) => {
    const [state, dispatch] = React.useReducer(reducer, initialState);

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

    // @ts-ignore
    window.state = state;

    const latestState = useCurrent(state);

    React.useEffect(() => {
        saveState(state);
    }, [state]);

    const [hover, setHover] = React.useState(null as null | Hover);

    const [styleHover, setStyleHover] = React.useState(
        null as null | StyleHover,
    );

    const [pendingMirror, setPendingMirror] = React.useState(
        null as null | PendingMirror,
    );
    if (pendingMirror && pendingMirror.parent !== state.activeMirror) {
        pendingMirror.parent = state.activeMirror;
    }

    const [pendingDuplication, setPendingDuplication] = React.useState(
        null as null | PendingDuplication,
    );

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

    // Reset when state changes
    React.useEffect(() => {
        setPendingMirror(null);
    }, [state.mirrors, state.guides]);

    const width = Math.min(1000, window.innerWidth);
    const height = Math.min(1000, window.innerHeight);
    const isTouchScreen = 'ontouchstart' in window;

    const [sidebarOverlay, setSidebarOverlay] = React.useState(false);

    const [screen, setScreen] = React.useState('edit' as Screen);

    const [hide, setHide] = React.useState(false);

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
                state={state}
                dispatch={dispatch}
                hover={hover}
                screen={screen}
                setScreen={setScreen}
                setHover={setHover}
                setStyleHover={setStyleHover}
            />
        </div>
    );
};
