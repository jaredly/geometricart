/* @jsx jsx */
import { jsx } from '@emotion/react';
import React from 'react';
import { Canvas, pendingGuide } from './Canvas';
import { MirrorForm } from './Forms';
import {
    Coord,
    Guide,
    GuideGeom,
    guidePoints,
    guideTypes,
    Id,
    initialState,
    Mirror,
    State,
} from './types';
// import * as React from 'react';

export type Action =
    | { type: 'guide:update'; id: Id; guide: Guide }
    | { type: 'guide:add'; id: Id; guide: Guide }
    | { type: 'mirror:add'; id: Id; mirror: Mirror }
    | { type: 'mirror:change'; id: Id; mirror: Mirror }
    | { type: 'pending:point'; coord: Coord }
    | { type: 'pending:type'; kind: GuideGeom['type'] }
    | { type: 'guide:toggle'; id: Id };

export const genId = () => Math.random().toString(36).slice(2);

export const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case 'mirror:add':
        case 'mirror:change':
            return {
                ...state,
                mirrors: { ...state.mirrors, [action.id]: action.mirror },
            };
        case 'pending:type':
            return {
                ...state,
                pendingGuide: { type: action.kind, points: [] },
            };
        case 'pending:point': {
            if (!state.pendingGuide) {
                return state;
            }
            const points = state.pendingGuide.points.concat([action.coord]);
            if (points.length >= guidePoints[state.pendingGuide.type]) {
                const id = genId();
                return {
                    ...state,
                    pendingGuide: null,
                    guides: {
                        ...state.guides,
                        [id]: {
                            id,
                            active: true,
                            basedOn: [],
                            geom: pendingGuide(state.pendingGuide.type, points),
                            mirror: state.activeMirror,
                        },
                    },
                };
            }
            return {
                ...state,
                pendingGuide: {
                    ...state.pendingGuide,
                    points,
                },
            };
        }
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
        default:
            console.log(`SKIPPING ${action.type}`);
    }
    return state;
};

export const App = () => {
    const [state, dispatch] = React.useReducer(reducer, initialState);

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
            if (toType[evt.key]) {
                dispatch({ type: 'pending:type', kind: toType[evt.key] });
            }
        };
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, []);

    return (
        <div
            css={{
                padding: 32,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
            }}
        >
            <div>
                Hello folks
                {guideTypes.map((kind) => (
                    <button
                        onClick={() => {
                            dispatch({ type: 'pending:type', kind });
                        }}
                        key={kind}
                    >
                        {kind}
                    </button>
                ))}
                {Object.keys(state.mirrors).map((k) => (
                    <MirrorForm
                        key={k}
                        mirror={state.mirrors[k]}
                        onChange={(mirror) =>
                            dispatch({ type: 'mirror:change', mirror, id: k })
                        }
                    />
                ))}
            </div>
            <Canvas
                state={state}
                dispatch={dispatch}
                width={1000}
                height={1000}
            />
        </div>
    );
};
