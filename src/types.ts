import { ensureClockwise } from './CanvasRender';
import { initialState } from './initialState';
import { Primitive } from './intersect';
import { simplifyPath } from './RenderPath';

// Should I do polar coords?
export type Coord = { x: number; y: number };

export type Id = string;

// export type Shape = {
//     id: Id;
//     geom: ShapeGeom;
//     basedOn: Array<Id>;
//     mirrors: Array<Id>;
// };

// Hmmmmmm
/*

So, what do I mean by "shapes"?

Should I go straight to "paths"?
like

I'm laying down the guides

and then, in a layer over them,
I ink out the paths.

these paths can be filled, or not,
closed, or not.
They can be inset, etc.

ALSO
They can be grouped, and the style attributes (incl inset) can be set at the group level.

INSET is a list of numbers, 0 means "line without inset", so you could have "0 2" for adding a line at 2 inset
OR like "-2 2" to have a line on either side of the normal, while not drawing the normal.

FILL
STROKE

the normal stuff folks.


*/
export type Line = {
    type: 'Line';
    p1: Coord;
    p2: Coord;
    /** @deprecated */
    limit: boolean;
    extent?: number;
};

export type GuideGeom =
    | Line
    | Circle
    | AngleBisector
    | PerpendicularBisector
    | Perpendicular
    | InCicle
    | CircumCircle;

export type Perpendicular = {
    type: 'Perpendicular';
    p1: Coord;
    p2: Coord;
};

export type InCicle = {
    type: 'InCircle';
    p1: Coord;
    p2: Coord;
    p3: Coord;
};

export type CircumCircle = {
    type: 'CircumCircle';
    p1: Coord;
    p2: Coord;
    p3: Coord;
};

export const guideTypes: Array<GuideGeom['type']> = [
    'Line',
    'AngleBisector',
    'Circle',
    'PerpendicularBisector',
    'Perpendicular',
    'InCircle',
    'CircumCircle',
];

export const guidePoints: {
    [x in GuideGeom['type']]: number;
} = {
    AngleBisector: 3,
    InCircle: 3,
    CircumCircle: 3,
    Perpendicular: 2,
    Circle: 2,
    Line: 2,
    PerpendicularBisector: 2,
};

export type Circle = {
    type: 'Circle';
    center: Coord;
    radius: Coord;
    line?: boolean;
    half: boolean;
    multiples: number;
};

export type AngleBisector = {
    type: 'AngleBisector';
    p1: Coord;
    p2: Coord;
    p3: Coord;
};
export type PerpendicularBisector = {
    type: 'PerpendicularBisector';
    p1: Coord;
    p2: Coord;
};

/*

How does path drawing work?
I'm imagining, that you can either:

Click somewhere, to form a path from the enclosure

Start at a point, and drag around, following whatever path segments happen to be adjacent.


*/

export type Guide = {
    id: Id;
    /**
     * Ok, so guides can be active or inactive. ctrl-click on one to toggle.
     * If active, then its intersections show up, things snap to it, etc. (incl when drawing paths).
     *
     */
    active: boolean;
    geom: GuideGeom;
    basedOn: Array<Id>;
    mirror: Id | null;
};

export type Mirror = {
    id: Id;
    // enabled: boolean;
    origin: Coord;
    point: Coord;
    // false = "disabled".
    // The original is always enabled.
    // An empty array here, with reflect = true just reflects over the
    // line between origin and point.
    rotational: Array<boolean>;
    reflect: boolean;
    parent: Id | null;
};

export type Fill = {
    inset?: number;
    opacity?: number;
    color?: string | number;
    colorVariation?: number;
    lighten?: number; // negatives for darken. units somewhat arbitrary.
};

export type StyleLine = {
    inset?: number;
    color?: string | number;
    width?: number;
    dash?: Array<number>;
    joinStyle?: string;
};

export type Style = {
    // hmm should it be "fills" instead?
    // I don't see why not.
    fills: Array<Fill | null>;
    // Why might it be null? If we're
    // inheriting from higher up.
    lines: Array<StyleLine | null>;
};

export type Path = {
    id: Id;
    created: number;
    ordering: number;
    style: Style;
    group: Id | null;
    // 'remove' means, if it intersects with the clip, just remove the path
    // 'none' means don't clip it.
    clipMode?: 'none' | 'remove' | 'normal';
    origin: Coord;
    segments: Array<Segment>;
    hidden: boolean;
    debug?: boolean;
};

export type ArcSegment = {
    type: 'Arc';
    center: Coord;
    to: Coord;
    clockwise: boolean;
    // large
};

export type Segment = { type: 'Line'; to: Coord } | ArcSegment; // long = "the long way round"

export type PathGroup = {
    id: Id;
    style: Style;
    group: Id | null;
    hide?: boolean;
    clipMode?: 'none' | 'remove' | 'normal';
    ordering?: number;
};

export type GuideElement = {
    id: Id;
    geom: GuideGeom;
    active: boolean;
    original: boolean;
};

export type Idd<T> = {
    items: { [key: number]: T };
    next: number;
};

export type Cache = {
    guides: Idd<GuideElement>;
    // is it fine to dedup these primitives?
    // or do I need to keep them?
    // yeah let's dedup, and then each prim might point back to multiple guides.
    primitives: Idd<{ prim: Primitive; guide: Array<number> }>;
    // Do we just say "link back to the guide" always?
    // is there a need to link back to the specific primitive?
    // yes there is.
    // for determining adjacent segments when drawing paths.
    // and in fact, an intersection will have 2+ primitives to hark back to.
    intersections: Idd<{ coord: Coord; prims: Array<number> }>;
};

export type Pending = PendingGuide | PendingPath;

export type PendingGuide = {
    type: 'Guide';
    points: Array<Coord>;
    kind: GuideGeom['type'];
    extent?: number;
};

export type Intersect = {
    coord: Coord;
    primitives: Array<[number, number]>;
};

export type PendingSegment = {
    to: Intersect;
    segment: Segment;
};

export type PendingPath = {
    type: 'Path';
    origin: Intersect;
    parts: Array<PendingSegment>;
};

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

export type ClipAdd = { type: 'clip:add'; clip: Array<Segment> };
export type UndoClipAdd = {
    type: ClipAdd['type'];
    action: ClipAdd;
    prevActive: Id | null;
    added: [string, number];
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
    // prev: Guide;
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

export type UndoMirrorAdd = {
    type: MirrorAdd['type'];
    action: MirrorAdd;
    added: [Id, number];
    // prevActive: Id | null;
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
    // prev: Mirror;
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
    | ClipAdd
    // | PathAdd
    | PathUpdate
    | PendingType
    // | PathPoint
    | MirrorActive
    | ViewUpdate
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
    | GuideToggle;

export type UndoAction =
    | UndoGuideAdd
    | UndoOverlayAdd
    | UndoClipAdd
    | UndoGroupUpdate
    | UndoPathUpdate
    | UndoPathUpdateMany
    | UndoPathDeleteMany
    | UndoPathGroupUpdateMany
    | UndoMetaUpdate
    | UndoGuideUpdate
    | UndoOverlayUpdate
    | UndoViewUpdate
    | UndoMirrorAdd
    | UndoGroupDelete
    | UndoGuideDelete
    | UndoPendingPoint
    | UndoPathDelete
    // | UndoPathPoint
    // | UndoPathAdd
    | UndoPathCreate
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

export type HistoryItem = {
    action: UndoableAction;
    id: number;
    // parent: number;
};

export type History = {
    nextId: number;
    // current: Array<HistoryItem>;
    // How far back we've undone from current.
    undo: number;
    // the id of the current branch
    currentBranch: number;
    branches: {
        [key: number]: {
            id: number;
            items: Array<UndoAction>;
            snapshot: string | null;
            parent: { branch: number; idx: number } | null;
        };
    };

    // actions: Array<Action>;
    // idx: number;
};

export type View = {
    center: Coord;
    zoom: number;
    guides: boolean;
    activeClip: Id | null;
    hideDuplicatePaths?: boolean;
    background?: string | number;
};

export type Selection = {
    type: 'Guide' | 'Mirror' | 'Path' | 'PathGroup' | 'Overlay';
    ids: Array<string>;
};

export type Tab =
    | 'Guides'
    | 'Mirrors'
    | 'Paths'
    | 'PathGroups'
    | 'Palette'
    | 'Export'
    | 'Overlays'
    | 'Clips'
    | 'Help';

export type Attachment = {
    id: Id;
    contents: string; // base64 dontcha know
    name: string;
    width: number;
    height: number;
};

export type Meta = {
    title: string;
    description: string;
    created: number;
};

export type State = {
    version: number;
    nextId: number;
    history: History;
    meta: Meta;
    pending: Pending | null;
    paths: { [key: Id]: Path };
    // Pathgroups automatically happen when, for example, a path is created when a mirror is active.
    // SO: Paths are automatically /realized/, that is, when completing a path, the mirrored paths are also
    // added to the paths dict.
    // Whereas mirrored guides are /virtual/. Does that sound right? That means you can't individually disable mirrored guides.
    // But that sounds perfectly fine to me...
    pathGroups: { [key: Id]: PathGroup };
    guides: { [key: Id]: Guide };
    // TODO: Are we likely to need guide groups?
    // maybe not? idk.
    // guideGroups: {[key: Id]: GuideGroup},
    mirrors: { [key: Id]: Mirror };
    activeMirror: Id | null;
    view: View;

    clips: { [key: Id]: Array<Segment> };

    overlays: { [key: Id]: Overlay };

    // Non historied, my folks
    selection: Selection | null;
    tab: Tab;

    palettes: { [name: string]: Array<string> };
    activePalette: string;
    attachments: {
        [key: Id]: Attachment;
    };
};

export const migrateState = (state: State) => {
    if (!state.version) {
        state.version = 1;
        if (!state.overlays) {
            state.overlays = {};
            state.attachments = {};
        }
        if (!state.palettes) {
            state.palettes = {};
            state.tab = 'Guides';
            state.selection = null;
        }
        if (!state.activePalette) {
            state.palettes['default'] = initialState.palettes['default'];
            state.activePalette = 'default';
        }
        if (!state.meta) {
            state.meta = {
                created: Date.now(),
                title: '',
                description: '',
            };
        }
    }
    if (!state.overlays) {
        state.overlays = {};
        // @ts-ignore
        delete state.underlays;
    }
    if (state.version < 2) {
        Object.keys(state.paths).forEach((k) => {
            state.paths[k] = {
                ...state.paths[k],
                segments: simplifyPath(
                    ensureClockwise(state.paths[k].segments),
                ),
            };
        });
        state.version = 2;
    }
    if (state.version < 3) {
        state.version = 3;
        if ((state.view as any).clip) {
            state.clips = {
                migrated: (state.view as any).clip,
            };
            state.view.activeClip = 'migrated';
            // @ts-ignore
            delete state.view.clip;
        } else {
            state.clips = {};
            state.view.activeClip = null;
        }
    }
    return state;
};

/*
CHANGELOG:

version 2:
- simplifying all paths

version 3:
- multiple clips


*/

export type Overlay = {
    id: Id;
    source: Id;
    scale: Coord;
    center: Coord;
    hide: boolean;
    over: boolean;
    opacity: number;
};
