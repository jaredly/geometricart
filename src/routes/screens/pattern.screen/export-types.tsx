import {rgbToHex, rgbToString} from '../../../editor/rgbToHex';
import {scalePos} from '../../../editor/scalePos';
import {hslToRgb} from '../../../rendering/colorConvert';
import {coordKey} from '../../../rendering/coordKey';
import {
    Matrix,
    rotationMatrix,
    scaleMatrix,
    translationMatrix,
} from '../../../rendering/getMirrorTransforms';
import {GuideGeom, Coord, Segment, BarePath, Tiling, ThinTiling} from '../../../types';
import {pk, PKPath} from '../../pk';
import {RenderShadow} from './eval/evaluate';
import {colorToString, Rgb} from './utils/colors';
import {CropsAndMatrices} from './utils/resolveMods';

export type AnimatableNumber = number | string;
export type AnimatableBoolean = boolean | string | number;
export type AnimatableValue = string;
export type AnimatableColor = number | string | null;
export type AnimatableCoord = string;

export type Shape =
    // v center + corner
    | {type: 'rect'; pts: [Coord, Coord]}
    // v center + 2 points
    | {type: 'rect2'; pts: [Coord, Coord, Coord]}
    // v 2-4 points bbox
    | {type: 'rectbox'; pts: Coord[]}
    // v center + point
    | {type: 'circle'; pts: [Coord, Coord]}
    // v 3 points circumcircle
    | {type: 'circum'; pts: [Coord, Coord, Coord]}
    // v center + 2 points
    | {type: 'ellipse'; pts: [Coord, Coord, Coord]}
    // v 4 points
    | {type: 'circullipse'; pts: [Coord, Coord, Coord, Coord]}
    // v center + 2 corners, second point snaps to integer # sides
    | {type: 'regular'; pts: [Coord, Coord, Coord]}
    // v 3 corners
    | {type: 'circugon'; pts: [Coord, Coord, Coord]}
    // v center + 2 corners + however many more points you want (mirrored)
    | {type: 'star'; pts: Coord[]}
    // v 3 corners + detail points
    | {type: 'circustar'; pts: Coord[]}
    // v 3+ points
    | {type: 'freehand'; pts: Coord[]}
    | BarePath;

export type Box = {x: number; y: number; width: number; height: number};

export type Hsl = {h: number; s: number; l: number};
export type Color = Rgb | Hsl | [number, number, number];

export const colorToRgb = (c: Color): {r: number; g: number; b: number} =>
    Array.isArray(c)
        ? rgbFromArr(c)
        : 'h' in c
          ? rgbFromArr(hslToRgb(c.h / 360, c.s / 100, c.l / 100))
          : c;

const rgbFromArr = (c: [number, number, number]) => ({r: c[0], g: c[1], b: c[2]});

export type Crop = {
    id: string;
    shape: ShapeNode;
    // shape: string;
    mods: PMods[];
};

export type ShapeNode =
    | {type: 'shape'; path: BarePath; mods: PMods[]}
    | {type: 'multiply'; shape: ShapeNode; multiply: string; mods: PMods[]}
    | {type: 'op'; shapes: ShapeNode[]; mods: PMods[]; op: 'union' | 'intersection' | 'difference'};

export type OrderItem = {id: string; order: number};
export type Orderable<T extends OrderItem> = Record<string, T>;

export type EntityRoot = {
    rootGroup: string;
    entities: Record<string, Entity>;
};

export type Group = {
    type: 'Group';
    id: string;
    name?: string;
    entities: Record<string, number>; // id -> order
    disabled: string;
    shared: Orderable<OValue<AnimatableValue>>;
    opacity: AnimatableNumber;
};

export type CropMode = 'rough' | 'half';

export type PMods =
    | {type: 'stroke'; width: AnimatableNumber; round: AnimatableBoolean; disabled?: boolean}
    | {type: 'inner'; disabled?: boolean}
    | {type: 'inset'; v: AnimatableNumber; disabled?: boolean}
    | {type: 'crop'; id: string; hole?: boolean; mode?: CropMode; disabled?: boolean}
    | {
          type: 'scale';
          v: AnimatableCoord | AnimatableNumber;
          origin?: AnimatableCoord;
          disabled?: boolean;
      }
    | {type: 'rotate'; v: AnimatableNumber; origin?: AnimatableCoord; disabled?: boolean}
    | {type: 'translate'; v: AnimatableCoord; disabled?: boolean};

export type ConcretePMod =
    | {type: 'inner'}
    | {type: 'stroke'; width: number; round: boolean}
    | {type: 'inset'; v: number; disabled?: boolean}
    | {type: 'crop'; id: string; hole?: boolean; mode?: CropMode; disabled?: boolean}
    | {type: 'scale'; v: Coord | number; origin?: Coord; disabled?: boolean}
    | {type: 'rotate'; v: number; origin?: Coord; disabled?: boolean}
    | {type: 'translate'; v: Coord; disabled?: boolean};

export type SMods = PMods;

export type NPMods = {
    type: 'mods';
    inset: AnimatableNumber;
    opacity: AnimatableNumber;
    tint: AnimatableColor;
    thickness: AnimatableNumber;
};

export const insetPkPath = (path: PKPath, inset: number) => {
    if (Math.abs(inset) < 0.00001) return;
    const stroke = path.copy().stroke({
        width: Math.abs(inset) * 2,
    })!;
    if (!stroke) return;
    path.op(stroke, inset < 0 ? pk.PathOp.Union : pk.PathOp.Difference);
    stroke.delete();
};

export const modMatrix = (mod: ConcretePMod, origin?: Coord) => {
    const tx: Matrix[] = [];
    switch (mod.type) {
        case 'scale': {
            const scale = typeof mod.v === 'number' ? {x: mod.v, y: mod.v} : mod.v;
            const sorigin = mod.origin ?? origin;
            if (sorigin) {
                tx.push(translationMatrix(scalePos(sorigin, -1)));
            }
            tx.push(scaleMatrix(scale.x, scale.y));
            if (sorigin) {
                tx.push(translationMatrix(sorigin));
            }
            break;
        }
        case 'rotate': {
            const rorigin = mod.origin ?? origin;
            if (rorigin) {
                tx.push(translationMatrix(scalePos(rorigin, -1)));
            }
            tx.push(rotationMatrix(mod.v));
            if (rorigin) {
                tx.push(translationMatrix(rorigin));
            }
            break;
        }
        case 'translate': {
            tx.push(translationMatrix(mod.v));
            break;
        }
        default:
            throw new Error(`no please ${mod.type}`);
    }
    return tx;
};

export type PatternSize = {type: 'uniform'; size: number} | {type: 'coord'; coord: Coord};

export type Pattern = {
    type: 'Pattern';
    id: string;
    tiling: {id: string; tiling: ThinTiling};

    psize: PatternSize;
    contents: Orderable<PatternContents>;
    // shape and the mods
    adjustments: Record<string, Adjustment>;
    mods: PMods[];
    shared: Orderable<OValue<AnimatableValue>>;
    disabled: boolean;
};

export type Adjustment = {
    id: string;
    shapes: string[];
    t: TChunk | null;
    mods: PMods[];
    disabled: boolean;
    shared: Orderable<OValue<AnimatableValue>>;
};

export type OValue<T> = {id: string; order: number; value: T; disabled: boolean};

export type PatternContents =
    | {
          type: 'shapes';
          id: string;
          order: number;
          disabled: string;
          styles: Orderable<ShapeStyle<ShapeKind>>;
      }
    | {
          type: 'weave';
          id: string;
          order: number;
          disabled: string;
          flip?: number;
          orderings: Record<string, number[]>;
          styles: Orderable<ShapeStyle<BaseKind>>;
          shared: Orderable<OValue<AnimatableValue>>;
      }
    | {
          type: 'lines';
          id: string;
          order: number;
          disabled: string;
          styles: Orderable<ShapeStyle<BaseKind>>;
          includeBorders?: boolean;
          sort: AnimatableValue;
      }
    | {
          type: 'layers';
          id: string;
          order: number;
          disabled: string;
          origin: AnimatableCoord;
          reverse: AnimatableBoolean;
          styles: Orderable<ShapeStyle<BaseKind>>;
          shared: Orderable<OValue<AnimatableValue>>;
      };

export type BaseKind =
    | {type: 'alternating'; index: number}
    | {type: 'explicit'; ids: Record<string, true>}
    | {type: 'distance'; corner: number; repeat: boolean; distances: number[]};

export type ShapeKind = BaseKind | {type: 'shape'; key: string; rotInvariant: boolean};

export const describeKind = (kind: ShapeKind) => {
    switch (kind.type) {
        case 'alternating':
            return `alternative ${kind.index}`;
        case 'explicit':
            return `${Object.keys(kind.ids).length} ids`;
        case 'distance':
            return `rings around corner ${kind.corner}`;
        case 'shape':
            return `matching shape ${kind.key}`;
    }
};

export type ShapeStyle<Kind> = {
    id: string;
    disabled: string;
    order: number;
    // TODO: maybe have a kind that's like "anything intersecting with this shape"?
    // Could also be interesting to have an `animatedKind` where we select
    // the items effected by some script
    kind: Kind[];
    items: Orderable<FillOrLine>;
    t: TChunk | null;
    mods: PMods[];
};

export type TChunk = {chunk: number; total: number; ease: string};

export type ConcreteShadow = {
    color?: Color;
    offset?: Coord;
    blur?: Coord;
};

export type Shadow =
    | {
          color?: AnimatableColor;
          offset?: AnimatableCoord | AnimatableNumber;
          blur?: AnimatableCoord | AnimatableNumber;
          inner?: AnimatableBoolean;
      }
    | string;

export const shadowKey = (sh: ConcreteShadow) =>
    `${coordKey(sh.blur ?? {x: 0, y: 0})}-${coordKey(sh.offset ?? {x: 0, y: 0})}-${colorToString(sh.color ?? [0, 0, 0]).replace('#', '')}`;

export type ConcreteFillOrLine = {
    id: string;
    enabled?: boolean;
    shadow?: RenderShadow;
    zIndex?: number;
    color?: Color;
    rounded?: number;
    opacity?: number;
    tint?: Color;
    thickness?: number;

    mods: CropsAndMatrices;

    line?: {
        width?: number;
        sharp?: boolean;
        dashes?: {intervals: number[]; count: number; phase: number};
    };
};

export type FillOrLine = {
    id: string;
    order: number;
    enabled?: AnimatableBoolean;
    shadow?: Shadow;
    zIndex?: AnimatableNumber;
    color?: AnimatableColor;
    // skcornerpatheffect
    rounded?: AnimatableNumber;
    opacity?: AnimatableNumber;
    tint?: AnimatableColor;
    thickness?: AnimatableNumber;
    line?: LineItems;

    mods: PMods[];
};

export type LineItems = {
    width?: AnimatableNumber;
    sharp?: AnimatableBoolean;
    dashes?: AnimatableValue; // intervals[], count, phase
};

export type LineStyle<Kind> = {
    id: string;
    order: number;
    kind: Kind;
    style: FillOrLine;
    mods: PMods[];
};

export type EObject = {
    type: 'Object';
    id: string;
    shape: string;
    multiply?: boolean;
    style: {
        disabled?: boolean;
        items: Record<string, FillOrLine>;
        t?: TChunk;
        mods: PMods[];
    };
};

export type Entity = Group | Pattern | EObject;
