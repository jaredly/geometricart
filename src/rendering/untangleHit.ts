import { negPiToPi } from './clipPath';

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
    theta: number;
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

export type Transition = {
    entry: SegmentIntersection;
    exit: SegmentIntersection;
};

export const untangleHit = (
    entries: Array<SegmentIntersection>,
): Array<[SegmentIntersection, SegmentIntersection, boolean | null]> => {
    const sides: Array<Side> = [];
    entries.forEach((entry) => {
        if (entry.enter) {
            sides.push({
                kind: { type: 'enter' },
                entry,
                // So, we could instead to `angleBetween(0, entry.theta + Math.PI, true)`
                // which might more effectively normalize? idk.
                theta: negPiToPi(entry.theta + Math.PI),
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
    sides.sort((a, b) => a.theta - b.theta);
    if (sides.length === 2) {
        const [a, b] = sides;
        if (a.kind.type === b.kind.type) {
            throw new IntersectionError(
                `both sides have same entry? ${a.kind.type}`,
                entries,
            );
        }
        return [sidesPair(a, b)];
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
    const [a, b, c, d] = sides;
    if (
        (a.kind.type === 'exit' && b.kind.type === 'enter') ||
        (a.kind.type === 'enter' &&
            b.kind.type === 'exit' &&
            c.kind.type === 'exit')
    ) {
        return [sidesPair(a, b), sidesPair(c, d)];
    }
    return [sidesPair(a, d), sidesPair(b, c)];
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
    theta: number;
};
const sidesPair = (
    a: Side,
    b: Side,
): [SegmentIntersection, SegmentIntersection, boolean | null] =>
    a.kind.type === 'enter'
        ? [a.entry, b.entry, (b.kind as Exit).goingInside]
        : [b.entry, a.entry, a.kind.goingInside];
