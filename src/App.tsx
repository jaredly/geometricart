/* @jsx jsx */
import { jsx } from '@emotion/react';
import React from 'react';
import { Canvas } from './Canvas';
import { reducer } from './reducer';
import { Sidebar } from './Sidebar';
import { GuideGeom, initialState } from './types';

export const App = () => {
    const [state, dispatch] = React.useReducer(reducer, initialState);

    // const currentState = React.useRef(state);
    // currentState.current = state;

    React.useEffect(() => {
        const toType: { [key: string]: GuideGeom['type'] } = {
            l: 'Line',
            c: 'Circle',
            a: 'AngleBisector',
            p: 'PerpendicularBisector',
        };
        const fn = (evt: KeyboardEvent) => {
            if (evt.target !== document.body) {
                return;
            }
            if (evt.key === 'Escape') {
                return dispatch({ type: 'pending:type', kind: null });
            }
            if (evt.key === 'z' && (evt.ctrlKey || evt.metaKey)) {
                return dispatch({ type: evt.shiftKey ? 'redo' : 'undo' });
            }
            if (evt.key === 'y' && (evt.ctrlKey || evt.metaKey)) {
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

    return (
        <div
            css={{
                padding: 32,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
            }}
        >
            <Sidebar dispatch={dispatch} state={state} canvasRef={ref} />
            <Canvas
                state={state}
                innerRef={(node) => (ref.current = node)}
                dispatch={dispatch}
                width={1000}
                height={1000}
            />
        </div>
    );
};
