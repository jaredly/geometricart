declare type AddOp<T> = {
    op: 'add';
    path: Path;
    value: unknown;
};

declare type Adjustment = {
    id: string;
    shapes: string[];
    t?: TChunk;
    mods: PMods[];
    disabled?: boolean;
    shared?: Record<string, AnimatableValue>;
};

declare type AngleBisector = {
    type: 'AngleBisector';
    p1: Coord;
    p2: Coord;
    p3: Coord;
};

declare type AnimatableBoolean = boolean | string | number;

declare type AnimatableColor = number | string | Color | null;

declare type AnimatableCoord = Coord | string;

declare type AnimatableNumber = number | string;

declare type AnimatableValue = string;

declare type ArcSegment = {
    type: 'Arc';
    center: Coord;
    to: Coord;
    clockwise: boolean;
};

declare type BarePath = {
    origin: Coord;
    segments: Segment[];
    open?: boolean;
};

declare type BaseKind = {
    type: 'everything';
} | {
    type: 'alternating';
    index: number;
} | {
    type: 'explicit';
    ids: Record<string, true>;
} | {
    type: 'distance';
    corner: number;
    repeat: boolean;
    distances: number[];
};

declare type Box = {
    x: number;
    y: number;
    width: number;
    height: number;
};

declare type Circle = {
    type: 'Circle';
    center: Coord;
    radius: Coord;
    line?: boolean;
    half: boolean;
    multiples: number;
};

declare type CircleMark = {
    type: 'CircleMark';
    p1: Coord;
    p2: Coord;
    p3: Coord;
    angle: number;
    angle2?: number;
};

declare type CircumCircle = {
    type: 'CircumCircle';
    p1: Coord;
    p2: Coord;
    p3: Coord;
};

declare type CloneCircle = {
    type: 'CloneCircle';
    p1: Coord;
    p2: Coord;
    p3: Coord;
};

declare type Color = Rgb | Hsl | [number, number, number];

declare type Coord = {
    x: number;
    y: number;
};

declare type CopyOp<T> = {
    op: 'copy';
    from: Path;
    path: Path;
};

declare type Crop = {
    id: string;
    shape: string;
    mods?: PMods[];
};

declare type CropMode = 'rough' | 'half';

declare type Entity = Group | Pattern | EObject;

declare type EObject = {
    type: 'Object';
    id: string;
    shape: string;
    multiply?: boolean;
    style: {
        disabled?: boolean;
        fills: Record<string, Fill>;
        lines: Record<string, Line>;
        t?: TChunk;
        mods: PMods[];
    };
};

declare type ExportAnnotation = {
    type: 'img';
    id: string;
} | {
    type: 'video';
    id: string;
};

export declare type ExportHistory = History_2<State, ExportAnnotation>;

declare type Fill = {
    id: string;
    enabled?: AnimatableBoolean;
    shadow?: Shadow;
    zIndex?: AnimatableNumber;
    color?: AnimatableColor;
    rounded?: AnimatableNumber;
    opacity?: AnimatableNumber;
    tint?: AnimatableColor;
    thickness?: AnimatableNumber;
    mods: PMods[];
};

declare type Group = {
    type: 'Group';
    id: string;
    name?: string;
    entities: Record<string, number>;
    disabled?: boolean;
};

declare type GuideGeom = Line_2 | Split | Circle | CloneCircle | CircleMark | AngleBisector | PerpendicularBisector | Perpendicular | InCicle | Polygon | CircumCircle;

declare type History_2<T, An> = {
    version: 1;
    initial: T;
    nodes: Record<string, HistoryNode<T, An>>;
    annotations: Record<string, An[]>;
    root: string;
    tip: string;
    current: T;
    undoTrail: string[];
};

declare type HistoryNode<T, An> = {
    id: string;
    changes: JsonPatchOp<T>[];
    pid: string;
    children: string[];
};

declare type Hsl = {
    h: number;
    s: number;
    l: number;
};

declare type InCicle = {
    type: 'InCircle';
    p1: Coord;
    p2: Coord;
    p3: Coord;
};

declare type JsonPatchOp<T> = AddOp<T> | ReplaceOp<T> | RemoveOp<T> | MoveOp<T> | CopyOp<T>;

declare type Layer = {
    id: string;
    order: number;
    opacity: AnimatableNumber;
    rootGroup: string;
    entities: Record<string, Entity>;
    shared: Record<string, AnimatableValue>;
    guides: GuideGeom[];
};

declare type Line = {
    id: string;
    enabled?: AnimatableBoolean;
    shadow?: Shadow;
    zIndex?: AnimatableNumber;
    color?: AnimatableColor;
    width?: AnimatableNumber;
    sharp?: AnimatableBoolean;
    opacity?: AnimatableNumber;
    tint?: AnimatableColor;
    thickness?: AnimatableNumber;
    mods: PMods[];
};

declare type Line_2 = {
    type: 'Line';
    p1: Coord;
    p2: Coord;
    /** @deprecated */
    limit: boolean;
    extent?: number;
};

declare type LineSegment = {
    type: 'Line';
    to: Coord;
};

declare type MoveOp<T> = {
    op: 'move';
    from: Path;
    path: Path;
};

declare type Path = PathSegment[];

declare type PathSegment = {
    type: 'key';
    key: string | number;
} | {
    type: 'tag';
    key: string;
    value: string;
} | {
    type: 'single';
    isSingle: boolean;
};

declare type Pattern = {
    type: 'Pattern';
    id: string;
    tiling: {
        id: string;
        tiling: ThinTiling;
    };
    psize: Coord | number;
    contents: PatternContents;
    adjustments: Record<string, Adjustment>;
    mods: PMods[];
    shared?: Record<string, AnimatableValue>;
    disabled?: boolean;
};

declare type PatternContents = {
    type: 'shapes';
    styles: Record<string, ShapeStyle<ShapeKind>>;
} | {
    type: 'weave';
    flip?: number;
    orderings: Record<string, number[]>;
    styles: Record<string, ShapeStyle<BaseKind & {
        under?: boolean;
    }>>;
    shared?: Record<string, AnimatableValue>;
} | {
    type: 'lines';
    styles: Record<string, ShapeStyle<BaseKind>>;
    includeBorders?: boolean;
    sort?: AnimatableValue;
} | {
    type: 'layers';
    origin: AnimatableCoord;
    reverse: AnimatableBoolean;
    styles: Record<string, ShapeStyle<BaseKind>>;
    shared?: Record<string, AnimatableValue>;
};

declare type Perpendicular = {
    type: 'Perpendicular';
    p1: Coord;
    p2: Coord;
};

declare type PerpendicularBisector = {
    type: 'PerpendicularBisector';
    p1: Coord;
    p2: Coord;
};

declare type PMods = {
    type: 'stroke';
    width: AnimatableNumber;
    round: AnimatableBoolean;
    disabled?: boolean;
} | {
    type: 'inner';
    disabled?: boolean;
} | {
    type: 'inset';
    v: AnimatableNumber;
    disabled?: boolean;
} | {
    type: 'crop';
    id: string;
    hole?: boolean;
    mode?: CropMode;
    disabled?: boolean;
} | {
    type: 'scale';
    v: AnimatableCoord | AnimatableNumber;
    origin?: AnimatableCoord;
    disabled?: boolean;
} | {
    type: 'rotate';
    v: AnimatableNumber;
    origin?: AnimatableCoord;
    disabled?: boolean;
} | {
    type: 'translate';
    v: AnimatableCoord;
    disabled?: boolean;
};

declare type Polygon = {
    type: 'Polygon';
    p1: Coord;
    p2: Coord;
    sides: number;
    toCenter: boolean;
};

declare type QuadSegment = {
    type: 'Quad';
    control: Coord;
    to: Coord;
};

declare type RemoveOp<T> = {
    op: 'remove';
    path: Path;
    value: unknown;
};

declare type ReplaceOp<T> = {
    op: 'replace';
    path: Path;
    value: unknown;
    previous: unknown;
};

declare type Rgb = {
    r: number;
    g: number;
    b: number;
};

declare type Segment = LineSegment | ArcSegment | QuadSegment;

declare type SegPrev = {
    segment: Segment;
    prev: Coord;
};

declare type Shadow = {
    color?: AnimatableColor;
    offset?: AnimatableCoord | AnimatableNumber;
    blur?: AnimatableCoord | AnimatableNumber;
    inner?: AnimatableBoolean;
} | string;

declare type ShapeKind = BaseKind | {
    type: 'shape';
    key: string;
    rotInvariant: boolean;
};

declare type ShapeStyle<Kind> = {
    id: string;
    disabled?: boolean;
    order: number;
    kind: Kind | Kind[];
    fills: Record<string, Fill>;
    lines: Record<string, Line>;
    t?: TChunk;
    mods: PMods[];
};

declare type Split = {
    type: 'Split';
    p1: Coord;
    p2: Coord;
    count: number;
};

export declare type State = {
    shapes: Record<string, BarePath & {
        multiply?: string;
    }>;
    layers: Record<string, Layer>;
    crops: Record<string, Crop>;
    view: {
        ppi: number;
        background?: AnimatableColor;
        box: Box;
    };
    styleConfig: {
        seed: AnimatableNumber;
        palette: Color[];
        timeline: {
            ts: number[];
            lanes: {
                name: string;
                ys: number[];
                values: number[];
                easings: (string | null)[];
            }[];
        };
    };
};

declare type TChunk = {
    chunk: number;
    total: number;
    ease: string;
};

declare type ThinTiling = {
    shape: TilingShape;
    segments: SegPrev[];
};

declare type TilingShape = {
    type: 'right-triangle';
    rotateHypotenuse: boolean;
    start: Coord;
    corner: Coord;
    end: Coord;
} | {
    type: 'isocelese';
    flip?: boolean;
    first: Coord;
    second: Coord;
    third: Coord;
} | {
    type: 'parallellogram';
    points: [Coord, Coord, Coord, Coord];
};

export { }
