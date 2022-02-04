import { pendingGuide } from './RenderPendingGuide';
import { coordKey } from './calcAllIntersections';
import {
    applyMatrices,
    getTransformsForMirror,
    mirrorTransforms,
} from './getMirrorTransforms';
import { addAction, redoAction, undoAction } from './history';
import { transformSegment } from './points';
import {
    Guide,
    GuideGeom,
    guidePoints,
    Id,
    Mirror,
    Pending,
    PendingPath,
    State,
    Path,
    Style,
    PathGroup,
    PendingGuide,
} from './types';
import {
    Action,
    UndoableAction,
    UndoAction,
    PathCreate,
    PathMultiply,
} from './Action';
import {
    pathsAreIdentical,
    pathToReversedSegmentKeys,
    pathToSegmentKeys,
} from './pathsAreIdentical';
import { simplifyPath } from './insetPath';
import { ensureClockwise } from './pathToPoints';
import { clipPath } from './clipPath';
import { pathToPrimitives } from './findSelection';

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
                        ? {
                              type: 'Guide',
                              kind: action.kind,
                              points: [],
                              extent: 5,
                          }
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
                                    state.pending.extent,
                                ),
                                mirror: state.activeMirror
                                    ? reifyMirror(
                                          state.mirrors,
                                          state.activeMirror,
                                      )
                                    : null,
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
                        [id]: {
                            ...action.mirror,
                            parent:
                                typeof action.mirror.parent === 'string'
                                    ? reifyMirror(
                                          state.mirrors,
                                          action.mirror.parent,
                                      )
                                    : action.mirror.parent,
                            id,
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

        case 'path:multiply': {
            return handlePathMultiply(state, action);
        }
        case 'path:create': {
            return handlePathCreate(state, action);
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
        case 'guide:delete': {
            const guides = { ...state.guides };
            delete guides[action.id];
            return [
                {
                    ...state,
                    guides,
                    selection:
                        state.selection?.type === 'Guide'
                            ? {
                                  type: 'Guide',
                                  ids: state.selection.ids.filter(
                                      (id) => id !== action.id,
                                  ),
                              }
                            : state.selection,
                },
                { type: action.type, action, prev: state.guides[action.id] },
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
        case 'path:delete:many': {
            const paths = { ...state.paths };
            const prev: { [key: Id]: Path } = {};
            action.ids.forEach((id) => {
                prev[id] = paths[id];
                delete paths[id];
            });
            return [
                {
                    ...state,
                    paths,
                    selection:
                        state.selection?.type === 'Path'
                            ? {
                                  type: 'Path',
                                  ids: state.selection.ids.filter(
                                      (id) => !action.ids.includes(id),
                                  ),
                              }
                            : state.selection,
                },
                { type: action.type, action, prev },
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
                            over: false,
                            hide: false,
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
        case 'overlay:update': {
            return [
                {
                    ...state,
                    overlays: {
                        ...state.overlays,
                        [action.overlay.id]: action.overlay,
                    },
                },
                {
                    type: action.type,
                    action,
                    prev: state.overlays[action.overlay.id],
                },
            ];
        }
        case 'pending:extent': {
            if (
                state.pending?.type !== 'Guide' ||
                state.pending.extent == null
            ) {
                return [state, null];
            }
            return [
                {
                    ...state,
                    pending: {
                        ...state.pending,
                        extent: state.pending.extent + action.delta,
                    },
                },
                { type: action.type, action },
            ];
        }
        case 'clip:add': {
            let nextId = state.nextId + 1;
            const id = `id-${state.nextId}`;
            return [
                {
                    ...state,
                    clips: {
                        ...state.clips,
                        [id]: action.clip,
                    },
                    view: { ...state.view, activeClip: id },
                    nextId,
                },
                {
                    type: action.type,
                    action,
                    prevActive: state.view.activeClip,
                    added: [id, state.nextId],
                },
            ];
        }
        case 'group:regroup': {
            const paths = { ...state.paths };
            const touched: { [key: Id]: true } = {};
            const ids =
                action.selection.type === 'Path'
                    ? action.selection.ids
                    : Object.keys(paths).filter((k) =>
                          action.selection.ids.includes(paths[k].group!),
                      );
            let nextId = state.nextId;
            const group = `id-${nextId++}`;
            const prevGroups: { [key: Id]: Id | null } = {};
            ids.forEach((id) => {
                // if (paths[id].group) {
                //     touched[paths[id].group!] = true
                // }
                prevGroups[id] = paths[id].group;
                paths[id] = { ...paths[id], group };
            });
            return [
                {
                    ...state,
                    nextId,
                    selection: { type: 'PathGroup', ids: [group] },
                    paths,
                    pathGroups: {
                        ...state.pathGroups,
                        [group]: {
                            id: group,
                            group: null,
                        },
                    },
                },
                {
                    type: action.type,
                    action,
                    created: [group, state.nextId],
                    prevGroups,
                },
            ];
        }
        case 'clip:cut': {
            const paths: State['paths'] = {};
            const clip = state.clips[action.clip];
            let clipPrims = pathToPrimitives(clip);
            const added: Array<Id> = [];
            const previous: State['paths'] = {};
            Object.keys(state.paths).forEach((k) => {
                const path = state.paths[k];
                const group = path.group ? state.pathGroups[path.group] : null;
                const result = clipPath(path, clip, clipPrims, group?.clipMode);
                // TODO: figure out if the result is the same...
                if (result.length > 0) {
                    paths[k] = result[0];
                }
                if (
                    result.length !== 1 ||
                    pathToSegmentKeys(path.origin, path.segments).join(';') !==
                        pathToSegmentKeys(
                            result[0].origin,
                            result[0].segments,
                        ).join(';')
                ) {
                    previous[k] = state.paths[k];
                }
                if (result.length > 1) {
                    result.slice(1).forEach((path, i) => {
                        const id = `${k}.${i}`;
                        added.push(id);
                        paths[id] = { ...path, id };
                    });
                }
            });
            return [
                { ...state, paths, view: { ...state.view, activeClip: null } },
                { type: action.type, action, paths: previous, added },
            ];
        }
        case 'mirror:delete': {
            const mirrors = { ...state.mirrors };
            delete mirrors[action.id];
            return [
                {
                    ...state,
                    mirrors,
                    activeMirror:
                        state.activeMirror === action.id
                            ? null
                            : state.activeMirror,
                },
                {
                    type: action.type,
                    action,
                    mirror: state.mirrors[action.id],
                    prevActive: state.activeMirror,
                },
            ];
        }
        case 'overlay:delete': {
            const overlays = { ...state.overlays };
            delete overlays[action.id];
            return [
                { ...state, overlays },
                {
                    type: action.type,
                    action,
                    removed: state.overlays[action.id],
                },
            ];
        }
        case 'script:update': {
            const scripts = { ...state.animations.scripts };
            if (!action.script) {
                delete scripts[action.key];
            } else {
                scripts[action.key] = action.script;
            }
            return [
                {
                    ...state,
                    animations: { ...state.animations, scripts },
                },
                {
                    type: action.type,
                    action,
                    prev: state.animations.scripts[action.key],
                },
            ];
        }
        case 'timeline:update': {
            const timeline = { ...state.animations.timeline };
            if (!action.vbl) {
                delete timeline[action.key];
            } else {
                timeline[action.key] = action.vbl;
            }
            return [
                {
                    ...state,
                    animations: { ...state.animations, timeline },
                },
                {
                    type: action.type,
                    action,
                    prev: state.animations.timeline[action.key],
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
        case 'script:update': {
            const scripts = { ...state.animations.scripts };
            if (!action.prev) {
                delete scripts[action.action.key];
            } else {
                scripts[action.action.key] = action.prev;
            }
            return {
                ...state,
                animations: {
                    ...state.animations,
                    scripts,
                },
            };
        }
        case 'timeline:update': {
            const timeline = { ...state.animations.timeline };
            if (!action.prev) {
                delete timeline[action.action.key];
            } else {
                timeline[action.action.key] = action.prev;
            }
            return {
                ...state,
                animations: {
                    ...state.animations,
                    timeline,
                },
            };
        }
        case 'overlay:delete': {
            return {
                ...state,
                overlays: {
                    ...state.overlays,
                    [action.action.id]: action.removed,
                },
            };
        }
        case 'mirror:delete': {
            return {
                ...state,
                mirrors: {
                    ...state.mirrors,
                    [action.action.id]: action.mirror,
                },
                activeMirror: action.prevActive,
            };
        }
        case 'clip:cut': {
            const paths = { ...state.paths, ...action.paths };
            action.added.forEach((k) => {
                delete paths[k];
            });
            return {
                ...state,
                view: {
                    ...state.view,
                    activeClip: action.action.clip,
                },
                paths,
            };
        }
        case 'group:regroup': {
            state = { ...state };
            if (action.created) {
                state.pathGroups = { ...state.pathGroups };
                delete state.pathGroups[action.created[0]];
                state.nextId = action.created[1];
            }
            Object.keys(action.prevGroups).forEach((k) => {
                state.paths[k].group = action.prevGroups[k];
            });
            return state;
        }
        case 'pending:extent': {
            const pending = state.pending as PendingGuide;
            return {
                ...state,
                pending: {
                    ...pending,
                    extent: pending.extent! - action.action.delta,
                },
            };
        }
        case 'overlay:update': {
            return {
                ...state,
                overlays: {
                    ...state.overlays,
                    [action.prev.id]: action.prev,
                },
            };
        }
        case 'clip:add': {
            state = {
                ...state,
                clips: {
                    ...state.clips,
                },
                view: { ...state.view, activeClip: action.prevActive },
                nextId: action.added[1],
            };
            delete state.clips[action.added[0]];
            return state;
        }
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
        case 'path:delete:many':
            return { ...state, paths: { ...state.paths, ...action.prev } };
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
        case 'guide:delete':
            return {
                ...state,
                guides: { ...state.guides, [action.action.id]: action.prev },
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

        case 'path:multiply': {
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

                const sourceIds =
                    action.action.selection.type === 'Path'
                        ? action.action.selection.ids
                        : Object.keys(state.paths).filter(
                              (k) =>
                                  state.paths[k].group &&
                                  action.action.selection.ids.includes(
                                      state.paths[k].group!,
                                  ),
                          );
                sourceIds.forEach((id) => {
                    if (state.paths[id].group === action.added[1]) {
                        state.paths[id].group = null;
                    }
                });
            }

            return state;
        }
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
            state.selection = null;
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

export function handlePathMultiply(
    state: State,
    action: PathMultiply,
): [State, UndoAction | null] {
    let nextId = state.nextId;

    const transforms = getTransformsForMirror(action.mirror, state.mirrors);

    const sourceIds =
        action.selection.type === 'Path'
            ? action.selection.ids
            : Object.keys(state.paths).filter(
                  (k) =>
                      state.paths[k].group &&
                      action.selection.ids.includes(state.paths[k].group!),
              );

    const ids: Array<Id> = [];

    const usedPaths = Object.keys(state.paths).map((k) =>
        pathToSegmentKeys(state.paths[k].origin, state.paths[k].segments),
    );
    // const usedPaths = [pathToSegmentKeys(main.origin, main.segments)];

    state = { ...state, paths: { ...state.paths } };

    let groupId = null as null | Id;

    sourceIds.forEach((id) => {
        const main = state.paths[id];

        if (!main.group) {
            if (!groupId) {
                groupId = `id-${nextId++}`;
                state.pathGroups = {
                    ...state.pathGroups,
                    [groupId]: {
                        group: null,
                        id: groupId,
                    },
                };
            }
            state.paths[id] = {
                ...main,
                group: groupId!,
            };
        }

        transforms.forEach((matrices) => {
            const origin = applyMatrices(main.origin, matrices);
            const segments = main.segments.map((seg) =>
                transformSegment(seg, matrices),
            );
            // TOOD: should I check each prev against my forward & backward,
            // or put both forward & backward into the list?
            // Are they equivalent?
            const forward = pathToSegmentKeys(origin, segments);
            const backward = pathToReversedSegmentKeys(origin, segments);
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
                group: main.group ?? groupId,
                ordering: 0,
                hidden: false,
                created: 0,
                origin,
                segments,
                style: main.group ? main.style : { fills: [], lines: [] },
            };
            ids.push(nid);
        });
    });

    return [
        {
            ...state,
            nextId,
            pending: null,
        },
        {
            type: action.type,
            action,
            added: [ids, groupId, state.nextId],
        },
    ];
}

export function handlePathCreate(
    state: State,
    action: PathCreate,
): [State, UndoAction | null] {
    let nextId = state.nextId;
    const id = `id-${nextId++}`;
    const ids = [id];
    let groupId: string | null = null;
    state = { ...state, paths: { ...state.paths } };

    const style: Style = {
        fills: [{ color: 0 }],
        lines: [{ color: 'white', width: 3 }],
    };
    groupId = `id-${nextId++}`;

    let main: Path = {
        id,
        created: 0,
        group: groupId,
        ordering: 0,
        hidden: false,
        origin: action.origin,
        // simplify it up y'all
        segments: simplifyPath(ensureClockwise(action.segments)),
        style,
    };

    state.pathGroups = {
        ...state.pathGroups,
        [groupId]: {
            group: null,
            id: groupId,
        },
    };

    if (state.activeMirror) {
        const transforms = getTransformsForMirror(
            state.activeMirror,
            state.mirrors,
        );

        const usedPaths = [pathToSegmentKeys(main.origin, main.segments)];

        transforms.forEach((matrices) => {
            const origin = applyMatrices(main.origin, matrices);
            const segments = main.segments.map((seg) =>
                transformSegment(seg, matrices),
            );
            // TOOD: should I check each prev against my forward & backward,
            // or put both forward & backward into the list?
            // Are they equivalent?
            const forward = pathToSegmentKeys(origin, segments);
            const backward = pathToReversedSegmentKeys(origin, segments);
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
                style,
            };
            ids.push(nid);
        });
    }
    state.paths[id] = main;
    return [
        {
            ...state,
            nextId,
            selection: { type: 'PathGroup', ids: [groupId] },
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

export const reifyMirror = (mirrors: { [key: Id]: Mirror }, id: Id): Mirror => {
    let mirror = mirrors[id];
    if (typeof mirror.parent === 'string') {
        mirror = { ...mirror, parent: reifyMirror(mirrors, mirror.parent) };
    }
    return mirror;
};
