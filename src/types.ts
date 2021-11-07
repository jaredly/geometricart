// Should I do polar coords?
export type Coord = { x: number; y: number };

export type Point = { type: 'Point'; coord: Coord };
// Is this the right representation?
// What does svg want?
export type Arc = { type: 'Arc'; center: Coord; t1: number; t2: number };

export type ShapeGeom = Line | Arc | Point;

export type Id = string;

export type Shape = {
    id: Id;
    geom: ShapeGeom;
    basedOn: Array<Id>;
    mirrors: Array<Id>;
};

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
export type Line = { type: 'Line'; p1: Coord; p2: Coord };

export type GuideGeom = Line | Circle | AngleBisector | PerpendicularBisector;

export type Circle = {
    type: 'Circle';
    center: Coord;
    radius: Coord;
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
    mirrors: Array<Id>;
};

export type Mirror = {
    id: Id;
    enabled: boolean;
    origin: Coord;
    point: Coord;
    // false = "disabled".
    // The original is always enabled.
    // An empty array here, with reflect = true just reflects over the
    // line between origin and point.
    rotational: Array<boolean>;
    reflect: boolean;
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

export type Segment =
    | { type: 'Line'; to: Coord }
    | { type: 'Arc'; center: Coord; to: Coord };

export type PathGroup = {
    id: Id;
    style: Style;
    group: Id | null;
};

export type State = {
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
};
