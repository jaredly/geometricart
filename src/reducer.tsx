import { pendingGuide } from './Canvas';
import {
    Coord,
    Guide,
    GuideGeom,
    guidePoints,
    Id,
    Mirror,
    State,
} from './types';

// import * as React from 'react';
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
            console.log(`SKIPPING ${(action as any).type}`);
    }
    return state;
};

export const genId = () => Math.random().toString(36).slice(2);

export type Action =
    | { type: 'guide:update'; id: Id; guide: Guide }
    | { type: 'guide:add'; id: Id; guide: Guide }
    | { type: 'mirror:add'; id: Id; mirror: Mirror }
    | { type: 'mirror:change'; id: Id; mirror: Mirror }
    | { type: 'pending:point'; coord: Coord }
    | { type: 'pending:type'; kind: GuideGeom['type'] }
    | { type: 'guide:toggle'; id: Id };
