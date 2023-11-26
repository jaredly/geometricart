import { pendingGuide } from '../editor/RenderPendingGuide';
import { coordKey } from '../rendering/coordKey';
import {
    Matrix,
    applyMatrices,
    getTransformsForMirror,
    mirrorTransforms,
    rotationMatrix,
    scaleMatrix,
} from '../rendering/getMirrorTransforms';
import { addAction, redoAction, undoAction } from '../editor/history';
import { transformPath, transformSegment } from '../rendering/points';
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
    TimelineLane,
    Coord,
} from '../types';
import {
    Action,
    UndoableAction,
    UndoAction,
    PathCreate,
    PathMultiply,
    AddRemoveEdit,
    UndoAddRemoveEdit,
    ScriptRename,
    PathCreateMany,
    GlobalTransform,
} from './Action';
import {
    pathsAreIdentical,
    pathToReversedSegmentKeys,
    pathToSegmentKeys,
} from '../rendering/pathsAreIdentical';
import { simplifyPath } from '../rendering/simplifyPath';
import { ensureClockwise } from '../rendering/pathToPoints';
import { clipPath } from '../rendering/clipPath';
import { pathToPrimitives } from '../editor/findSelection';
import { styleMatches } from '../editor/MultiStyleForm';
import {
    transformGuide,
    transformGuideGeom,
    transformMirror,
} from '../rendering/calculateGuideElements';

export const reducer = (state: State, action: Action): State => {
    if (action.type === 'undo') {
        // console.log(state.history);
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
    if (action.type === 'attachment:update') {
        return {
            ...state,
            attachments: {
                ...state.attachments,
                [action.id]: {
                    ...state.attachments[action.id],
                    ...action.attachment,
                },
            },
        };
    }
    if (action.type === 'library:palette:rename') {
        const palettes = { ...state.palettes };
        palettes[action.new] = palettes[action.old];
        delete palettes[action.old];
        return { ...state, palettes };
    }
    if (action.type === 'library:palette:update') {
        return {
            ...state,
            palettes: { ...state.palettes, [action.name]: action.colors },
        };
    }
    if (action.type === 'select:same') {
        const ids = Object.keys(state.paths).filter((id) => {
            const path = state.paths[id];
            if (action.line) {
                if (
                    path.style.lines.find(
                        (line) => line && styleMatches(line, action.line!),
                    ) != null
                ) {
                    return true;
                }
            }
        });
        return ids.length
            ? { ...state, selection: { type: 'Path', ids } }
            : state;
    }
    // if (action.type === 'library:palette:select') {
    //     return { ...state, activePalette: action.name };
    // }

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
    // console.log('🤔 an action', action);
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
                        selection: { type: 'Guide', ids: [id] },
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
            // console.log('select it up', action.id);
            return [
                {
                    ...state,
                    guides: { ...state.guides, [action.id]: action.guide },
                    selection: {
                        type: 'Guide',
                        ids: [action.id],
                    },
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

        case 'tiling:add': {
            let nextId = state.nextId + 1;
            const id = `id-${state.nextId}`;
            return [
                {
                    ...state,
                    nextId,
                    tilings: {
                        ...state.tilings,
                        [id]: {
                            shape: action.shape,
                            cache: action.cache,
                            id,
                        },
                    },
                },
                { type: action.type, action, added: [id, state.nextId] },
            ];
        }

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
                    activeMirror: action.activate ? id : state.activeMirror,
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
        case 'path:create':
        case 'path:create:many': {
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
                if (state.paths[id]) {
                    prev[id] = state.paths[id];
                }
            });
            const paths = { ...state.paths };
            Object.keys(action.changed).forEach((id) => {
                const ch = action.changed[id];
                if (ch == null) {
                    delete paths[id];
                } else {
                    paths[id] = ch;
                }
            });
            return [
                { ...state, paths, nextId: action.nextId ?? state.nextId },
                { type: action.type, action, prev, prevNextId: state.nextId },
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
                        [id]: {
                            shape: action.clip,
                            active: true,
                            outside: false,
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
            let clipPrims = pathToPrimitives(clip.shape);
            const added: Array<Id> = [];
            const previous: State['paths'] = {};
            Object.keys(state.paths).forEach((k) => {
                const path = state.paths[k];
                const group = path.group ? state.pathGroups[path.group] : null;
                const result = clipPath(
                    path,
                    clip.shape,
                    clipPrims,
                    group?.clipMode,
                );
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
                {
                    ...state,
                    paths,
                    clips: {
                        ...state.clips,
                        [action.clip]: {
                            ...state.clips[action.clip],
                            active: false,
                        },
                    },
                },
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
            const timeline = { ...state.animations.lerps };
            if (!action.vbl) {
                delete timeline[action.key];
            } else {
                timeline[action.key] = action.vbl;
            }
            return [
                {
                    ...state,
                    animations: { ...state.animations, lerps: timeline },
                },
                {
                    type: action.type,
                    action,
                    prev: state.animations.lerps[action.key],
                },
            ];
        }
        case 'animation:config': {
            return [
                {
                    ...state,
                    animations: { ...state.animations, config: action.config },
                },
                { type: action.type, action, prev: state.animations.config },
            ];
        }
        case 'gcode:item:are': {
            const [items, undo] = handleListARE(
                action.item,
                state.gcode.items.slice(),
                {
                    type: 'path',
                    color: 'black',
                    speed: 500,
                    depth: 1.5,
                    start: 0,
                },
            );
            return [
                { ...state, gcode: { ...state.gcode, items: items } },
                { type: action.type, action, undo },
            ];
        }
        case 'timeline:lane:are': {
            const [timelines, undo] = handleListARE(
                action.action,
                state.animations.timelines.slice(),
                {
                    enabled: true,
                    items: [
                        {
                            weight: 1,
                            enabled: true,
                            contents: { type: 'spacer' },
                        },
                    ],
                },
            );
            return [
                { ...state, animations: { ...state.animations, timelines } },
                { type: action.type, action, undo },
            ];
        }
        case 'timeline:slot:are': {
            const [timline, undo] = handleListARE(
                action.action,
                state.animations.timelines[action.timeline].items.slice(),
                { contents: { type: 'spacer' }, weight: 1, enabled: true },
            );
            const timelines = state.animations.timelines.slice();
            timelines[action.timeline] = {
                ...timelines[action.timeline],
                items: timline,
            };
            return [
                { ...state, animations: { ...state.animations, timelines } },
                { type: action.type, action, undo },
            ];
        }
        case 'script:rename': {
            if (
                state.animations.scripts[action.newKey] ||
                !state.animations.scripts[action.key]
            ) {
                console.warn(`Name already taken or old doesnt exist`);
                return [state, null];
            }
            const scripts = { ...state.animations.scripts };
            scripts[action.newKey] = scripts[action.key];
            delete scripts[action.key];
            const timelines = renameScriptInTimelines(
                state.animations.timelines,
                action.key,
                action.newKey,
            );
            return [
                {
                    ...state,
                    animations: { ...state.animations, scripts, timelines },
                },
                { type: action.type, action },
            ];
        }
        case 'gcode:config':
            const prev: Partial<State['gcode']> = {};
            Object.keys(action.config).forEach((k) => {
                // @ts-ignore
                prev[k] = state.gcode[k];
            });
            return [
                { ...state, gcode: { ...state.gcode, ...action.config } },
                { type: action.type, action, prev },
            ];
        case 'gcode:item:order': {
            const items = state.gcode.items.slice();
            const item = items.splice(action.oldIndex, 1)[0];
            items.splice(action.newIndex, 0, item);
            return [
                { ...state, gcode: { ...state.gcode, items } },
                { type: action.type, action },
            ];
        }
        case 'palette:update': {
            return [
                { ...state, palette: action.colors },
                { type: action.type, action, prev: state.palette },
            ];
        }
        case 'clip:update': {
            return [
                {
                    ...state,
                    clips: { ...state.clips, [action.id]: action.clip },
                },
                { type: action.type, action, prev: state.clips[action.id] },
            ];
        }
        case 'global:transform': {
            const mx: Matrix[] = transformMatrix(action);
            return [transformState(state, mx), { type: action.type, action }];
        }
        case 'tiling:update': {
            return [
                {
                    ...state,
                    tilings: {
                        ...state.tilings,
                        [action.tiling.id]: action.tiling,
                    },
                },
                {
                    type: action.type,
                    action,
                    prev: state.tilings[action.tiling.id],
                },
            ];
        }
        case 'tiling:delete': {
            const ts = { ...state.tilings };
            delete ts[action.id];
            return [
                {
                    ...state,
                    tilings: ts,
                },
                {
                    type: action.type,
                    action,
                    removed: state.tilings[action.id],
                },
            ];
        }
        case 'history-view:update':
            return [
                { ...state, historyView: action.view },
                { type: action.type, action, prev: state.historyView },
            ];
        default:
            let _x: never = action;
            console.log(`SKIPPING ${(action as any).type}`);
    }
    return [state, null];
};

export const undo = (state: State, action: UndoAction): State => {
    switch (action.type) {
        case 'history-view:update':
            return { ...state, historyView: action.prev };
        case 'tiling:update':
            return {
                ...state,
                tilings: { ...state.tilings, [action.prev.id]: action.prev },
            };
        case 'tiling:delete':
            return {
                ...state,
                tilings: {
                    ...state.tilings,
                    [action.action.id]: action.removed,
                },
            };
        case 'global:transform': {
            const mx: Matrix[] = transformMatrix(action.action, true);
            return transformState(state, mx);
        }
        case 'clip:update':
            return {
                ...state,
                clips: { ...state.clips, [action.action.id]: action.prev },
            };
        case 'palette:update':
            return { ...state, palette: action.prev };
        case 'gcode:config':
            return { ...state, gcode: { ...state.gcode, ...action.prev } };
        case 'gcode:item:order': {
            const items = state.gcode.items.slice();
            const item = items.splice(action.action.newIndex, 1)[0];
            items.splice(action.action.oldIndex, 0, item);
            return { ...state, gcode: { ...state.gcode, items } };
        }
        case 'script:rename': {
            const scripts = { ...state.animations.scripts };
            scripts[action.action.key] = scripts[action.action.newKey];
            delete scripts[action.action.newKey];
            const timelines = renameScriptInTimelines(
                state.animations.timelines,
                action.action.newKey,
                action.action.key,
            );
            return {
                ...state,
                animations: { ...state.animations, scripts, timelines },
            };
        }
        case 'gcode:item:are': {
            return {
                ...state,
                gcode: {
                    ...state.gcode,
                    items: undoListARE(action.undo, state.gcode.items.slice()),
                },
            };
        }
        case 'timeline:slot:are': {
            const timelines = state.animations.timelines.slice();
            const idx = action.action.timeline;
            timelines[idx] = {
                ...timelines[idx],
                items: undoListARE(action.undo, timelines[idx].items.slice()),
            };
            return { ...state, animations: { ...state.animations, timelines } };
        }
        case 'timeline:lane:are': {
            return {
                ...state,
                animations: {
                    ...state.animations,
                    timelines: undoListARE(
                        action.undo,
                        state.animations.timelines.slice(),
                    ),
                },
            };
        }
        case 'animation:config': {
            return {
                ...state,
                animations: { ...state.animations, config: action.prev },
            };
        }
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
            const timeline = { ...state.animations.lerps };
            if (!action.prev) {
                delete timeline[action.action.key];
            } else {
                timeline[action.action.key] = action.prev;
            }
            return {
                ...state,
                animations: {
                    ...state.animations,
                    lerps: timeline,
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
                clips: {
                    ...state.clips,
                    [action.action.clip]: {
                        ...state.clips[action.action.clip],
                        active: true,
                    },
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
        case 'path:update:many': {
            const paths = { ...state.paths };
            Object.keys(action.prev).forEach((id) => {
                if (action.prev[id]) {
                    paths[id] = action.prev[id];
                }
            });
            return {
                ...state,
                paths,
                nextId: action.prevNextId ?? state.nextId,
            };
        }
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

        case 'path:create':
        case 'path:create:many': {
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
        case 'tiling:add': {
            const tilings = { ...state.tilings };
            delete tilings[action.added[0]];
            return { ...state, tilings, nextId: action.added[1] };
        }
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

function renameScriptInTimelines(
    timelines: Array<TimelineLane>,
    key: string,
    newKey: string,
) {
    return timelines.map((tl) => {
        return {
            ...tl,
            items: tl.items.map((item) =>
                item.contents.type === 'script' &&
                item.contents.scriptId === key
                    ? {
                          ...item,
                          contents: {
                              ...item.contents,
                              scriptId: newKey,
                          },
                      }
                    : item,
            ),
        };
    });
}

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
    origAction: PathCreateMany | PathCreate,
): [State, UndoAction | null] {
    const action: PathCreateMany =
        origAction.type === 'path:create:many'
            ? origAction
            : {
                  type: 'path:create:many',
                  paths: [
                      {
                          origin: origAction.origin,
                          segments: origAction.segments,
                      },
                  ],
                  withMirror: true,
              };

    if (!action.paths.length) {
        return [state, null];
    }
    // console.log('creating', action.paths);
    state = {
        ...state,
        paths: { ...state.paths },
        pathGroups: { ...state.pathGroups },
    };
    let nextId = state.nextId;

    const ids: string[] = [];

    let groupId: string = `id-${nextId++}`;
    state.pathGroups[groupId] = {
        group: null,
        id: groupId,
    };

    action.paths.forEach(({ origin, segments, open }) => {
        const id = `id-${nextId++}`;
        ids.push(id);

        const style: Style = {
            fills: action.trace ? [] : [{ color: 1 }],
            lines: [{ color: 'white', width: 0 }],
        };

        let main: Path = {
            id,
            created: 0,
            group: groupId,
            ordering: 0,
            hidden: false,
            origin,
            open,
            // simplify it up y'all
            segments: simplifyPath(ensureClockwise(segments)),
            style,
        };

        if (state.activeMirror && action.withMirror) {
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
                    open: main.open,
                    created: 0,
                    origin,
                    segments,
                    style,
                };
                // console.log(state.paths[nid]);
                ids.push(nid);
            });
        }
        state.paths[id] = main;
        // console.log(state.paths[id]);
    });
    return [
        {
            ...state,
            nextId,
            selection: { type: 'PathGroup', ids: [groupId] },
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

export const handleARE = <T, Key, Result>(
    are: AddRemoveEdit<T, Key>,
    handlers: {
        add: (key: Key, value?: T) => Result;
        edit: (key: Key, value: Partial<T>) => [Result, T];
        remove: (key: Key) => [Result, T];
    },
): [Result, UndoAddRemoveEdit<T, Key>] => {
    if (are.type === 'add') {
        return [
            handlers.add(are.key, are.value),
            { type: 'add', key: are.key },
        ];
    } else if (are.type === 'edit') {
        const [state, prev] = handlers.edit(are.key, are.value);
        return [state, { type: 'edit', prev, key: are.key }];
    } else {
        const [state, prev] = handlers.remove(are.key);
        return [state, { type: 'remove', prev, key: are.key }];
    }
};

export const undoListARE = <T,>(
    are: UndoAddRemoveEdit<T, number>,
    list: Array<T>,
) => {
    if (are.type === 'add') {
        list.splice(are.key, 1);
        return list;
    } else if (are.type === 'remove') {
        list.splice(are.key, 0, are.prev);
        return list;
    } else {
        list[are.key] = { ...list[are.key], ...are.prev };
        return list;
    }
};

export const handleListARE = <T,>(
    are: AddRemoveEdit<T, number>,
    list: Array<T>,
    blank: T,
) => {
    return handleARE(are, {
        add: (index, value) => {
            list.splice(index, 0, value ?? blank);
            return list;
        },
        edit: (key, value) => {
            const old = list[key];
            list[key] = { ...old, ...value };
            return [list, old];
        },
        remove: (key) => {
            const old = list[key];
            list.splice(key, 1);
            return [list, old];
        },
    });
};

export const transformMatrix = (action: GlobalTransform, reverse?: boolean) => {
    if (action.flip) {
        return [action.flip === 'H' ? scaleMatrix(-1, 1) : scaleMatrix(1, -1)];
    }
    if (action.rotate) {
        return [rotationMatrix(action.rotate * (reverse ? -1 : 1))];
    }
    return [];
};

export const transformState = (state: State, mx: Matrix[]) => {
    const paths = { ...state.paths };
    const guides = { ...state.guides };
    const clips = { ...state.clips };
    const mirrors = { ...state.mirrors };
    Object.entries(paths).forEach(([key, path]) => {
        paths[key] = transformPath(path, mx);
    });
    const tx = (pos: Coord) => applyMatrices(pos, mx);
    Object.entries(guides).forEach(([key, guide]) => {
        guides[key] = transformGuide(guide, tx);
    });
    Object.entries(mirrors).forEach(([key, mirror]) => {
        mirrors[key] = transformMirror(mirror, tx);
    });
    Object.entries(clips).forEach(([key, clip]) => {
        clips[key] = {
            ...clip,
            shape: clip.shape.map((seg) => transformSegment(seg, mx)),
        };
    });
    return { ...state, paths, guides, clips, mirrors };
};
