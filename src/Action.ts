import {
    State,
    Selection,
    Tab,
    Attachment,
    View,
    Segment,
    Id,
    Overlay,
    Guide,
    PathGroup,
    Path,
    Pending,
    Coord,
    Meta,
    Mirror,
    GuideGeom,
    Animations,
} from './types';

/*

ooooh
ok, having a full branching mechanism actually sounds incredibly compelling.

so, this is a strict tree



*/

export type Action =
    | UndoableAction
    | { type: 'undo' }
    | { type: 'redo' }
    | { type: 'reset'; state: State }
    | { type: 'selection:set'; selection: Selection | null }
    | { type: 'tab:set'; tab: Tab }
    | { type: 'attachment:add'; id: string; attachment: Attachment }
    | { type: 'palette:rename'; old: string; new: string }
    | { type: 'palette:update'; name: string; colors: Array<string> }
    | { type: 'palette:select'; name: string };

export type ViewUpdate = { type: 'view:update'; view: View };
export type UndoViewUpdate = {
    type: ViewUpdate['type'];
    action: ViewUpdate;
    prev: View;
};

export type ScriptUpdate = {
    type: 'script:update';
    key: string;
    script: Animations['scripts'][''] | null;
};
export type UndoScriptUpdate = {
    type: ScriptUpdate['type'];
    action: ScriptUpdate;
    prev: Animations['scripts'][''] | null;
};

export type AnimationConfig = {
    type: 'animation:config';
    config: Animations['config'];
};
export type UndoAnimationConfig = {
    type: AnimationConfig['type'];
    action: AnimationConfig;
    prev: Animations['config'];
};

export type TimelineUpdate = {
    type: 'timeline:update';
    key: string;
    vbl: Animations['lerps'][''] | null;
};
export type UndoTimelineUpdate = {
    type: TimelineUpdate['type'];
    action: TimelineUpdate;
    prev: TimelineUpdate['vbl'];
};

export type ClipAdd = { type: 'clip:add'; clip: Array<Segment> };
export type UndoClipAdd = {
    type: ClipAdd['type'];
    action: ClipAdd;
    prevActive: Id | null;
    added: [string, number];
};

export type OverlayDelete = { type: 'overlay:delete'; id: Id };
export type UndoOverlayDelete = {
    type: OverlayDelete['type'];
    action: OverlayDelete;
    removed: Overlay;
};

export type OverlyAdd = { type: 'overlay:add'; attachment: Id };
export type UndoOverlayAdd = {
    type: OverlyAdd['type'];
    action: OverlyAdd;
    added: [string, number];
};

export type UndoOverlayUpdate = {
    type: OverlayUpdate['type'];
    action: OverlayUpdate;
    prev: Overlay;
};
export type OverlayUpdate = {
    type: 'overlay:update';
    overlay: Overlay;
};

export type UndoGuideUpdate = {
    type: GuideUpdate['type'];
    action: GuideUpdate;
    prev: Guide;
};
export type GuideUpdate = {
    type: 'guide:update';
    id: Id;
    guide: Guide;
};

export type UndoPathGroupUpdateMany = {
    type: PathGroupUpdateMany['type'];
    action: PathGroupUpdateMany;
    prev: { [key: string]: PathGroup };
};
export type PathGroupUpdateMany = {
    type: 'pathGroup:update:many';
    changed: { [key: string]: PathGroup };
};

export type UndoPathDeleteMany = {
    type: PathDeleteMany['type'];
    action: PathDeleteMany;
    prev: { [key: string]: Path };
};
export type PathDeleteMany = {
    type: 'path:delete:many';
    ids: Array<Id>;
};

export type UndoPathUpdateMany = {
    type: PathUpdateMany['type'];
    action: PathUpdateMany;
    prev: { [key: string]: Path };
};
export type PathUpdateMany = {
    type: 'path:update:many';
    changed: { [key: string]: Path };
};

export type UndoPathUpdate = {
    type: PathUpdate['type'];
    action: PathUpdate;
    prev: Path;
};
export type PathUpdate = {
    type: 'path:update';
    id: Id;
    path: Path;
};

export type UndoGroupUpdate = {
    type: GroupUpdate['type'];
    action: GroupUpdate;
    prev: PathGroup;
};
export type GroupUpdate = {
    type: 'group:update';
    id: Id;
    group: PathGroup;
};

export type ClipCut = {
    type: 'clip:cut';
    clip: Id;
};
export type UndoClipCut = {
    type: ClipCut['type'];
    action: ClipCut;
    paths: { [key: Id]: Path };
    added: Array<Id>;
};

export type GroupRegroup = {
    type: 'group:regroup';
    selection: { type: 'Path' | 'PathGroup'; ids: Array<Id> };
};
export type UndoGroupRegroup = {
    type: GroupRegroup['type'];
    action: GroupRegroup;
    created: null | [Id, number];
    prevGroups: { [key: Id]: Id | null };
};

export type PathDelete = {
    type: 'path:delete';
    id: Id;
};
export type UndoPathDelete = {
    type: PathDelete['type'];
    action: PathDelete;
    path: Path;
};

export type GroupDelete = {
    type: 'group:delete';
    id: Id;
};
export type UndoGroupDelete = {
    type: GroupDelete['type'];
    action: GroupDelete;
    group: PathGroup;
    paths: { [key: Id]: Path };
};

export type UndoGuideAdd = { action: GuideAdd; type: GuideAdd['type'] };
export type GuideAdd = {
    type: 'guide:add';
    id: Id;
    guide: Guide;
};
// export type PathPoint = { type: 'path:point'; coord: Intersect };
// export type UndoPathPoint = {
//     type: PathPoint['type'];
//     action: PathPoint;
//     prev: Pending | null;
// };

export type UndoPendingPoint = {
    type: PendingPoint['type'];
    action: PendingPoint;
    added: [Id, number] | null;
    pending: Pending;
};
export type PendingPoint = {
    type: 'pending:point';
    coord: Coord;
    shiftKey: boolean;
};

export type MetaUpdate = {
    type: 'meta:update';
    meta: Meta;
};
export type UndoMetaUpdate = {
    type: MetaUpdate['type'];
    action: MetaUpdate;
    prev: Meta;
};

export type PathCreate = {
    type: 'path:create';
    origin: Coord;
    segments: Array<Segment>;
};

export type UndoPathCreate = {
    type: PathCreate['type'];
    action: PathCreate;
    added: [Array<Id>, Id | null, number];
};

export type PathMultiply = {
    type: 'path:multiply';
    selection: { type: 'Path' | 'PathGroup'; ids: Array<Id> };
    mirror: Id | Mirror;
};
export type UndoPathMultiply = {
    type: PathMultiply['type'];
    action: PathMultiply;
    added: [Array<Id>, Id | null, number];
};

export type PendingExtent = {
    type: 'pending:extent';
    delta: number;
};

export type UndoPendingExtent = {
    type: PendingExtent['type'];
    action: PendingExtent;
};
// export type PathAdd = {
//     type: 'path:add';
//     segment: PendingSegment;
// };
// export type UndoPathAdd = {
//     type: PathAdd['type'];
//     action: PathAdd;
//     added: [Array<Id>, Id | null, number, PendingPath] | null;
// };

export type UndoMirrorDelete = {
    type: MirrorDelete['type'];
    action: MirrorDelete;
    mirror: Mirror;
    prevActive: Id | null;
};
export type MirrorDelete = {
    type: 'mirror:delete';
    id: Id;
};

export type UndoMirrorAdd = {
    type: MirrorAdd['type'];
    action: MirrorAdd;
    added: [Id, number];
};
export type MirrorAdd = {
    type: 'mirror:add';
    mirror: Mirror;
};

export type UndoMirrorActive = {
    type: MirrorActive['type'];
    action: MirrorActive;
    prev: Id | null;
};
export type MirrorActive = {
    type: 'mirror:active';
    id: Id | null;
};

export type UndoMirrorUpdate = {
    type: MirrorUpdate['type'];
    action: MirrorUpdate;
    prev: Mirror;
};
export type MirrorUpdate = {
    type: 'mirror:change';
    id: Id;
    mirror: Mirror;
};

export type UndoPendingType = {
    type: PendingType['type'];
    action: PendingType;
    prev: Pending | null;
};
export type PendingType = {
    type: 'pending:type';
    kind: GuideGeom['type'] | null;
};

export type UndoGuideDelete = {
    type: GuideDelete['type'];
    action: GuideDelete;
    prev: Guide;
};
export type GuideDelete = {
    type: 'guide:delete';
    id: Id;
};

export type UndoGuideToggle = {
    type: GuideToggle['type'];
    action: GuideToggle;
    prev: boolean;
};
export type GuideToggle = {
    type: 'guide:toggle';
    id: Id;
};

export type UndoableAction =
    | GuideAdd
    | GuideUpdate
    | MirrorAdd
    | MirrorUpdate
    | PendingPoint
    | MetaUpdate
    | OverlyAdd
    | OverlayDelete
    | ClipAdd
    // | PathAdd
    | PathUpdate
    | MirrorDelete
    | PendingType
    // | PathPoint
    | MirrorActive
    | ViewUpdate
    | ScriptUpdate
    | TimelineUpdate
    | AnimationConfig
    | PathUpdateMany
    | GroupUpdate
    | GuideDelete
    | GroupDelete
    | PendingExtent
    | PathDelete
    | PathDeleteMany
    | OverlayUpdate
    | PathGroupUpdateMany
    | PathCreate
    | GroupRegroup
    | ClipCut
    | PathMultiply
    | GuideToggle;

export type UndoAction =
    | UndoGuideAdd
    | UndoAnimationConfig
    | UndoOverlayAdd
    | UndoScriptUpdate
    | UndoTimelineUpdate
    | UndoOverlayDelete
    | UndoClipAdd
    | UndoGroupUpdate
    | UndoGroupRegroup
    | UndoPathUpdate
    | UndoPathUpdateMany
    | UndoPathDeleteMany
    | UndoPathGroupUpdateMany
    | UndoMetaUpdate
    | UndoGuideUpdate
    | UndoOverlayUpdate
    | UndoViewUpdate
    | UndoMirrorAdd
    | UndoMirrorDelete
    | UndoGroupDelete
    | UndoGuideDelete
    | UndoPendingPoint
    | UndoClipCut
    | UndoPathDelete
    // | UndoPathPoint
    // | UndoPathAdd
    | UndoPathCreate
    | UndoPathMultiply
    | UndoPendingExtent
    | UndoPendingType
    | UndoGuideToggle
    | UndoMirrorActive
    | UndoMirrorUpdate;
// Ensure that every ActionWithoutUndo
// has a corresponding UndoAction
(x: UndoAction['type'], y: UndoableAction['type']) => {
    const a: UndoableAction['type'] = x;
    const b: UndoAction['type'] = y;
    const c: UndoAction['action']['type'] = y;
};
