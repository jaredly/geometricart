import {
    Angle,
    anglesEqual,
    backAngle,
    isAngleBetweenAngles,
    isInside,
    negPiToPi,
    sortAngles,
} from './clipPath';
import { angleIsBetween, closeEnoughAngle } from './intersect';

export class IntersectionError extends Error {
    basic: string;
    entries: Array<SegmentIntersection>;
    constructor(message: string, entries: Array<SegmentIntersection>) {
        super(message + `: Entries ${JSON.stringify(entries)}`);
        this.basic = message;
        this.entries = entries;
    }
}

/** One segment's contribution to the hit intersection */
/**
 * Hmm I might actually want this to be different.
 * Have them actually be split up.
 * So that we can re-use them later? although ... then
 * hmmmm
 * maybe party needs an ID too.
 */
export type SegmentIntersection = {
    shape: number;
    theta: Angle;
    // if false, this is the start of the segment
    enter: boolean;
    // if false, this is the end of the segment
    exit: boolean;
    // distance to the end of the segment. used for sorting.
    distance: number;
    // idx
    segment: number;
    id: number;
    coordKey: string;
};

/**
 * Ok what we do here is, from the entries,
 * produce a list of pairs.
 *
 * Now, if there are more than ... 2 enters and 2 exits, we need more help.
 * and this could in fact happen, in some degenerate cases? Will have to figure that out.
 * and tbh I could just bail?
 * hmmmm ok maybe it's not actually possible for this to happen.
 * ok I'll throw an error in that case, and catch it higher up
 */

// So I think I want untangleHit to be the one to tell us whether
// a given pair ... includes an exit that is "exiting" the other shape ...
/**
 * And the way to do that ... is find the entries that are .. a line .... hmm but that
 * wouldn't give us for co-intersections.
 * ok, yeah see if the exit as an (enter, exit) of the other shape id, in that order, clockwise from it.
 * and then we know that it is "going into". likewise, if there's an (exit, enter) of the other shape id,
 * in that order, we know it's leaving the other shape.
 * wait are there only those two options?
 * what about going tangent? oh I don't think I handle that...
 */

export const findFirstExit = (transitions: HitTransitions, exitId: number) => {
    if (transitions.type === 'straight') {
        if (transitions.transition.exit.id !== exitId) {
            return null;
        }
        return transitions.transition.goingInside;
    } else if (transitions.type === 'cross') {
        const t = transitions.transitions.find((p) => p.exit.id === exitId);
        return t ? t.goingInside : null;
    } else {
        if (transitions.inside.id === exitId) {
            return true;
        }
        if (transitions.outside.id === exitId) {
            return false;
        }
        return null;
    }
};

export const findExit = (
    transitions: HitTransitions,
    entryId: number,
    biasInside: boolean | null,
    exits: { [key: string]: SegmentIntersection },
): null | [SegmentIntersection, boolean | null] => {
    if (transitions.type === 'straight') {
        if (transitions.transition.entry.id !== entryId) {
            return null;
        }
        return [
            transitions.transition.exit,
            transitions.transition.goingInside,
        ];
    } else if (transitions.type === 'cross') {
        const t = transitions.transitions.find((p) => p.entry.id === entryId);
        return t ? [t.exit, t.goingInside] : null;
    } else {
        if (
            biasInside == null &&
            (exits[transitions.inside.id] || !exits[transitions.outside.id])
        ) {
            return [transitions.inside, true];
        }

        if (biasInside === true) {
            return [transitions.inside, true];
        }
        return [transitions.outside, false];
    }
};

type Cross = {
    type: 'cross';
    transitions: [Transition, Transition];
};

export type HitTransitions =
    | { type: 'straight'; transition: Transition }
    | Cross
    // We don't know which entry is associated with which exit,
    // because the entries are the same.
    | {
          type: 'ambiguous';
          inside: SegmentIntersection;
          outside: SegmentIntersection;
          back: Angle;
      };

export type Transition = {
    entry: SegmentIntersection;
    exit: SegmentIntersection;
    goingInside: boolean | null;
};

export const handleHitAmbiguity = ({
    transitions: [one, two],
}: Cross): HitTransitions => {
    // ok,
    // so actually once we have this cross,
    // we can just know inside and outside.
    // the [shape] doesn't actually matter I don't think?
    // if (angleIsBetween(one.))
    // const oneBack = backAngle(one.entry.theta);
    // const twoBack = backAngle(two.entry.theta);
    // if (one.goingInside === null) {
    //     one.goingInside = isAngleBetweenAngles(
    //         twoBack,
    //         one.exit.theta,
    //         two.exit.theta,
    //         false,
    //     );
    // }
    // if (two.goingInside === null) {
    //     two.goingInside = isAngleBetweenAngles(
    //         oneBack,
    //         two.exit.theta,
    //         one.exit.theta,
    //         false,
    //     );
    // }

    // Same entrance! You should pick the exit that keeps with your inside/outside status
    if (anglesEqual(one.entry.theta, two.entry.theta)) {
        // soo .... it seems like we might possibly encounter a place
        // where both entrances and exits are the same.
        if (anglesEqual(one.exit.theta, two.exit.theta)) {
            return {
                type: 'cross',
                transitions: [
                    { ...one, goingInside: null },
                    { ...two, goingInside: null },
                ],
            };
        }
        // in this case, will it still work?
        // tbh it might still work.
        return {
            type: 'ambiguous',
            inside: one.goingInside ? one.exit : two.exit,
            outside: one.goingInside ? two.exit : one.exit,
            back: one.entry.theta,
        };
    }
    // Same exit! Both are now ambiguous, we can't know inside/outside from here.
    if (anglesEqual(one.exit.theta, two.exit.theta)) {
        // AHH OK but we can, actually.
        // because one will be /coming from/ the outside.
        // const sort = sortAngles(one.entry.theta, two.entry.theta);
        const oneInside = isInside(
            one.entry.theta,
            backAngle(one.exit.theta),
            two.entry.theta,
        );
        return {
            type: 'cross',
            transitions: [
                { ...one, goingInside: !oneInside },
                { ...two, goingInside: oneInside },
            ],
        };
    }
    // If we're doubling back, we can't know if we're going inside
    if (anglesEqual(one.entry.theta, backAngle(one.exit.theta))) {
        one.goingInside = null;
    }
    // If we're doubling back, we can't know if we're going inside
    if (anglesEqual(two.entry.theta, backAngle(two.exit.theta))) {
        two.goingInside = null;
    }
    return { type: 'cross', transitions: [one, two] };
};

export const untangleHit = (
    entries: Array<SegmentIntersection>,
    debug = false,
): HitTransitions => {
    const sides: Array<Side> = [];
    entries.forEach((entry) => {
        if (entry.enter) {
            sides.push({
                kind: { type: 'enter' },
                entry,
                // So, we could instead to `angleBetween(0, entry.theta + Math.PI, true)`
                // which might more effectively normalize? idk.
                // theta: negPiToPi(entry.theta + Math.PI),
                theta: backAngle(entry.theta),
            });
        }
        if (entry.exit) {
            sides.push({
                kind: { type: 'exit', goingInside: null },
                entry,
                theta: entry.theta,
            });
        }
    });
    // Sorting in clockwise order
    // sides.sort((a, b) => a.theta - b.theta);
    sides.sort((a, b) => sortAngles(a.theta, b.theta));
    if (debug) {
        console.log(`Untangle`, entries, sides);
    }
    if (sides.length === 2) {
        const [a, b] = sides;
        if (a.kind.type === b.kind.type) {
            throw new IntersectionError(
                `both sides have same entry? ${a.kind.type}`,
                entries,
            );
        }
        return { type: 'straight', transition: sidesPair(a, b) };
    }
    /**
     * So, going clockwise:
     * exit to enter, love it.
     * enter to exit, ONLY if the following one is also an exit.
     * exit to exit, nope. enter to enter, nope.
     */
    if (sides.length !== 4) {
        // console.log('sides', sides);
        throw new IntersectionError(`Sides neither 2 nor 4`, entries);
    }

    /**
     * Going around clockwise from an exit, if you see [enter, exit] from the other shape,
     * you are going INSIDE
     * if you see [exit, enter] from the other shape, you are going OUTSIDE.
     *
     * So, yeah really we just need to look for the first thing from the other shape.
     */
    sides.forEach((side, i0) => {
        if (side.kind.type !== 'exit') {
            return;
        }
        for (let i = 0; i < 4; i++) {
            const j = (i0 + i) % 4;
            if (sides[j].entry.shape !== side.entry.shape) {
                side.kind.goingInside = sides[j].kind.type === 'enter';
                break;
            }
        }
    });

    // OPTIONS:
    // ab, cd
    // ad, bc
    // it's never an option, for non-adjacent sides to connect.

    // TODOTODO: WHAT IF the segments intersect????
    // oh maybe it actually doesn't matter? I'll arbitrarily pick one, and the other one comes along?
    // hmm except I don't think that my `intersect` function properly returns relevant endpoints...
    // yup that's right it doesn't. So I'll need to account for that.
    // but then maybe picking one arbitrarily would work?

    /// ooof ok I'll need the whole compareAngles setup, because arcs might be tangent, but also
    // have a definite side they fall out on.
    const [a, b, c, d] = sides;

    // if (a.kind.type === 'exit' && b.kind.type === 'exit') {
    //     a.kind.goingInside = true;
    //     b.kind.goingInside = false;
    // }
    // if (b.kind.type === 'exit' && c.kind.type === 'exit') {
    //     b.kind.goingInside = false;
    //     c.kind.goingInside = true;
    // }
    // if (c.kind.type === 'exit' && d.kind.type === 'exit') {
    //     c.kind.goingInside = false;
    //     d.kind.goingInside = true;
    // }
    // if (d.kind.type === 'exit' && a.kind.type === 'exit') {
    //     d.kind.goingInside = false;
    //     a.kind.goingInside = true;
    // }

    if (
        (a.kind.type === 'exit' && b.kind.type === 'enter') ||
        (a.kind.type === 'enter' &&
            b.kind.type === 'exit' &&
            c.kind.type === 'exit')
    ) {
        return handleHitAmbiguity({
            type: 'cross',
            transitions: [sidesPair(a, b), sidesPair(c, d)],
        });
    }
    return handleHitAmbiguity({
        type: 'cross',
        transitions: [sidesPair(a, d), sidesPair(b, c)],
    });
};
type Exit = {
    type: 'exit';
    goingInside: boolean | null;
};

/**
 * Eh ok untangleHit could really use some unit tests.
 */
type Side = {
    kind: { type: 'enter' } | Exit;
    entry: SegmentIntersection;
    theta: Angle;
    // theta: number;
};
const sidesPair = (a: Side, b: Side): Transition =>
    a.kind.type === 'enter'
        ? {
              entry: a.entry,
              exit: b.entry,
              goingInside: (b.kind as Exit).goingInside,
          }
        : { entry: b.entry, exit: a.entry, goingInside: a.kind.goingInside };
