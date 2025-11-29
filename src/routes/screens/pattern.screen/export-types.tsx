import {mulPos} from '../../../animation/mulPos';
import {scalePos} from '../../../editor/scalePos';
import {hslToRgb} from '../../../rendering/colorConvert';
import {
    Matrix,
    rotationMatrix,
    scaleMatrix,
    translationMatrix,
} from '../../../rendering/getMirrorTransforms';
import {GuideGeom, Coord, Segment, BarePath} from '../../../types';
import {pk, PKPath} from '../../pk';

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

export type Crop = {id: string; shape: Segment[]; mods?: PMods[]};
export type State = {
    layers: Record<string, Layer>;
    crops: Record<string, Crop>;
    view: {
        ppi: number;
        background?: AnimatableColor;
        box: Box;
    };
    styleConfig: {
        seed: AnimatableNumber;
        // clocks: {
        //     name?: string;
        //     ease?: string;
        //     t0: number;
        //     t1: number;
        // }[];
        palette: Color[];
        // START HERE:
        timeline: {
            // 0 to 1, sorted
            ts: number[];
            lanes: {
                name: string;
                // sorted orders
                ys: number[];
                // index into ys
                // one number per `t` in `ts`
                values: number[];
                // easings
                easings: (string | null)[];
            }[];
        };
    };
};

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
    // mods: PMod[];
    // crops: {hole?: boolean; rough?: boolean; id: string}[];
};

// export type ConcreteMods = {
//     inset?: number;
//     scale?: Coord | number;
//     scaleOrigin?: Coord;
//     offset?: Coord;
//     rotation?: number;
//     rotationOrigin?: Coord;
//     // Non-positional
//     opacity?: number;
//     tint?: Color;
//     // for 3d rendering
//     thickness?: number;
// };

export type CropMode = 'rough' | 'half';

export type PMods =
    | {type: 'inset'; v: AnimatableNumber}
    | {type: 'crop'; id: string; hole?: boolean; mode?: CropMode}
    | {type: 'scale'; v: AnimatableCoord | AnimatableNumber; origin?: AnimatableCoord}
    | {type: 'rotate'; v: AnimatableNumber; origin?: AnimatableCoord}
    | {type: 'translate'; v: AnimatableCoord};

export type ConcretePMod =
    | {type: 'inset'; v: number}
    | {type: 'crop'; id: string; hole?: boolean; mode?: CropMode}
    | {type: 'scale'; v: Coord | number; origin?: Coord}
    | {type: 'rotate'; v: number; origin?: Coord}
    | {type: 'translate'; v: Coord};

export type SMods = PMods;

export type NPMods = {
    type: 'mods';
    inset: AnimatableNumber;
    opacity: AnimatableNumber;
    tint: AnimatableColor;
    thickness: AnimatableNumber;
};

// export type Mods = {
//     inset?: AnimatableNumber;
//     scale?: AnimatableCoord | AnimatableNumber;
//     scaleOrigin?: AnimatableCoord;
//     offset?: AnimatableCoord;
//     rotation?: AnimatableNumber;
//     rotationOrigin?: AnimatableCoord;
//     // Non-positional
//     opacity?: AnimatableNumber;
//     tint?: AnimatableColor;
//     // for 3d rendering
//     thickness?: AnimatableNumber;
// };

export const insetPkPath = (path: PKPath, inset: number) => {
    if (Math.abs(inset) < 0.00001) return;
    const stroke = path.copy().stroke({
        width: Math.abs(inset),
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

// export const modsTransforms = (mods: ConcreteMods, origin?: Coord) => {
//     const tx: Matrix[] = [];
//     if (mods.scale) {
//         const scale = typeof mods.scale === 'number' ? {x: mods.scale, y: mods.scale} : mods.scale;
//         const sorigin = mods.scaleOrigin ?? origin;
//         if (sorigin) {
//             tx.push(translationMatrix(scalePos(sorigin, -1)));
//         }
//         tx.push(scaleMatrix(scale.x, scale.y));
//         if (sorigin) {
//             tx.push(translationMatrix(sorigin));
//         }
//     }
//     if (mods.rotation) {
//         const rorigin = mods.rotationOrigin ?? origin;
//         if (rorigin) {
//             tx.push(translationMatrix(scalePos(rorigin, -1)));
//         }
//         tx.push(rotationMatrix(mods.rotation));
//         if (rorigin) {
//             tx.push(translationMatrix(rorigin));
//         }
//     }
//     if (mods.offset) {
//         tx.push(translationMatrix(mods.offset));
//     }
//     return tx;
// };

export type Pattern = {
    type: 'Pattern';
    id: string;

    psize: Coord | number;
    contents: PatternContents;
    mods: PMods[];
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

export type ShapeStyle = {
    id: string;
    disabled?: boolean;
    order: number;
    // TODO: maybe have a kind that's like "anything intersecting with this shape"?
    // Could also be interesting to have an `animatedKind` where we select
    // the items effected by some script
    kind: BaseKind | {type: 'shape'; key: string; rotInvariant: boolean};
    fills: Record<string, Fill>;
    lines: Record<string, Line>;
    mods: PMods[];
};

export type Fill = {
    id: string;
    zIndex?: AnimatableNumber;
    color?: AnimatableColor;
    rounded?: AnimatableNumber;
    opacity?: AnimatableNumber;
    tint?: AnimatableColor;
    thickness?: AnimatableNumber;

    mods: PMods[];
};

export type Line = {
    id: string;
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
    segments: Segment[];
    open?: boolean;
    style: ShapeStyle;
};

export type Entity = Group | Pattern | EObject;
