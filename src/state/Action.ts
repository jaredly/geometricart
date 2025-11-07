import {CompassState} from '../editor/compassAndRuler';
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
    TimelineLane,
    TimelineSlot,
    StyleLine,
    Fill,
    Clip,
    Tiling,
} from '../types';

/*

ooooh
ok, having a full branching mechanism actually sounds incredibly compelling.

so, this is a strict tree



*/

export type Action =
    | UndoableAction
    | {type: 'undo'}
    | {type: 'redo'}
    | {type: 'reset'; state: State}
    | {type: 'selection:set'; selection: Selection | null}
    | {type: 'select:same'; line?: StyleLine; fill?: Fill}
    | {type: 'tab:set'; tab: Tab}
    | {type: 'attachment:add'; id: string; attachment: Attachment}
    | {type: 'attachment:update'; id: string; attachment: Partial<Attachment>}
    | {type: 'library:palette:rename'; old: string; new: string}
    | {type: 'library:palette:update'; name: string; colors: Array<string>};
// | { type: 'library:palette:select'; name: string };

export type AddRemoveEdit<T, Key> =
    | {
          type: 'add';
          key: Key;
          value?: T;
      }
    | {type: 'edit'; key: Key; value: Partial<T>}
    | {type: 'remove'; key: Key};
export type UndoAddRemoveEdit<T, Key> =
    | {
          type: 'add';
          key: Key;
      }
    | {type: 'edit'; prev: Partial<T>; key: Key}
    | {type: 'remove'; prev: T; key: Key};

type GCodeConfig = {
    type: 'gcode:config';
    config: Partial<State['gcode']>;
};

type UndoGCodeConfig = {
    type: GCodeConfig['type'];
    action: GCodeConfig;
    prev: Partial<State['gcode']>;
};

type TimelineLaneARE = {
    type: 'timeline:lane:are';
    action: AddRemoveEdit<TimelineLane, number>;
};
type UndoTimelineLaneARE = {
    type: TimelineLaneARE['type'];
    action: TimelineLaneARE;
    undo: UndoAddRemoveEdit<TimelineLane, number>;
};

type HistoryViewUpdate = {
    type: 'history-view:update';
    view: State['historyView'];
};

type UndoHistoryViewUpdate = {
    type: HistoryViewUpdate['type'];
    action: HistoryViewUpdate;
    prev: State['historyView'];
};

type TimelineSlotARE = {
    type: 'timeline:slot:are';
    timeline: number;
    action: AddRemoveEdit<TimelineSlot, number>;
};

type UndoTimelineSlotARE = {
    type: TimelineSlotARE['type'];
    action: TimelineSlotARE;
    undo: UndoAddRemoveEdit<TimelineSlot, number>;
};

type GCodeItemOrder = {
    type: 'gcode:item:order';
    oldIndex: number;
    newIndex: number;
};
type UndoGCodeItemOrder = {
    type: GCodeItemOrder['type'];
    action: GCodeItemOrder;
};
type GCodeItemARE = {
    type: 'gcode:item:are';
    item: AddRemoveEdit<State['gcode']['items'][0], number>;
};
type UndoGCodeItemARE = {
    type: GCodeItemARE['type'];
    action: GCodeItemARE;
    undo: UndoAddRemoveEdit<State['gcode']['items'][0], number>;
};

// export type TimelineLaneUpdate = {
//     type: 'timeline:lane:update';
//     idx: number;
//     timeline: TimelineLane;
// };
// export type UndoTimelineLaneUpdate = {
//     type: TimelineLaneUpdate['type'];
//     action: TimelineLaneUpdate;
//     prev: TimelineLane;
// };

// export type TimelineLaneAdd = {
//     type: 'timeline:lane:add';
//     idx: number;
// };
// export type UndoTimelineLaneAdd = {
//     type: TimelineLaneAdd['type'];
//     action: TimelineLaneAdd;
// };
// export type TimelineLaneDelete = {
//     type: 'timeline:lane:delete';
//     idx: number;
// };
// export type UndoTimelineLaneDelete = {
//     type: TimelineLaneDelete['type'];
//     action: TimelineLaneDelete;
//     prev: TimelineLane;
// };

type ClipUpdate = {type: 'clip:update'; id: string; clip: Clip};
type UndoClipUpdate = {
    type: ClipUpdate['type'];
    action: ClipUpdate;
    prev: Clip;
};

type ViewUpdate = {type: 'view:update'; view: View};
type UndoViewUpdate = {
    type: ViewUpdate['type'];
    action: ViewUpdate;
    prev: View;
};

type ScriptRename = {
    type: 'script:rename';
    key: string;
    newKey: string;
};
type UndoScriptRename = {
    type: ScriptRename['type'];
    action: ScriptRename;
};

type ScriptUpdate = {
    type: 'script:update';
    key: string;
    script: Animations['scripts'][''] | null;
};
type UndoScriptUpdate = {
    type: ScriptUpdate['type'];
    action: ScriptUpdate;
    prev: Animations['scripts'][''] | null;
};

type AnimationConfig = {
    type: 'animation:config';
    config: Animations['config'];
};
type UndoAnimationConfig = {
    type: AnimationConfig['type'];
    action: AnimationConfig;
    prev: Animations['config'];
};

type TimelineUpdate = {
    type: 'timeline:update';
    key: string;
    vbl: Animations['lerps'][''] | null;
};
type UndoTimelineUpdate = {
    type: TimelineUpdate['type'];
    action: TimelineUpdate;
    prev: TimelineUpdate['vbl'];
};

type ClipAdd = {type: 'clip:add'; clip: Array<Segment>};
type UndoClipAdd = {
    type: ClipAdd['type'];
    action: ClipAdd;
    added: [string, number];
};

type OverlayDelete = {type: 'overlay:delete'; id: Id};
type UndoOverlayDelete = {
    type: OverlayDelete['type'];
    action: OverlayDelete;
    removed: Overlay;
};

type OverlyAdd = {type: 'overlay:add'; attachment: Id};
type UndoOverlayAdd = {
    type: OverlyAdd['type'];
    action: OverlyAdd;
    added: [string, number];
};

type UndoOverlayUpdate = {
    type: OverlayUpdate['type'];
    action: OverlayUpdate;
    prev: Overlay;
};
type OverlayUpdate = {
    type: 'overlay:update';
    overlay: Overlay;
};

type UndoGuideUpdate = {
    type: GuideUpdate['type'];
    action: GuideUpdate;
    prev: Guide;
};
type GuideUpdate = {
    type: 'guide:update';
    id: Id;
    guide: Guide;
};

type UndoPathGroupUpdateMany = {
    type: PathGroupUpdateMany['type'];
    action: PathGroupUpdateMany;
    prev: {[key: string]: PathGroup};
};
type PathGroupUpdateMany = {
    type: 'pathGroup:update:many';
    changed: {[key: string]: PathGroup};
};

type UndoPathDeleteMany = {
    type: PathDeleteMany['type'];
    action: PathDeleteMany;
    prev: {[key: string]: Path};
};
type PathDeleteMany = {
    type: 'path:delete:many';
    ids: Array<Id>;
};

type UndoPathUpdateMany = {
    type: PathUpdateMany['type'];
    action: PathUpdateMany;
    prev: {[key: string]: Path};
    prevNextId?: number;
};
type PathUpdateMany = {
    type: 'path:update:many';
    changed: {[key: string]: Path | null};
    nextId?: number;
};

type UndoGlobalTransform = {
    type: GlobalTransform['type'];
    action: GlobalTransform;
};
export type GlobalTransform = {
    type: 'global:transform';
    rotate: number | null;
    flip: 'V' | 'H' | null;
};

type UndoPathUpdate = {
    type: PathUpdate['type'];
    action: PathUpdate;
    prev: Path;
};
type PathUpdate = {
    type: 'path:update';
    id: Id;
    path: Path;
};

type UndoGroupUpdate = {
    type: GroupUpdate['type'];
    action: GroupUpdate;
    prev: PathGroup;
};
type GroupUpdate = {
    type: 'group:update';
    id: Id;
    group: PathGroup;
};

type UndoGroupsOrder = {
    type: GroupsOrder['type'];
    action: GroupsOrder;
    prev: Record<string, number | undefined>;
};
type GroupsOrder = {
    type: 'groups:order';
    order: Record<string, number>;
};

type ClipCut = {
    type: 'clip:cut';
    clip: Id;
};
type UndoClipCut = {
    type: ClipCut['type'];
    action: ClipCut;
    paths: {[key: Id]: Path};
    added: Array<Id>;
};

type GroupDuplicate = {
    type: 'group:duplicate';
    selection: {type: 'Path' | 'PathGroup'; ids: Array<Id>};
};
type UndoGroupDuplicate = {
    type: GroupDuplicate['type'];
    action: GroupDuplicate;
    created: null | [Id, number, Id[]];
};

export type GroupRegroup = {
    type: 'group:regroup';
    selection: {type: 'Path' | 'PathGroup'; ids: Array<Id>};
};
type UndoGroupRegroup = {
    type: GroupRegroup['type'];
    action: GroupRegroup;
    created: null | [Id, number];
    prevGroups: {[key: Id]: Id | null};
};

type PathDelete = {
    type: 'path:delete';
    id: Id;
};
type UndoPathDelete = {
    type: PathDelete['type'];
    action: PathDelete;
    path: Path;
};

type GroupDelete = {
    type: 'group:delete';
    id: Id;
};
type UndoGroupDelete = {
    type: GroupDelete['type'];
    action: GroupDelete;
    group: PathGroup;
    paths: {[key: Id]: Path};
};

type UndoGuideAdd = {action: GuideAdd; type: GuideAdd['type']};
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

type UndoPendingPoint = {
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

type UndoPendingAngle = {
    type: PendingAngle['type'];
    action: PendingAngle;
    added: [Id, number] | null;
    pending: Pending;
};
export type PendingAngle = {
    type: 'pending:angle';
    angle: number;
    // shiftKey: boolean;
};

type UndoPendingCompassAndRuler = {
    type: PendingCompassAndRuler['type'];
    action: PendingCompassAndRuler;
    prev?: CompassState;
};
type PendingCompassAndRuler = {
    type: 'pending:compass&ruler';
    state: CompassState;
};

type MetaUpdate = {
    type: 'meta:update';
    meta: Meta;
};
type UndoMetaUpdate = {
    type: MetaUpdate['type'];
    action: MetaUpdate;
    prev: Meta;
};

export type PathCreateMany = {
    type: 'path:create:many';
    paths: {origin: Coord; segments: Segment[]; open?: boolean}[];
    withMirror: boolean;
    trace?: boolean;
};

type UndoPathCreateMany = {
    type: PathCreateMany['type'];
    action: PathCreateMany;
    added: [Array<Id>, Id | null, number];
};

export type PathCreate = {
    type: 'path:create';
    origin: Coord;
    segments: Array<Segment>;
};

type UndoPathCreate = {
    type: PathCreate['type'];
    action: PathCreate;
    added: [Array<Id>, Id | null, number];
};

export type PathMultiply = {
    type: 'path:multiply';
    selection: {type: 'Path' | 'PathGroup'; ids: Array<Id>};
    mirror: Id | Mirror;
};
type UndoPathMultiply = {
    type: PathMultiply['type'];
    action: PathMultiply;
    added: [Array<Id>, Id | null, number];
};

type PendingToggle = {
    type: 'pending:toggle';
};

type UndoPendingToggle = {
    type: PendingToggle['type'];
    action: PendingToggle;
};

type PendingExtent = {
    type: 'pending:extent';
    delta: number;
};

type UndoPendingExtent = {
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

type UndoMirrorDelete = {
    type: MirrorDelete['type'];
    action: MirrorDelete;
    mirror: Mirror;
    prevActive: Id | null;
};
type MirrorDelete = {
    type: 'mirror:delete';
    id: Id;
};

type UndoMirrorAdd = {
    type: MirrorAdd['type'];
    action: MirrorAdd;
    added: [Id, number];
};
export type MirrorAdd = {
    type: 'mirror:add';
    mirror: Mirror;
    activate?: boolean;
};

type UndoMirrorActive = {
    type: MirrorActive['type'];
    action: MirrorActive;
    prev: Id | null;
};
type MirrorActive = {
    type: 'mirror:active';
    id: Id | null;
};

type UndoMirrorUpdate = {
    type: MirrorUpdate['type'];
    action: MirrorUpdate;
    prev: Mirror;
};
type MirrorUpdate = {
    type: 'mirror:change';
    id: Id;
    mirror: Mirror;
};

type UndoPendingType = {
    type: PendingType['type'];
    action: PendingType;
    prev: Pending | null;
};
export type PendingType = {
    type: 'pending:type';
    kind: GuideGeom['type'] | null | 'compass&ruler';
    shiftKey?: boolean;
};

type UndoGuideDelete = {
    type: GuideDelete['type'];
    action: GuideDelete;
    prev: Guide;
};
type GuideDelete = {
    type: 'guide:delete';
    id: Id;
};

type UndoGuideToggle = {
    type: GuideToggle['type'];
    action: GuideToggle;
    prev: boolean;
};
type GuideToggle = {
    type: 'guide:toggle';
    id: Id;
};

type PaletteUpdate = {
    type: 'palette:update';
    colors: string[];
};
type UndoPaletteUpdate = {
    type: PaletteUpdate['type'];
    action: PaletteUpdate;
    prev: string[];
};

type TilingDelete = {
    type: 'tiling:delete';
    id: string;
};
type UndoTilingDelete = {
    type: TilingDelete['type'];
    action: TilingDelete;
    removed: Tiling;
};

type TilingAdd = {
    type: 'tiling:add';
    shape: Tiling['shape'];
    cache: Tiling['cache'];
};
type UndoTilingAdd = {
    type: TilingAdd['type'];
    action: TilingAdd;
    added: [Id, number];
};

type TilingUpdate = {
    type: 'tiling:update';
    tiling: Tiling;
};
type UndoTilingUpdate = {
    type: TilingUpdate['type'];
    action: TilingUpdate;
    prev: Tiling;
};

export type UndoableAction =
    | TilingAdd
    | TilingDelete
    | TilingUpdate
    | PaletteUpdate
    | GuideAdd
    | GuideUpdate
    | MirrorAdd
    | MirrorUpdate
    | PendingPoint
    | PendingAngle
    | PendingCompassAndRuler
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
    | ClipUpdate
    | TimelineLaneARE
    | GCodeConfig
    | TimelineSlotARE
    | HistoryViewUpdate
    | GCodeItemARE
    | GCodeItemOrder
    | ScriptUpdate
    | ScriptRename
    | TimelineUpdate
    | AnimationConfig
    | PathUpdateMany
    | GlobalTransform
    | GroupUpdate
    | GroupsOrder
    | GuideDelete
    | GroupDelete
    | PendingExtent
    | PendingToggle
    | PathDelete
    | PathDeleteMany
    | OverlayUpdate
    | PathGroupUpdateMany
    | PathCreate
    | PathCreateMany
    | GroupRegroup
    | GroupDuplicate
    | ClipCut
    | PathMultiply
    | GuideToggle;

export type UndoAction =
    | UndoTilingAdd
    | UndoTilingUpdate
    | UndoPaletteUpdate
    | UndoGuideAdd
    | UndoAnimationConfig
    | UndoScriptRename
    | UndoTimelineLaneARE
    | UndoTimelineSlotARE
    | UndoOverlayAdd
    | UndoGCodeItemARE
    | UndoGCodeConfig
    | UndoGCodeItemOrder
    | UndoScriptUpdate
    | UndoTimelineUpdate
    | UndoOverlayDelete
    | UndoClipAdd
    | UndoPathCreateMany
    | UndoGlobalTransform
    | UndoGroupUpdate
    | UndoGroupsOrder
    | UndoGroupRegroup
    | UndoGroupDuplicate
    | UndoPathUpdate
    | UndoPathUpdateMany
    | UndoPathDeleteMany
    | UndoPathGroupUpdateMany
    | UndoMetaUpdate
    | UndoGuideUpdate
    | UndoOverlayUpdate
    | UndoViewUpdate
    | UndoClipUpdate
    | UndoMirrorAdd
    | UndoMirrorDelete
    | UndoGroupDelete
    | UndoGuideDelete
    | UndoPendingPoint
    | UndoPendingAngle
    | UndoPendingCompassAndRuler
    | UndoClipCut
    | UndoPathDelete
    | UndoHistoryViewUpdate
    // | UndoPathPoint
    // | UndoPathAdd
    | UndoTilingDelete
    | UndoPathCreate
    | UndoPathMultiply
    | UndoPendingExtent
    | UndoPendingToggle
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
