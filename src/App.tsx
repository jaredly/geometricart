/* @jsx jsx */
import { jsx } from '@emotion/react';
import localforage from 'localforage';
import React from 'react';
import { Canvas } from './Canvas';
import { reducer } from './reducer';
import { Hover, Sidebar } from './Sidebar';
import { GuideGeom, Id, State } from './types';
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
    p: 'PerpendicularBisector',
    i: 'InCircle',
    m: 'CircumCircle',
};

export const toTypeRev: { [key: string]: string } = {};
Object.keys(toType).forEach((k) => (toTypeRev[toType[k]] = k));

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
            if (evt.target !== document.body) {
                return;
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
                return dispatch({ type: 'pending:type', kind: null });
            }
            if (evt.key === 'z' && (evt.ctrlKey || evt.metaKey)) {
                evt.preventDefault();
                return dispatch({ type: evt.shiftKey ? 'redo' : 'undo' });
            }
            if (evt.key === 'y' && (evt.ctrlKey || evt.metaKey)) {
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
            />
            <Canvas
                state={state}
                hover={hover}
                innerRef={(node) => (ref.current = node)}
                dispatch={dispatch}
                width={1000}
                height={1000}
            />
        </div>
    );
};
