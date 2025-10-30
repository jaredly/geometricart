import {UndoableAction, UndoAction} from './state/Action';
import {Primitive} from './rendering/intersect';
import {angleTo, dist, Matrix} from './rendering/getMirrorTransforms';
import {SegmentWithPrev} from './rendering/clipPathNew';
import {CompassState} from './editor/compassAndRuler';
import {angleBetween} from './rendering/isAngleBetween';
import {closeEnough} from './rendering/epsilonToZero';
import {findCommonFractions, humanReadableFraction} from './routes/getPatternData';

// Should I do polar coords?
export type Coord = {x: number; y: number};

export type Id = string;

export type Line = {
    type: 'Line';
    p1: Coord;
    p2: Coord;
    /** @deprecated */
    limit: boolean;
    extent?: number;
};

export type Split = {
    type: 'Split';
    p1: Coord;
    p2: Coord;
    count: number;
};

export type CircleMark = {
    type: 'CircleMark';
    p1: Coord;
    p2: Coord;
    p3: Coord;
    angle: number;
    angle2?: number;
};

export type CloneCircle = {
    type: 'CloneCircle';
    p1: Coord;
    p2: Coord;
    p3: Coord;
};

export type GuideGeom =
    | Line
    | Split
    | Circle
    | CloneCircle
    | CircleMark
    | AngleBisector
    | PerpendicularBisector
    | Perpendicular
    | InCicle
    | Polygon
    | CircumCircle;

export type Perpendicular = {
    type: 'Perpendicular';
    p1: Coord;
    p2: Coord;
};

export type Polygon = {
    type: 'Polygon';
    p1: Coord;
    p2: Coord;
    sides: number;
    toCenter: boolean;
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
    'Split',
    'AngleBisector',
    'Circle',
    'PerpendicularBisector',
    'Perpendicular',
    'InCircle',
    'Polygon',
    'CircumCircle',
    'CircleMark',
];

export const guidePoints: {
    [x in GuideGeom['type']]: number;
} = {
    AngleBisector: 3,
    CircleMark: 3,
    InCircle: 3,
    CircumCircle: 3,
    Perpendicular: 2,
    CloneCircle: 3,
    Circle: 2,
    Line: 2,
    Split: 2,
    Polygon: 2,
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
    overshoot?: number | string; // yeah? like 10% or pixelsss
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

export type QuadSegment = {
    type: 'Quad';
    control: Coord;
    to: Coord;
};

export type LineSegment = {type: 'Line'; to: Coord};
export type Segment = LineSegment | ArcSegment | QuadSegment; // long = "the long way round"

export type PathGroup = {
    id: Id;
    // style: Style;
    group: Id | null;
    hide?: boolean;
    clipMode?: 'none' | 'remove' | 'normal' | 'fills';
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
    items: {[key: number]: T};
    next: number;
};

export type Cache = {
    guides: Idd<GuideElement>;
    // is it fine to dedup these primitives?
    // or do I need to keep them?
    // yeah let's dedup, and then each prim might point back to multiple guides.
    primitives: Idd<{prim: Primitive; guide: Array<number>}>;
    // Do we just say "link back to the guide" always?
    // is there a need to link back to the specific primitive?
    // yes there is.
    // for determining adjacent segments when drawing paths.
    // and in fact, an intersection will have 2+ primitives to hark back to.
    intersections: Idd<{coord: Coord; prims: Array<number>}>;
};

export type Pending = PendingGuide | PendingPath | {type: 'compass&ruler'};

export type PendingGuide = {
    type: 'Guide';
    points: Array<Coord>;
    kind: GuideGeom['type'];
    extent?: number;
    toggle: boolean;
    angle?: number;
};

export const guideNeedsAngle = (type: GuideGeom['type']) => type === 'CircleMark';

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

// This should ... hypothetically be enough to uniquely identify a point in history
export type Checkpoint = {
    branchId: number;
    branchLength: number;
    undo: number;
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
            parent: {branch: number; idx: number} | null;
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

export type Clip = {
    shape: Segment[];
    active: boolean;
    outside: boolean;
    defaultInsetBefore?: boolean;
};

export type View = {
    center: Coord;
    zoom: number;
    guides: boolean;
    hideDuplicatePaths?: boolean;
    roundedCorners?: boolean;
    laserCutMode?: boolean;
    background?: string | number;
    sketchiness?: number;
    texture?: TextureConfig;
    multi?: {
        outline: string | number | null;
        shapes: (string | number | null | undefined)[];
        columns: number;
        rows: number;
        combineGroups?: boolean;
        skipBacking?: boolean;
        traceAndMerge?: boolean;
        useFills?: boolean;
    };
};

export type Selection = {
    type: 'Guide' | 'Mirror' | 'Path' | 'PathGroup' | 'Overlay';
    ids: Array<string>;
};

export type Tab = 'Undo';

export type Attachment = {
    id: Id;
    contents: string; // base64 dontcha know
    name: string;
    width: number;
    height: number;
    perspectivePoints?: {
        from: [Coord, Coord, Coord, Coord];
        to: [Coord, Coord, Coord, Coord];
    };
};

export type Meta = {
    title: string;
    description: string;
    created: number;
    ppi: number;

    threedSettings?: {
        // style: {
        //     type: 'hdf'
        // } | {
        //     type: 'cardstock',
        //     base: 'hdf' | 'cereal',
        //     overhang: number, // in mm
        // } | {
        //     // I'd want this to be ... really thin?
        //     type: 'acrylic',
        //     thickness: number
        // },
        cameraDistance?: number;
        thickness?: number;
        gap?: number;
        shadowZoom?: number;
        lightPosition?: [number, number, number];
        useMultiSVG?: boolean;
    };
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
              custom: {[vbl: string]: number | Array<Id> | boolean};
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

export type Lerp = FloatLerp | ScriptLerp | PosScript;

export type ScriptLerp = {
    type: 'float-fn';
    code: string;
};

export type PosScript = {
    type: 'pos-fn';
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
    lerps: {[id: string]: Lerp};
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

    // So, if we're doing a straight cut, depth is the deal.
    // But for a v-bit, we don't specify depth manually.
    // That should be calculated based on the angle.
    depth: number;
    vbitAngle?: number;

    start: number;
    passDepth?: number;
    tabs?: {
        count: number;
        width: number;
        depth: number;
    };
    disabled?: boolean;
    diameter?: number;
};

export type State = {
    version: 12;

    nextId: number;
    history: History;
    meta: Meta;
    pending: Pending | null;
    compassState?: CompassState;
    paths: {[key: Id]: Path};
    // Pathgroups automatically happen when, for example, a path is created when a mirror is active.
    // SO: Paths are automatically /realized/, that is, when completing a path, the mirrored paths are also
    // added to the paths dict.
    // Whereas mirrored guides are /virtual/. Does that sound right? That means you can't individually disable mirrored guides.
    // But that sounds perfectly fine to me...
    pathGroups: {[key: Id]: PathGroup};
    guides: {[key: Id]: Guide};
    // TODO: Are we likely to need guide groups?
    // maybe not? idk.
    // guideGroups: {[key: Id]: GuideGroup},
    mirrors: {[key: Id]: Mirror};
    activeMirror: Id | null;
    view: View;

    historyView?: {
        preview?: 'corner' | number;
        preapplyPathUpdates?: boolean;
        hideOverlays?: boolean;
        zooms: {idx: number; view: Pick<View, 'zoom' | 'center'>}[];
        titles?: {idx: number; title: string; duration: number; speed?: number}[];
        skips: number[];
        start?: number;
        end?: number;
    };

    tilings: {[key: Id]: Tiling};

    clips: {[key: Id]: Clip};

    overlays: {[key: Id]: Overlay};

    // Non historied, my folks
    selection: Selection | null;
    tab: Tab;

    palettes: {[name: string]: Array<string>};
    // activePalette: string;
    palette: string[];
    attachments: {
        [key: Id]: Attachment;
    };

    animations: Animations;

    gcode: {
        clearHeight: number;
        pauseHeight: number;
        items: Array<GCodePath | {type: 'pause'; message: string}>;
    };
};

export type BarePath = {origin: Coord; segments: Segment[]; open?: boolean};

export type SegPrev = {segment: Segment; prev: Coord};

export const shapeKey = (shape: TilingShape): string => {
    switch (shape.type) {
        case 'parallellogram': {
            const [a, b, c, d] = shape.points;
            const x1 = dist(a, b);
            const x2 = dist(c, d);
            const y1 = dist(b, c);
            const y2 = dist(d, a);
            // aspectRatio
            let w = (x1 + x2) / 2;
            let h = (y1 + y2) / 2;

            if (closeEnough(w, h, 0.01)) {
                return `Square`;
            }

            if (w < h) [w, h] = [h, w];

            const aspectRatio = w / h;
            if (closeEnough(Math.round(aspectRatio), aspectRatio, 0.001))
                return `Rectangle ${Math.round(aspectRatio)}:1`;
            const fract = findCommonFractions(aspectRatio);
            if (fract) {
                return `Rectangle ${fract.num}:${fract.denom}`;
            }
            return `Rectangle ${aspectRatio.toFixed(3)}`;
        }
        case 'right-triangle': {
            let internalAngle = angleBetween(
                angleTo(shape.start, shape.corner),
                angleTo(shape.start, shape.end),
                true,
            );
            if (internalAngle > Math.PI) internalAngle = Math.PI * 2 - internalAngle;
            return `Right Triangle ${((internalAngle / Math.PI) * 180).toFixed(1)}º${shape.rotateHypotenuse ? ' flip' : ''}`;
        }
        case 'isocelese': {
            let internalAngle = angleBetween(
                angleTo(shape.first, shape.second),
                angleTo(shape.first, shape.third),
                true,
            );
            if (internalAngle > Math.PI) internalAngle = Math.PI * 2 - internalAngle;
            return `Isocelese Triangle ${((internalAngle / Math.PI) * 180).toFixed(1)}º ${shape.flip ? ' flip' : ''}`;
        }
    }
};

// export const shapeKey = (shape: TilingShape): string => {
//     switch (shape.type) {
//         case 'parallellogram': {
//             const [a, b, c, d] = shape.points;
//             const x1 = dist(a, b);
//             const x2 = dist(c, d);
//             const y1 = dist(b, c);
//             const y2 = dist(d, a);
//             // aspectRatio
//             let w = (x1 + x2) / 2;
//             let h = (y1 + y2) / 2;

//             if (w > h) [w, h] = [h, w];

//             const aspect = w / h;
//             return `parallelogram:${aspect.toFixed(3)}`;
//         }
//         case 'right-triangle': {
//             const internalAngle =
//                 angleBetween(
//                     angleTo(shape.start, shape.corner),
//                     angleTo(shape.start, shape.end),
//                     true,
//                 ) /
//                 Math.PI /
//                 2;
//             return `right-triangle:${internalAngle.toFixed(4)}:${shape.rotateHypotenuse}`;
//         }
//         case 'isocelese': {
//             const internalAngle =
//                 angleBetween(
//                     angleTo(shape.first, shape.second),
//                     angleTo(shape.first, shape.third),
//                     true,
//                 ) /
//                 Math.PI /
//                 2;
//             return `isocelese:${internalAngle.toFixed(4)}:${!!shape.flip}`;
//         }
//     }
// };

export type TilingShape =
    | {
          type: 'right-triangle';
          rotateHypotenuse: boolean;
          // 45/45/90 makes sense
          // 30/60/90 is the hexy
          // otherwise it'll have to do
          // the rotate dealio
          start: Coord;
          corner: Coord;
          end: Coord;
      }
    | {
          type: 'isocelese';
          flip?: boolean; // vs 'rotate'
          // Clockwise, where First is the "center" of the figure
          first: Coord;
          second: Coord;
          third: Coord;
      }
    | {
          type: 'parallellogram';
          // Clockwise
          points: [Coord, Coord, Coord, Coord];
      };

export type Tiling = {
    id: Id;
    // points: Coord[],
    shape: TilingShape;
    // sides: { from: Coord; kind: 'reflect' | 'rotate' | null }[];
    cache: {
        segments: SegPrev[];
        shapes: BarePath[];
        hash: string;
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
