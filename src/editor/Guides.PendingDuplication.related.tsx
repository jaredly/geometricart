import React from 'react';
import {Action, PathMultiply} from '../state/Action';
import {Coord, Intersect, State} from '../types';

export type PendingDuplication = {
    reflect: boolean;
    p0: Coord | null;
};

export const handleDuplicationIntersection = (
    coord: Intersect,
    state: State,
    duplication: PendingDuplication,
    setPendingDuplication: (pd: PendingDuplication | null) => void,
    dispatch: React.Dispatch<Action>,
) => {
    if (!['Path', 'PathGroup'].includes(state.selection?.type ?? '')) {
        console.log('um selection idk what', state.selection);
        return;
    }
    if (duplication.reflect && !duplication.p0) {
        console.log('got a p0', coord.coord);
        setPendingDuplication({
            reflect: true,
            p0: coord.coord,
        });
        return;
    }
    setPendingDuplication(null);
    dispatch({
        type: 'path:multiply',
        selection: state.selection as PathMultiply['selection'],
        mirror: {
            id: 'tmp',
            origin: coord.coord,
            parent: null,
            point: duplication.p0 ?? {
                x: 100,
                y: 0,
            },
            reflect: duplication.reflect,
            rotational: duplication.reflect ? [] : [true],
        },
    });
};
