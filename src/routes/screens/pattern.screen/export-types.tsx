import {GuideGeom, Coord, Segment, BarePath} from '../../../types';

export type AnimatableNumber = number | string;
export type AnimatableBoolean = boolean | string;
export type AnimatableColor = number | string;
export type AnimatableCoord = Coord | string;

/*

# Ok a big idea:

ANY number input can instead be a (script) function.
color (hsl/palette index/etc)
tint (hsl added to color)
opacity
line width
inset
rotation (theta + origin)
scale (% + origin)

so you can just put a number, but you could also do like `rand(0.5, 1.0)`
and you can expand it out into a modal textarea.

I think I can clamp my undo/redo stack to like 100 items.

Ok, so you could also do like : opacity = `dist(self.center(), group.center())`
also for animation, like `rotation = t * 2 * π`
also for segmented animation, I could have `t` which is the whole thing, but segments
defined `t1`, `t2`, `t3` etc. and
t1 = `min(1, t * 3)`
t2 = `max(0, min(1, t * 3 - 1))`
t3 = `max(0, t * 3 - 2)`

BUT ALSO you could define different easing functions for t1, t2, t3.
hmmm and like t1a vs t1 idk.
 -> maybe t1ease? naw you can just ease(t1)
    -> ok but the better thing is to define a custom `t1` centrally, so you can muck with the easing function and everything comes along for the ride.



TOPLEVEL ADVANCED CONFIG:
- define a `seed`. All of the randoms will be seeded, for reproducibility.
- define custom animation things
- "palettes" that can be indexed into from scripts



# Crops idea

#

Pattern:

> Shapes

list of styling rules.
[everything]

[alternating #1]
[alternating #2]
...

(shape:rotation invariant, rotation dependent)
[shape #1]
[shape #2]
[shape #3]
...

[list of explicit shape IDs]
[list of explicit shape IDs]
^ shape IDs presented to the user as integers, but under the hood are probably (center-coord)

^ if a shape appears in multiple explicit lists ... it gets removed from other ones
^ NOPE: actually overriding is fine and good.

> Layers


> Lines


> Woven



Subsequent styling rules can override any part of the previous rules.

Fills are /ordered/, but identified by a genId. So you don't have to represent
the whole state of things to modify one thing.
(fractional indices for ordering)


Crops ... to embed or not to embed.
The question is: how often will we (a) have the same crop in several groups, and (b) want to modify that crop,
such that it applies to everything?
idk I feel like the answer is not often.

*/

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
export type State = {
    layers: Record<string, Layer>;
    crops: Record<string, {shape: Segment[]; mods?: Mods}>;
    view: {
        ppi: number;
        background?: AnimatableColor;
        box: Box;
    };
    styleConfig: {
        seed: AnimatableNumber;
        clocks: {
            name?: string;
            ease?: string;
            t0: number;
            t1: number;
        }[];
        palette: string[];
    };
};

export type Layer = {
    id: string;
    order: number;

    opacity: AnimatableNumber;
    rootGroup: string;
    entities: Record<string, Entity>;

    guides: GuideGeom[];
};

export type Group = {
    type: 'Group';
    id: string;
    name?: string;
    entities: Record<string, number>; // id -> order
    crops: {hole?: boolean; rough?: boolean; id: string}[];
};

export type Mods = {
    inset?: AnimatableNumber;
    scale?: AnimatableCoord | AnimatableNumber;
    scaleOrigin?: AnimatableCoord;
    offset?: AnimatableCoord;
    rotation?: AnimatableNumber;
    rotationOrigin?: AnimatableCoord;
    opacity?: AnimatableNumber;
    tint?: AnimatableColor;
    // for 3d rendering
    thickness?: AnimatableNumber;
};

export type Pattern = {
    type: 'Pattern';
    id: string;

    psize: Coord;
    contents: PatternContents;
    mods: Mods;
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
    | {type: 'explicit'; ids: Record<string, true>};

export type ShapeStyle = {
    id: string;
    order: number;
    kind: BaseKind | {type: 'shape'; key: string; rotInvariant: boolean};
    fills: Record<string, Fill>;
    lines: Record<string, Line>;
    mods?: Mods;
};

export type Fill = {
    id: string;
    zIndex?: AnimatableNumber;
    color?: AnimatableColor;
    rounded?: AnimatableNumber;
    mods?: Mods;
};

export type Line = {
    id: string;
    zIndex?: AnimatableNumber;
    color?: AnimatableColor;
    width?: AnimatableNumber;
    sharp?: AnimatableBoolean;
    mods?: Mods;
};

export type LineStyle = {
    id: string;
    order: number;
    kind: BaseKind;
    style: Line;
    mods?: Mods;
};

export type LayerStyle = {
    id: string;
    order: number;
    kind: BaseKind;
    fills: Record<string, Fill>;
    lines: Record<string, Line>;
    mods?: Mods;
};

export type Entity =
    | Group
    | Pattern
    | {
          type: 'Object';
          id: string;
          segments: Segment[];
          open?: boolean;
          style: ShapeStyle;
      };
