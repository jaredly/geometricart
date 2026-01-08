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
import {colorToString} from './utils/colors';
import {CropsAndMatrices} from './utils/resolveMods';

export type AnimatableNumber = number | string;
export type AnimatableBoolean = boolean | string;
export type AnimatableValue = string;
export type AnimatableColor = number | string | Color;
export type AnimatableCoord = Coord | string;

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

export type Color =
    | {r: number; g: number; b: number}
    | {h: number; s: number; l: number}
    | [number, number, number];

export const colorToRgb = (c: Color): {r: number; g: number; b: number} =>
    Array.isArray(c)
        ? rgbFromArr(c)
        : 'h' in c
          ? rgbFromArr(hslToRgb(c.h / 360, c.s / 100, c.l / 100))
          : c;

const rgbFromArr = (c: [number, number, number]) => ({r: c[0], g: c[1], b: c[2]});

export type Crop = {id: string; shape: string; mods?: PMods[]};

export type Layer = {
    id: string;
    order: number;

    opacity: AnimatableNumber;
    rootGroup: string;
    entities: Record<string, Entity>;
    shared: Record<string, AnimatableValue>;

    guides: GuideGeom[];
};

export type Group = {
    type: 'Group';
    id: string;
    name?: string;
    entities: Record<string, number>; // id -> order
    disabled?: boolean;
};

export type CropMode = 'rough' | 'half';

export type PMods =
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

export type Pattern = {
    type: 'Pattern';
    id: string;
    tiling: {id: string; tiling: ThinTiling};

    psize: Coord | number;
    contents: PatternContents;
    // shape and the mods
    adjustments: Record<string, Adjustment>;
    mods: PMods[];
    shared?: Record<string, AnimatableValue>;
    disabled?: boolean;
};

export type Adjustment = {
    id: string;
    shapes: string[];
    t?: TChunk;
    mods: PMods[];
    disabled?: boolean;
    shared?: Record<string, AnimatableValue>;
};

export type PatternContents =
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

export type BaseKind =
    | {type: 'everything'}
    | {type: 'alternating'; index: number}
    | {type: 'explicit'; ids: Record<string, true>}
    | {type: 'distance'; corner: number; repeat: boolean; distances: number[]};

export type ShapeKind = BaseKind | {type: 'shape'; key: string; rotInvariant: boolean};

export type ShapeStyle = {
    id: string;
    disabled?: boolean;
    order: number;
    // TODO: maybe have a kind that's like "anything intersecting with this shape"?
    // Could also be interesting to have an `animatedKind` where we select
    // the items effected by some script
    kind: ShapeKind | ShapeKind[];
    fills: Record<string, Fill>;
    lines: Record<string, Line>;
    t?: TChunk;
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

export type ConcreteFill = {
    id: string;
    enabled?: boolean;
    shadow?: Shadow;
    zIndex?: number;
    color?: Color;
    rounded?: number;
    opacity?: number;
    tint?: Color;
    thickness?: number;

    mods: CropsAndMatrices;
};

export type Fill = {
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

export type ConcreteLine = {
    id: string;
    enabled?: boolean;
    shadow?: ConcreteShadow;
    zIndex?: number;
    color?: Color;
    width?: number;
    sharp?: boolean;
    opacity?: number;
    tint?: Color;
    thickness?: number;

    mods: CropsAndMatrices;
};

export type Line = {
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

export type LineStyle = {
    id: string;
    order: number;
    kind: BaseKind;
    style: Line;
    mods: PMods[];
};

export type LayerStyle = {
    id: string;
    order: number;
    kind: BaseKind;
    fills: Record<string, Fill>;
    lines: Record<string, Line>;
    mods: PMods[];
};

export type EObject = {
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

export type Entity = Group | Pattern | EObject;
