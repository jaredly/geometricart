import { negPiToPi } from './clipPath';

export class IntersectionError extends Error {
    constructor(message: string, entries: Array<SegmentIntersection>) {
        super(message + `: Entries ${JSON.stringify(entries)}`);
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

export const untangleHit = (
    entries: Array<SegmentIntersection>,
): Array<[SegmentIntersection, SegmentIntersection]> => {
    const sides: Array<Side> = [];
    entries.forEach((entry) => {
        if (entry.enter) {
            sides.push({
                enter: true,
                entry,
                // So, we could instead to `angleBetween(0, entry.theta + Math.PI, true)`
                // which might more effectively normalize? idk.
                theta: negPiToPi(entry.theta + Math.PI),
            });
        }
        if (entry.exit) {
            sides.push({ enter: false, entry, theta: entry.theta });
        }
    });
    sides.sort((a, b) => a.theta - b.theta);
    if (sides.length === 2) {
        const [a, b] = sides;
        if (a.enter === b.enter) {
            throw new IntersectionError(
                `both sides have same entry? ${a.enter}`,
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
        throw new IntersectionError(`Sides neither 2 nor 4`, entries);
    }
    // OPTIONS:
    // ab, cd
    // ad, bc
    // it's never an option, for non-adjacent sides to connect.
    const [a, b, c, d] = sides;
    if ((!a.enter && b.enter) || (a.enter && !b.enter && !c.enter)) {
        return [sidesPair(a, b), sidesPair(c, d)];
    }
    return [sidesPair(a, d), sidesPair(b, c)];
};
/**
 * Eh ok untangleHit could really use some unit tests.
 */
type Side = {
    enter: boolean;
    entry: SegmentIntersection;
    theta: number;
};
const sidesPair = (
    a: Side,
    b: Side,
): [SegmentIntersection, SegmentIntersection] =>
    a.enter ? [a.entry, b.entry] : [b.entry, a.entry];
