import { coordKey, pendingGuide } from './Canvas';
import { applyMatrices, getTransformsForMirror } from './getMirrorTransforms';
import { addAction, redoAction, undoAction } from './history';
import { transformSegment } from './points';
import {
    Action,
    UndoableAction,
    Coord,
    Guide,
    GuideGeom,
    guidePoints,
    Id,
    Mirror,
    Pending,
    PendingPath,
    State,
    UndoAction,
    Path,
    Style,
} from './types';

export const undo = (state: State, action: UndoAction): State => {
    switch (action.type) {
        case 'mirror:active':
            return { ...state, activeMirror: action.prev };
        case 'view:update':
            return { ...state, view: action.prev };
        case 'path:point':
            return { ...state, pending: action.prev };
        case 'path:add':
            if (action.added) {
                state = {
                    ...state,
                    paths: {
                        ...state.paths,
                    },
                    nextId: action.added[2],
                    pending: action.added[3],
                };
                action.added[0].forEach((id) => {
                    delete state.paths[id];
                });
                if (action.added[1]) {
                    state.pathGroups = { ...state.pathGroups };
                    delete state.pathGroups[action.added[1]];
                }
                return state;
            }
            return {
                ...state,
                pending: {
                    ...(state.pending as PendingPath),
                    parts: (state.pending as PendingPath).parts.slice(0, -1),
                },
            };
        case 'pending:type':
            return { ...state, pending: action.prev };
        case 'pending:point': {
            if (action.added) {
                state = {
                    ...state,
                    guides: {
                        ...state.guides,
                    },
                    nextId: action.added[1],
                };
                delete state.guides[action.added[0]];
            }
            return {
                ...state,
                pending: action.pending,
            };
        }
        case 'mirror:change':
            return {
                ...state,
                mirrors: { ...state.mirrors, [action.action.id]: action.prev },
            };
        case 'mirror:add': {
            const mirrors = { ...state.mirrors };
            delete mirrors[action.action.id];
            return { ...state, mirrors };
        }
        case 'guide:update':
            return {
                ...state,
                guides: { ...state.guides, [action.action.id]: action.prev },
            };
        case 'guide:add': {
            const guides = { ...state.guides };
            delete guides[action.action.id];
            return { ...state, guides };
        }
        case 'guide:toggle':
            return {
                ...state,
                guides: {
                    ...state.guides,
                    [action.action.id]: {
                        ...state.guides[action.action.id],
                        active: !state.guides[action.action.id].active,
                    },
                },
            };
    }
};

export const reducer = (state: State, action: Action): State => {
    if (action.type === 'undo') {
        console.log(state.history);
        const [history, lastAction] = undoAction(state.history);
        if (lastAction) {
            return undo({ ...state, history }, lastAction);
        } else {
            console.log(`NOTHING TO UNDO`);
            return state;
        }
    }
    if (action.type === 'redo') {
        const [history, nextAction] = redoAction(state.history);
        if (nextAction) {
            // Soo, should there be some assertion that the newly created UndoAction
            // matches the
            return reduceWithoutUndo({ ...state, history }, nextAction)[0];
        } else {
            console.log('NOTHING TO REDO');
            return state;
        }
    }
    if (action.type === 'reset') {
        return action.state;
    }

    const [newState, newAction] = reduceWithoutUndo(
        state,
        // {
        //     ...state,
        //     history: addAction(state.history, action),
        // },
        action,
    );
    if (!newAction) {
        return newState;
    }
    return { ...newState, history: addAction(newState.history, newAction) };
};

// import * as React from 'react';
export const reduceWithoutUndo = (
    state: State,
    action: UndoableAction,
): [State, UndoAction | null] => {
    switch (action.type) {
        case 'mirror:add':
            return [
                {
                    ...state,
                    mirrors: { ...state.mirrors, [action.id]: action.mirror },
                },
                { type: action.type, action },
            ];
        case 'mirror:change':
            return [
                {
                    ...state,
                    mirrors: { ...state.mirrors, [action.id]: action.mirror },
                },
                { type: action.type, prev: state.mirrors[action.id], action },
            ];
        case 'pending:type':
            return [
                {
                    ...state,
                    pending: action.kind
                        ? { type: 'Guide', kind: action.kind, points: [] }
                        : null,
                },
                { type: action.type, action, prev: state.pending },
            ];
        case 'pending:point': {
            if (!state.pending || state.pending.type !== 'Guide') {
                return [state, null];
            }
            const points = state.pending.points.concat([action.coord]);
            if (points.length >= guidePoints[state.pending.kind]) {
                const id = 'id-' + state.nextId;
                return [
                    {
                        ...state,
                        nextId: state.nextId + 1,
                        pending: null,
                        guides: {
                            ...state.guides,
                            [id]: {
                                id,
                                active: true,
                                basedOn: [],
                                geom: pendingGuide(state.pending.kind, points),
                                mirror: state.activeMirror,
                            },
                        },
                    },
                    {
                        type: action.type,
                        action,
                        added: [id, state.nextId],
                        pending: state.pending,
                    },
                ];
            }
            return [
                {
                    ...state,
                    pending: {
                        ...state.pending,
                        points,
                    },
                },
                {
                    type: action.type,
                    action,
                    pending: state.pending,
                    added: null,
                },
            ];
        }
        case 'guide:add':
            return [
                {
                    ...state,
                    guides: { ...state.guides, [action.id]: action.guide },
                },
                { type: action.type, action },
            ];
        case 'guide:update':
            return [
                {
                    ...state,
                    guides: { ...state.guides, [action.id]: action.guide },
                },
                { type: action.type, action, prev: state.guides[action.id] },
            ];
        case 'guide:toggle':
            return [
                {
                    ...state,
                    guides: {
                        ...state.guides,
                        [action.id]: {
                            ...state.guides[action.id],
                            active: !state.guides[action.id].active,
                        },
                    },
                },
                {
                    type: action.type,
                    action,
                    prev: state.guides[action.id].active,
                },
            ];
        case 'path:point':
            return [
                {
                    ...state,
                    pending: {
                        type: 'Path',
                        origin: action.coord,
                        parts: [],
                    },
                },
                { type: action.type, action, prev: state.pending },
            ];
        case 'path:add':
            if (state.pending?.type !== 'Path') {
                return [state, null];
            }
            if (
                coordKey(action.segment.to.coord) ===
                coordKey(state.pending.origin.coord)
            ) {
                let nextId = state.nextId;
                const id = `id-${nextId++}`;
                const ids = [id];
                let groupId: string | null = null;
                let pending = state.pending;
                state = { ...state, paths: { ...state.paths } };

                const style: Style = {
                    fills: [{ color: 'green' }],
                    lines: [],
                };

                const main: Path = {
                    id,
                    created: 0,
                    group: null,
                    ordering: 0,
                    origin: pending.origin.coord,
                    segments: pending.parts
                        .map((p) => p.segment)
                        .concat([action.segment.segment]),
                    style: {
                        fills: [],
                        lines: [],
                    },
                };
                if (state.activeMirror) {
                    groupId = `id-${nextId++}`;
                    main.group = groupId;
                    const transforms = getTransformsForMirror(
                        state.activeMirror,
                        state.mirrors,
                    );
                    transforms.forEach((matrices) => {
                        let nid = `id-${nextId++}`;
                        state.paths[nid] = {
                            id: nid,
                            group: groupId,
                            ordering: 0,
                            created: 0,
                            origin: applyMatrices(main.origin, matrices),
                            segments: main.segments.map((seg) =>
                                transformSegment(seg, matrices),
                            ),
                            style,
                        };
                        ids.push(nid);
                    });
                    state.pathGroups = {
                        ...state.pathGroups,
                        [groupId]: {
                            group: null,
                            id,
                            // TODO:
                            style: { lines: [], fills: [] },
                        },
                    };
                    // here we gooooo
                } else {
                    main.style = style;
                }
                state.paths[id] = main;

                return [
                    {
                        ...state,
                        nextId,
                        paths: {
                            ...state.paths,
                            [id]: main,
                        },
                        pending: null,
                    },
                    {
                        type: action.type,
                        action,
                        added: [ids, groupId, state.nextId, pending],
                    },
                ];
            }
            return [
                {
                    ...state,
                    pending: {
                        ...state.pending,
                        parts: state.pending.parts.concat([action.segment]),
                    },
                },
                { type: action.type, action, added: null },
            ];
        case 'view:update':
            return [
                { ...state, view: action.view },
                {
                    type: action.type,
                    action,
                    prev: state.view,
                },
            ];
        case 'mirror:active':
            return [
                { ...state, activeMirror: action.id },
                {
                    type: action.type,
                    action,
                    prev: state.activeMirror,
                },
            ];
        default:
            let _x: never = action;
            console.log(`SKIPPING ${(action as any).type}`);
    }
    return [state, null];
};

// export const genId = () => Math.random().toString(36).slice(2);
