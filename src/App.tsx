/* @jsx jsx */
import { jsx } from '@emotion/react';
import React from 'react';
import { Canvas } from './Canvas';
import { Guide, Id, initialState, Mirror, State } from './types';
// import * as React from 'react';

export type Action =
    | { type: 'guide:update'; id: Id; guide: Guide }
    | { type: 'guide:add'; id: Id; guide: Guide }
    | { type: 'mirror:add'; id: Id; guide: Mirror }
    | { type: 'guide:toggle'; id: Id };

export const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case 'guide:add':
        case 'guide:update':
            return {
                ...state,
                guides: { ...state.guides, [action.id]: action.guide },
            };
        case 'guide:toggle':
            return {
                ...state,
                guides: {
                    ...state.guides,
                    [action.id]: {
                        ...state.guides[action.id],
                        active: !state.guides[action.id].active,
                    },
                },
            };
    }
    return state;
};

export const App = () => {
    const [state, dispatch] = React.useReducer(reducer, initialState);
    return (
        <div
            css={{
                padding: 32,
            }}
        >
            Hello folks
            <Canvas
                state={state}
                dispatch={dispatch}
                width={1000}
                height={1000}
            />
        </div>
    );
};
