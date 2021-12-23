/* @jsx jsx */
import { jsx } from '@emotion/react';
import localforage from 'localforage';
import React from 'react';
import { Canvas } from './Canvas';
import { reducer } from './reducer';
import { Hover, Sidebar } from './Sidebar';
import { Action, Coord, GroupRegroup, GuideGeom, Id, State } from './types';
import { initialState } from './initialState';
import { useDropStateTarget, useDropTarget } from './useDropTarget';
import { CogIcon, IconButton, RedoIcon, UndoIcon } from './icons/Icon';

export const key = `geometric-art`;

export const useCurrent = <T,>(value: T) => {
    const ref = React.useRef(value);
    React.useEffect(() => {
        ref.current = value;
    });
    return ref;
};

export const toType: { [key: string]: GuideGeom['type'] } = {
    l: 'Line',
    c: 'Circle',
    a: 'AngleBisector',
    b: 'PerpendicularBisector',
    p: 'Perpendicular',
    i: 'InCircle',
    o: 'CircumCircle',
};

export const toTypeRev: { [key: string]: string } = {};
Object.keys(toType).forEach((k) => (toTypeRev[toType[k]] = k));

export type PendingMirror = {
    rotations: number;
    center: Coord | null;
    reflect: boolean;
    parent: Id | null;
};

export const App = ({ initialState }: { initialState: State }) => {
    const [state, dispatch] = React.useReducer(reducer, initialState);

    const [dragging, callbacks] = useDropStateTarget(
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
        localforage.setItem(key, JSON.stringify(state));
    }, [state]);

    const [hover, setHover] = React.useState(null as null | Hover);

    const [pendingMirror, setPendingMirror] = React.useState(
        null as null | PendingMirror,
    );

    // const [dragSelect, setDragSelect] = React.useState(false);

    React.useEffect(() => {
        const fn = handleKeyboard(
            latestState,
            dispatch,
            setHover,
            setPendingMirror,
            // setDragSelect,
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

    return (
        <div
            css={{
                padding: 32,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'stretch',
                justifyContent: 'center',
                height: '100vh',
                width: '100vw',
                overflow: 'hidden',
                background: dragging ? 'rgba(255,255,255,0.1)' : '',
                '@media (max-width: 1400px)': {
                    flexDirection: 'column-reverse',
                    overflow: 'visible',
                    height: 'unset',
                },
                '@media (max-width: 1000px)': {
                    padding: 0,
                },
            }}
            {...callbacks}
        >
            <div
                css={{
                    position: 'relative',
                    // display: 'flex',
                    // flexDirection: 'column',
                    alignSelf: 'center',
                }}
            >
                {/* {window.innerWidth > 1000 ? (
                <Sidebar
                    hover={hover}
                    setHover={setHover}
                    dispatch={dispatch}
                    setDragSelect={setDragSelect}
                    dragSelect={dragSelect}
                    state={state}
                    canvasRef={ref}
                    setPendingMirror={setPendingMirror}
                    width={width}
                    height={height}
                />
            ) : null} */}
                <Canvas
                    state={state}
                    hover={hover}
                    setHover={setHover}
                    // dragSelect={dragSelect}
                    // cancelDragSelect={() => setDragSelect(false)}
                    isTouchScreen={isTouchScreen}
                    innerRef={(node) => (ref.current = node)}
                    dispatch={dispatch}
                    pendingMirror={pendingMirror}
                    setPendingMirror={setPendingMirror}
                    width={width}
                    height={height}
                />
                {sidebarOverlay ? (
                    <div
                        css={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            overflow: 'auto',
                            background: 'rgba(0,0,0,0.5)',
                        }}
                    >
                        <Sidebar
                            hover={hover}
                            setHover={setHover}
                            dispatch={dispatch}
                            // setDragSelect={setDragSelect}
                            // dragSelect={dragSelect}
                            state={state}
                            canvasRef={ref}
                            setPendingMirror={setPendingMirror}
                            width={width}
                            height={height}
                        />
                    </div>
                ) : null}

                <div
                    css={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                    }}
                >
                    <IconButton
                        onClick={() => dispatch({ type: 'undo' })}
                        // css={{
                        //     padding: '0 4px',
                        //     fontSize: 40,
                        //     border: 'none',
                        //     cursor: 'pointer',
                        //     backgroundColor: 'transparent',
                        // }}
                        // style={{
                        //     opacity: sidebarOverlay ? 1 : 0.4,
                        // }}
                    >
                        <UndoIcon />
                    </IconButton>
                    <IconButton
                        onClick={() => dispatch({ type: 'redo' })}
                        disabled={state.history.undo === 0}
                        // css={{
                        //     padding: '0 4px',
                        //     fontSize: 40,
                        //     backgroundColor: 'transparent',
                        //     border: 'none',
                        //     cursor: 'pointer',
                        // }}
                        // style={{
                        //     opacity: sidebarOverlay ? 1 : 0.4,
                        // }}
                    >
                        <RedoIcon />
                    </IconButton>
                    <IconButton
                        onClick={() => setSidebarOverlay((m) => !m)}
                        // css={{
                        //     padding: '0 16px',
                        //     fontSize: 40,
                        //     border: 'none',
                        //     cursor: 'pointer',
                        //     color: 'white',
                        //     backgroundColor: 'rgba(0,0,0,0.4)',
                        // }}
                        // style={{
                        //     opacity: sidebarOverlay ? 1 : 0.4,
                        // }}
                    >
                        <CogIcon />
                    </IconButton>
                </div>
            </div>
        </div>
    );
};

export const handleKeyboard = (
    latestState: { current: State },
    dispatch: (action: Action) => void,
    setHover: (hover: Hover | null) => void,
    setPendingMirror: (pending: PendingMirror | null) => void,
    // setDragSelect: (ds: boolean) => void,
) => {
    let tid: null | NodeJS.Timeout = null;
    const hoverMirror = (id: Id, quick: boolean) => {
        setHover({ kind: 'Mirror', id });
        if (tid) {
            clearTimeout(tid);
        }
        tid = setTimeout(
            () => {
                setHover(null);
            },
            quick ? 100 : 1000,
        );
    };

    let prevMirror = latestState.current.activeMirror;

    return (evt: KeyboardEvent) => {
        if (
            evt.target !== document.body &&
            (evt.target instanceof HTMLInputElement ||
                evt.target instanceof HTMLTextAreaElement)
        ) {
            return;
        }
        console.log('key', evt.key);
        if (evt.key === 'M') {
            const ids = Object.keys(latestState.current.mirrors);
            let id = ids[0];
            if (latestState.current.activeMirror) {
                const idx = ids.indexOf(latestState.current.activeMirror);
                id = ids[(idx + 1) % ids.length];
            }
            dispatch({ type: 'mirror:active', id });
            hoverMirror(id, false);
            return;
        }
        if ((evt.key === 'm' || evt.key === 'µ') && evt.altKey) {
            console.log('ok');
            if (latestState.current.activeMirror) {
                prevMirror = latestState.current.activeMirror;
                hoverMirror(prevMirror, true);
                dispatch({ type: 'mirror:active', id: null });
            } else if (prevMirror) {
                dispatch({ type: 'mirror:active', id: prevMirror });
                hoverMirror(prevMirror, false);
            } else {
                const id = Object.keys(latestState.current.mirrors)[0];
                dispatch({
                    type: 'mirror:active',
                    id: id,
                });
                hoverMirror(id, false);
            }
            return;
        }
        if (evt.key === 'm') {
            setPendingMirror({
                parent: latestState.current.activeMirror,
                rotations: 3,
                reflect: true,
                center: null,
            });
        }
        if (evt.key === 'a' && (evt.ctrlKey || evt.metaKey)) {
            evt.preventDefault();
            evt.stopPropagation();
            return dispatch({
                type: 'selection:set',
                selection: {
                    type: 'PathGroup',
                    ids: Object.keys(latestState.current.pathGroups),
                },
            });
        }
        if (evt.key === 'Delete' || evt.key === 'Backspace') {
            console.log('ok', latestState.current.selection?.type);
            if (latestState.current.selection?.type === 'Guide') {
                // TODO: make a group:deletee:many
                latestState.current.selection.ids.forEach((id) => {
                    dispatch({
                        type: 'guide:delete',
                        id,
                    });
                });
                return;
            }
            if (latestState.current.selection?.type === 'Path') {
                return dispatch({
                    type: 'path:delete:many',
                    ids: latestState.current.selection.ids,
                });
            }
            if (latestState.current.selection?.type === 'PathGroup') {
                return latestState.current.selection.ids.forEach((id) =>
                    dispatch({
                        type: 'group:delete',
                        id,
                    }),
                );
            }
        }
        if (evt.key === 'g') {
            if (evt.metaKey || evt.ctrlKey) {
                evt.preventDefault();
                evt.stopPropagation();
                const { selection } = latestState.current;
                if (
                    selection?.type !== 'PathGroup' &&
                    selection?.type !== 'Path'
                ) {
                    return;
                }
                return dispatch({
                    type: 'group:regroup',
                    selection: latestState.current
                        .selection as GroupRegroup['selection'],
                });
            }
            return dispatch({
                type: 'view:update',
                view: {
                    ...latestState.current.view,
                    guides: !latestState.current.view.guides,
                },
            });
        }
        if (evt.key === 'Escape') {
            if (latestState.current.pending) {
                return dispatch({ type: 'pending:type', kind: null });
            }
            if (latestState.current.selection) {
                return dispatch({ type: 'selection:set', selection: null });
            }
        }
        if (evt.key === 'z' && (evt.ctrlKey || evt.metaKey)) {
            evt.preventDefault();
            evt.stopPropagation();
            return dispatch({ type: evt.shiftKey ? 'redo' : 'undo' });
        }
        if (evt.key === 'y' && (evt.ctrlKey || evt.metaKey)) {
            evt.stopPropagation();
            evt.preventDefault();
            return dispatch({ type: 'redo' });
        }
        if (evt.key === 'd') {
            // setDragSelect(true);
        }
        if (toType[evt.key]) {
            dispatch({
                type: 'pending:type',
                kind: toType[evt.key],
            });
        }
    };
};
