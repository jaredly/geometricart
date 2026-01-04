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

declare type AnimatableBoolean = boolean | string;

declare type AnimatableColor = number | string | Color;

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

declare type BaseKind =
    | {
          type: 'everything';
      }
    | {
          type: 'alternating';
          index: number;
      }
    | {
          type: 'explicit';
          ids: Record<string, true>;
      }
    | {
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

declare type Color =
    | {
          r: number;
          g: number;
          b: number;
      }
    | {
          h: number;
          s: number;
          l: number;
      }
    | [number, number, number];

declare type Coord = {
    x: number;
    y: number;
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
    style: {
        disabled?: boolean;
        fills: Record<string, Fill>;
        lines: Record<string, Line>;
        t?: TChunk;
        mods: PMods[];
    };
};

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
};

declare type GuideGeom =
    | Line_2
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

declare type InCicle = {
    type: 'InCircle';
    p1: Coord;
    p2: Coord;
    p3: Coord;
};

declare type Layer = {
    id: string;
    order: number;
    opacity: AnimatableNumber;
    rootGroup: string;
    entities: Record<string, Entity>;
    shared: Record<string, AnimatableValue>;
    guides: GuideGeom[];
};

declare type LayerStyle = {
    id: string;
    order: number;
    kind: BaseKind;
    fills: Record<string, Fill>;
    lines: Record<string, Line>;
    mods: PMods[];
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

declare type LineStyle = {
    id: string;
    order: number;
    kind: BaseKind;
    style: Line;
    mods: PMods[];
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
};

declare type PatternContents =
    | {
          type: 'shapes';
          styles: Record<string, ShapeStyle>;
      }
    | {
          type: 'weave';
          flip?: number;
          orderings: Record<string, number[]>;
          styles: Record<string, LineStyle>;
      }
    | {
          type: 'lines';
          styles: Record<string, LineStyle>;
      }
    | {
          type: 'layers';
          origin: AnimatableCoord;
          reverse: AnimatableBoolean;
          styles: Record<string, LayerStyle>;
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

declare type PMods =
    | {
          type: 'inset';
          v: AnimatableNumber;
          disabled?: boolean;
      }
    | {
          type: 'crop';
          id: string;
          hole?: boolean;
          mode?: CropMode;
          disabled?: boolean;
      }
    | {
          type: 'scale';
          v: AnimatableCoord | AnimatableNumber;
          origin?: AnimatableCoord;
          disabled?: boolean;
      }
    | {
          type: 'rotate';
          v: AnimatableNumber;
          origin?: AnimatableCoord;
          disabled?: boolean;
      }
    | {
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

declare type Segment = LineSegment | ArcSegment | QuadSegment;

declare type SegPrev = {
    segment: Segment;
    prev: Coord;
};

declare type Shadow =
    | {
          color?: AnimatableColor;
          offset?: AnimatableCoord | AnimatableNumber;
          blur?: AnimatableCoord | AnimatableNumber;
          inner?: AnimatableBoolean;
      }
    | string;

declare type ShapeKind =
    | BaseKind
    | {
          type: 'shape';
          key: string;
          rotInvariant: boolean;
      };

declare type ShapeStyle = {
    id: string;
    disabled?: boolean;
    order: number;
    kind: ShapeKind | ShapeKind[];
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

export declare type StateV0 = {
    shapes: Record<
        string,
        BarePath & {
            multiply?: string;
        }
    >;
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

declare type TilingShape =
    | {
          type: 'right-triangle';
          rotateHypotenuse: boolean;
          start: Coord;
          corner: Coord;
          end: Coord;
      }
    | {
          type: 'isocelese';
          flip?: boolean;
          first: Coord;
          second: Coord;
          third: Coord;
      }
    | {
          type: 'parallellogram';
          points: [Coord, Coord, Coord, Coord];
      };
