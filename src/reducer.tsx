import { pendingGuide } from './RenderPendingGuide';
import { coordKey } from './calcAllIntersections';
import { applyMatrices, getTransformsForMirror } from './getMirrorTransforms';
import { addAction, redoAction, undoAction } from './history';
import { transformSegment } from './points';
import {
    Action,
    UndoableAction,
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
    PathGroup,
} from './types';
import {
    pathsAreIdentical,
    pathToReversedSegmentKeys,
    pathToSegmentKeys,
} from './pathsAreIdentical';

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
    if (action.type === 'selection:set') {
        if (action.selection?.ids.length == 0) {
            return { ...state, selection: null };
        }
        return { ...state, selection: action.selection };
    }
    if (action.type === 'tab:set') {
        return { ...state, tab: action.tab };
    }
    if (action.type === 'attachment:add') {
        return {
            ...state,
            attachments: {
                ...state.attachments,
                [action.id]: action.attachment,
            },
        };
    }
    if (action.type === 'palette:rename') {
        const palettes = { ...state.palettes };
        palettes[action.new] = palettes[action.old];
        delete palettes[action.old];
        return { ...state, palettes };
    }
    if (action.type === 'palette:update') {
        return {
            ...state,
            palettes: { ...state.palettes, [action.name]: action.colors },
        };
    }
    if (action.type === 'palette:select') {
        return { ...state, activePalette: action.name };
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
                                geom: pendingGuide(
                                    state.pending.kind,
                                    points,
                                    action.shiftKey,
                                ),
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

        case 'mirror:add': {
            let nextId = state.nextId + 1;
            const id = `id-${state.nextId}`;
            return [
                {
                    ...state,
                    mirrors: {
                        ...state.mirrors,
                        [id]: { ...action.mirror, id },
                    },
                    nextId,
                },
                {
                    type: action.type,
                    action,
                    added: [id, state.nextId],
                },
            ];
        }

        case 'path:create': {
            let nextId = state.nextId;
            const id = `id-${nextId++}`;
            const ids = [id];
            let groupId: string | null = null;
            state = { ...state, paths: { ...state.paths } };

            const style: Style = {
                fills: [{ color: 0 }],
                lines: [{ color: 'white', width: 3 }],
            };

            const main: Path = {
                id,
                created: 0,
                group: null,
                ordering: 0,
                hidden: false,
                origin: action.origin,
                segments: action.segments,
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

                const usedPaths = [
                    pathToSegmentKeys(action.origin, action.segments),
                ];

                transforms.forEach((matrices) => {
                    const origin = applyMatrices(main.origin, matrices);
                    const segments = main.segments.map((seg) =>
                        transformSegment(seg, matrices),
                    );
                    // TOOD: should I check each prev against my forward & backward,
                    // or put both forward & backward into the list?
                    // Are they equivalent?
                    const forward = pathToSegmentKeys(origin, segments);
                    const backward = pathToReversedSegmentKeys(
                        origin,
                        segments,
                    );
                    if (
                        usedPaths.some(
                            (path) =>
                                pathsAreIdentical(path, backward) ||
                                pathsAreIdentical(path, forward),
                        )
                    ) {
                        return;
                    }
                    usedPaths.push(forward);
                    let nid = `id-${nextId++}`;
                    state.paths[nid] = {
                        id: nid,
                        group: groupId,
                        ordering: 0,
                        hidden: false,
                        created: 0,
                        origin,
                        segments,
                        style: {
                            lines: [],
                            fills: [],
                        },
                    };
                    ids.push(nid);
                });
                state.pathGroups = {
                    ...state.pathGroups,
                    [groupId]: {
                        group: null,
                        id: groupId,
                        style,
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
                    added: [ids, groupId, state.nextId],
                },
            ];
        }
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
        case 'group:update':
            return [
                {
                    ...state,
                    pathGroups: {
                        ...state.pathGroups,
                        [action.id]: action.group,
                    },
                },
                {
                    type: action.type,
                    action,
                    prev: state.pathGroups[action.id],
                },
            ];
        case 'path:update':
            return [
                {
                    ...state,
                    paths: {
                        ...state.paths,
                        [action.id]: action.path,
                    },
                },
                {
                    type: action.type,
                    action,
                    prev: state.paths[action.id],
                },
            ];
        case 'pathGroup:update:many': {
            const prev: { [key: string]: PathGroup } = {};
            Object.keys(action.changed).forEach((id) => {
                prev[id] = state.pathGroups[id];
            });
            return [
                {
                    ...state,
                    pathGroups: { ...state.pathGroups, ...action.changed },
                },
                {
                    type: action.type,
                    action,
                    prev,
                },
            ];
        }
        case 'path:update:many': {
            const prev: { [key: string]: Path } = {};
            Object.keys(action.changed).forEach((id) => {
                prev[id] = state.paths[id];
            });
            return [
                { ...state, paths: { ...state.paths, ...action.changed } },
                {
                    type: action.type,
                    action,
                    prev,
                },
            ];
        }
        case 'meta:update': {
            return [
                { ...state, meta: action.meta },
                { type: action.type, action, prev: state.meta },
            ];
        }
        case 'path:delete': {
            const paths = { ...state.paths };
            delete paths[action.id];
            return [
                {
                    ...state,
                    paths,
                    selection:
                        state.selection?.type === 'Path'
                            ? {
                                  type: 'Path',
                                  ids: state.selection.ids.filter(
                                      (id) => id !== action.id,
                                  ),
                              }
                            : state.selection,
                },
                { type: action.type, action, path: state.paths[action.id] },
            ];
        }
        case 'group:delete': {
            const paths = { ...state.paths };
            const dpaths: { [key: Id]: Path } = {};
            Object.keys(paths).forEach((k) => {
                if (paths[k].group === action.id) {
                    dpaths[k] = paths[k];
                    delete paths[k];
                }
            });
            const pathGroups = { ...state.pathGroups };
            delete pathGroups[action.id];
            return [
                {
                    ...state,
                    pathGroups,
                    paths,
                    selection:
                        state.selection?.type === 'PathGroup'
                            ? {
                                  type: 'PathGroup',
                                  ids: state.selection.ids.filter(
                                      (id) => id !== action.id,
                                  ),
                              }
                            : state.selection,
                },
                {
                    type: action.type,
                    action,
                    paths: dpaths,
                    group: state.pathGroups[action.id],
                },
            ];
        }
        case 'overlay:add': {
            let nextId = state.nextId + 1;
            const id = `id-${state.nextId}`;
            return [
                {
                    ...state,
                    overlays: {
                        ...state.overlays,
                        [id]: {
                            id,
                            center: { x: 0, y: 0 },
                            opacity: 0.5,
                            over: true,
                            scale: { x: 1, y: 1 },
                            source: action.attachment,
                        },
                    },
                    nextId,
                },
                {
                    type: action.type,
                    action,
                    added: [id, state.nextId],
                },
            ];
        }
        default:
            let _x: never = action;
            console.log(`SKIPPING ${(action as any).type}`);
    }
    return [state, null];
};

export const undo = (state: State, action: UndoAction): State => {
    switch (action.type) {
        case 'overlay:add': {
            state = {
                ...state,
                overlays: {
                    ...state.overlays,
                },
                nextId: action.added[1],
            };
            delete state.overlays[action.added[0]];
            return state;
        }
        case 'path:update:many':
            return { ...state, paths: { ...state.paths, ...action.prev } };
        case 'pathGroup:update:many':
            return {
                ...state,
                pathGroups: { ...state.pathGroups, ...action.prev },
            };
        case 'group:delete':
            return {
                ...state,
                pathGroups: {
                    ...state.pathGroups,
                    [action.action.id]: action.group,
                },
                paths: {
                    ...state.paths,
                    ...action.paths,
                },
            };
        case 'path:delete':
            return {
                ...state,
                paths: { ...state.paths, [action.action.id]: action.path },
            };
        case 'meta:update':
            return { ...state, meta: action.prev };
        case 'path:update':
            return {
                ...state,
                paths: {
                    ...state.paths,
                    [action.action.id]: action.prev,
                },
            };
        case 'group:update':
            return {
                ...state,
                pathGroups: {
                    ...state.pathGroups,
                    [action.action.id]: action.prev,
                },
            };
        case 'mirror:active':
            return { ...state, activeMirror: action.prev };
        case 'view:update':
            return { ...state, view: action.prev };

        case 'path:create': {
            state = {
                ...state,
                paths: {
                    ...state.paths,
                },
                nextId: action.added[2],
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
            delete mirrors[action.added[0]];
            return { ...state, mirrors, nextId: action.added[1] };
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
