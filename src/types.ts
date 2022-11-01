import { UndoableAction, UndoAction } from './state/Action';
import { Primitive } from './rendering/intersect';
import { Matrix } from './rendering/getMirrorTransforms';

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
    mirror: Id | null | Mirror;
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
    parent: Id | null | Mirror;
};

export type Fill = {
    originalIdx?: number;
    inset?: number;
    opacity?: number;
    color?: string | number;
    colorVariation?: number;
    lighten?: number; // negatives for darken. units somewhat arbitrary.
};

export type StyleLine = {
    originalIdx?: number;
    inset?: number;
    color?: string | number;
    width?: number;
    dash?: Array<number>;
    joinStyle?: string;
    colorVariation?: number;
    opacity?: number;
    lighten?: number; // negatives for darken. units somewhat arbitrary.
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
    open?: boolean;
    hidden: boolean;
    debug?: boolean;
    normalized?: {
        key: string;
        transform: Array<Matrix>;
    };
};

export type ArcSegment = {
    type: 'Arc';
    center: Coord;
    to: Coord;
    clockwise: boolean;
    // large
};

export type LineSegment = { type: 'Line'; to: Coord };
export type Segment = LineSegment | ArcSegment; // long = "the long way round"

export type PathGroup = {
    id: Id;
    // style: Style;
    group: Id | null;
    hide?: boolean;
    clipMode?: 'none' | 'remove' | 'normal';
    insetBeforeClip?: boolean;
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

export type TextureConfig = {
    id: string;
    scale: number;
    intensity: number;
};

export type View = {
    center: Coord;
    zoom: number;
    guides: boolean;
    activeClip: Id | null;
    hideDuplicatePaths?: boolean;
    laserCutMode?: boolean;
    background?: string | number;
    sketchiness?: number;
    texture?: TextureConfig;
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
    | 'Undo'
    | 'Clips';

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
    ppi: number;
};
export type LerpPoint = {
    pos: Coord;
    leftCtrl?: Coord;
    rightCtrl?: Coord;
};
export type FloatLerp = {
    type: 'float';
    points: Array<LerpPoint>;
    range: [number, number];
};

export type TimelineSlot = {
    enabled: boolean;
    weight: number;
    contents:
        | {
              type: 'script';
              custom: { [vbl: string]: number | Array<Id> | boolean };
              scriptId: string;
              phase: 'pre-inset' | 'post-inset';
              selection?: {
                  type: 'Path' | 'PathGroup';
                  ids: Array<Id>;
              };
          }
        | {
              type: 'spacer';
              still?: null | 'left' | 'right';
          };
};

export type TimelineLane = {
    enabled: boolean;
    items: Array<TimelineSlot>;
};

export type Lerp =
    | FloatLerp
    | {
          type: 'float-fn';
          code: string;
      };

export type Animations = {
    config: {
        fps: number;
        backgroundAlpha: null | number;
        increment: number;
        crop: number;
        restrictAspectRatio: boolean;
        zoom: number;
    };
    steps?: number;
    // yeah I know they're often not linear :P
    lerps: {
        // ooh some vbls might not be floats?
        // like could be nice to interpolate colors, in some cases
        // and positions! Like following a path
        [vblName: string]: Lerp;
    };

    timelines: Array<TimelineLane>;

    scripts: {
        [name: string]: {
            code: string;
        };
    };
};

export type ScriptVbl =
    | {
          type: 'int' | 'float';
          defaultValue: number;
          range?: [number, number];
      }
    | {
          type: 'boolean';
          defaultValue: boolean;
      }
    | {
          type: 'color';
          defaultValue: string;
      }
    | {
          type: 'coord';
          defaultValue: Coord;
      }
    | {
          type: 'selection' | 'lerp';
      };

export type Library = {
    version: 1;
    scripts: {
        [id: string]: {
            code: string;
            vbls: {
                [key: string]: {
                    kind: ScriptVbl;
                    description?: string;
                };
            };
        };
    };
    lerps: { [id: string]: Lerp };
};

export const initialLibrary: Library = {
    version: 1,
    scripts: {},
    lerps: {},
};

export type GCodePath = {
    type: 'path';
    color: string;
    speed: number;
    depth: number;
    start: number;
    passDepth?: number;
    tabs?: {
        count: number;
        width: number;
        depth: number;
    };
    disabled?: boolean;
    diameter?: number;
    vbitAngle?: string;
};

export type State = {
    version: 9;
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

    animations: Animations;

    gcode: {
        clearHeight: number;
        pauseHeight: number;
        items: Array<GCodePath | { type: 'pause'; message: string }>;
    };
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
