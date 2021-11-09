import { Primitive } from './intersect';

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
export type Line = { type: 'Line'; p1: Coord; p2: Coord; limit: boolean };

export type GuideGeom =
    | Line
    | Circle
    | AngleBisector
    | PerpendicularBisector
    | InCicle
    | CircumCircle;

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
    'InCircle',
    'CircumCircle',
];

export const guidePoints: {
    [x in GuideGeom['type']]: number;
} = {
    AngleBisector: 3,
    InCircle: 3,
    CircumCircle: 3,
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

export type Style = {
    // hmm should it be "fills" instead?
    // I don't see why not.
    fills: Array<{
        inset?: number;
        color?: string;
        // pattern?: string,
    } | null>;
    // Why might it be null? If we're
    // inheriting from higher up.
    lines: Array<{
        inset?: number;
        color?: string;
        width?: number;
        dash?: Array<number>;
        joinStyle?: string;
    } | null>;
};

export type Path = {
    id: Id;
    created: number;
    ordering: number;
    style: Style;
    group: Id | null;
    origin: Coord;
    segments: Array<Segment>;
};

export type ArcSegment = {
    type: 'Arc';
    center: Coord;
    to: Coord;
    clockwise: boolean;
};

export type Segment = { type: 'Line'; to: Coord } | ArcSegment; // long = "the long way round"

export type PathGroup = {
    id: Id;
    style: Style;
    group: Id | null;
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
    | { type: 'reset'; state: State };

export type ViewUpdate = { type: 'view:update'; view: View };
export type UndoViewUpdate = {
    type: ViewUpdate['type'];
    action: ViewUpdate;
    prev: View;
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

export type UndoGuideAdd = { action: GuideAdd; type: GuideAdd['type'] };
export type GuideAdd = {
    type: 'guide:add';
    id: Id;
    guide: Guide;
};

export type PathPoint = { type: 'path:point'; coord: Intersect };
export type UndoPathPoint = {
    type: PathPoint['type'];
    action: PathPoint;
    prev: Pending | null;
};

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

export type PathAdd = {
    type: 'path:add';
    segment: PendingSegment;
};
export type UndoPathAdd = {
    type: PathAdd['type'];
    action: PathAdd;
    added: [Array<Id>, Id | null, number, PendingPath] | null;
};

export type UndoMirrorAdd = {
    type: MirrorAdd['type'];
    action: MirrorAdd;
};
export type MirrorAdd = {
    type: 'mirror:add';
    id: Id;
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
    | PathAdd
    | PendingType
    | PathPoint
    | MirrorActive
    | ViewUpdate
    | GroupUpdate
    | PathCreate
    | GuideToggle;

export type UndoAction =
    | UndoGuideAdd
    | UndoGroupUpdate
    | UndoGuideUpdate
    | UndoViewUpdate
    | UndoMirrorAdd
    | UndoPendingPoint
    | UndoPathPoint
    | UndoPathAdd
    | UndoPathCreate
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

export const initialHistory: History = {
    nextId: 1,
    undo: 0,
    currentBranch: 0,
    branches: {
        [0]: {
            id: 0,
            items: [],
            snapshot: null,
            parent: null,
        },
    },
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

export type State = {
    nextId: number;
    history: History;
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
};

export type View = {
    center: Coord;
    zoom: number;
    guides: boolean;
};

// export const pointForView = (coord: Coord, view: View) => {
// 	return {
// 		x: (coord.x - view.center.x) * view.zoom + view.center.x,
// 		y: (coord.y - view.center.y) * view.zoom + view.center.y
// 	}
// }

// Should I use hashes to persist the realized whatsits for all the things?
// idk let's just do it slow for now.
export const initialState: State = {
    pending: null, // { type: 'Guide', kind: 'Line', points: [] },
    nextId: 0,
    paths: {},
    history: initialHistory,
    pathGroups: {},
    guides: {
        base: {
            id: 'base',
            geom: {
                type: 'Circle',
                center: { x: 0, y: 0 },
                radius: { x: 0, y: -1 },
                line: true,
                half: true,
                multiples: 5,
            },
            active: true,
            basedOn: [],
            mirror: 'baseMirror',
        },
    },
    mirrors: {
        // second: {
        // 	id: 'second',
        // 	reflect: true,
        // },
        baseMirror: {
            id: 'baseMirror',
            origin: { x: 0, y: 0 },
            parent: null,
            point: { x: 0, y: -1 },
            reflect: true,
            rotational: [true, true], // , true, true, true], // 6-fold
        },
    },
    activeMirror: 'baseMirror',
    view: {
        center: { x: 0, y: 0 },
        // This can't be implemented with svg zoom, because that would muck with line widths of guides and mirrors.
        zoom: 100,
        guides: true,
    },
};
