/* @jsx jsx */
import { jsx } from '@emotion/react';
import localforage from 'localforage';
import React from 'react';
import { Canvas } from './Canvas';
import { reducer } from './reducer';
import { Hover, Sidebar } from './Sidebar';
import { Coord, GuideGeom, Id, State } from './types';
import { initialState } from './initialState';
import { useDropTarget } from './useDropTarget';

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
    m: 'CircumCircle',
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

    // @ts-ignore
    window.state = state;

    const latestState = useCurrent(state);

    React.useEffect(() => {
        localforage.setItem(key, JSON.stringify(state));
    }, [state]);

    React.useEffect(() => {
        const fn = (evt: KeyboardEvent) => {
            if (
                evt.target !== document.body &&
                (evt.target instanceof HTMLInputElement ||
                    evt.target instanceof HTMLTextAreaElement)
            ) {
                return;
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
            if (toType[evt.key]) {
                dispatch({
                    type: 'pending:type',
                    kind: toType[evt.key],
                });
            }
        };
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, []);

    const ref = React.useRef(null as null | SVGSVGElement);

    const [hover, setHover] = React.useState(null as null | Hover);

    const [pendingMirror, setPendingMirror] = React.useState(
        null as null | PendingMirror,
    );

    // Reset when state changes
    React.useEffect(() => {
        setPendingMirror(null);
    }, [state.mirrors, state.guides]);

    return (
        <div
            css={{
                padding: 32,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'stretch',
                height: '100vh',
                width: '100vw',
                overflow: 'hidden',
                '@media (max-width: 1400px)': {
                    flexDirection: 'column-reverse',
                    overflow: 'visible',
                    height: 'unset',
                },
            }}
        >
            <Sidebar
                hover={hover}
                setHover={setHover}
                dispatch={dispatch}
                state={state}
                canvasRef={ref}
                setPendingMirror={setPendingMirror}
            />
            <Canvas
                state={state}
                hover={hover}
                innerRef={(node) => (ref.current = node)}
                dispatch={dispatch}
                pendingMirror={pendingMirror}
                setPendingMirror={setPendingMirror}
                width={1000}
                height={1000}
            />
        </div>
    );
};
