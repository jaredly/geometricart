import {
    Exit,
    IntersectionError,
    SegmentIntersection,
    Side,
} from './untangleHit';
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

// @trace
/**
 * ### `untangleHit`
 *
 * Here's the big deal, untangling a hit, so that we
 * have corners we can piece together.
 */
export const untangleHit = (
    entries: Array<SegmentIntersection>,
): Array<HitTransition> => {
    /**
     * So first off, we go through the "intersections",
     * and split them up (if necessary) into segments
     * with an endpoint at the intersection, where
     * `enter` sides are entering the intersection,
     * and `exit` sides are issuing from it.
     */
    const sides: Array<Side> = [];
    entries.forEach((entry) => {
        if (entry.enter) {
            sides.push({
                kind: { type: 'enter' },
                entry,
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
    /**
     * Then we sort the sides according to their angles.
     */
    sides.sort((a, b) => sortAngles(a.theta, b.theta));
    if (sides.length === 2) {
        let [a, b] = sides;
        if (a.kind.type === b.kind.type) {
            throw new IntersectionError(
                `both sides have same entry? ${a.kind.type}`,
                entries,
            );
        }
        if (a.kind.type === 'exit') {
            [a, b] = [b, a];
        }
        return [
            {
                type: 'straight',
                entry: a.entry,
                exit: b.entry,
                goingInside: null,
            },
        ];
    }
    /**
     * So, going clockwise:
     * - exit to enter, love it.
     * - enter to exit, ONLY if the following one is also an exit.
     * - exit to exit, nope. enter to enter, nope.
     */

    const grouped: Array<Array<Side>> = [];
    sides.forEach((side) => {
        if (
            !grouped.length ||
            !anglesEqual(side.theta, grouped[grouped.length - 1][0].theta)
        ) {
            grouped.push([side]);
        } else {
            grouped[grouped.length - 1].push(side);
        }
    });

    // Ok, but now we might have entries and exits in the same group.
    // and we sort "enteries" as "less clockwise" than "exits"
    const regrouped: Array<MultiSide> = [];
    grouped.forEach((group) => {
        if (group.length > 1) {
            let exit = false;
            let entry = false;
            group.forEach((side) => {
                if (side.kind.type === 'exit') {
                    exit = true;
                } else {
                    entry = true;
                }
            });
            if (exit && entry) {
                const enters = group
                    .filter((s) => s.kind.type === 'enter')
                    .map((s) => s.entry);
                regrouped.push({
                    kind: { type: 'enter' },
                    entries: enters,
                    theta: group[0].theta,
                    shape: getShape(enters),
                });
                const exits = group
                    .filter((s) => s.kind.type === 'exit')
                    .map((s) => s.entry);
                regrouped.push({
                    kind: { type: 'exit', goingInside: null },
                    entries: exits,
                    theta: group[0].theta,
                    shape: getShape(exits),
                });
                return;
            }
        }
        const items = group.map((s) => s.entry);
        regrouped.push({
            kind: group[0].kind,
            entries: items,
            theta: group[0].theta,
            shape: getShape(items),
        });
    });

    /**
     * Ok, now regrouped has only groups consisting of the same kinds of things.
     * yeah that is nice.
     */
    /**
     * Going around clockwise from an exit, if you see [enter, exit] from the other shape,
     * you are going INSIDE
     * if you see [exit, enter] from the other shape, you are going OUTSIDE.
     *
     * So, yeah really we just need to look for the first thing from the other shape.
     */
    regrouped.forEach((side, i0) => {
        if (side.kind.type !== 'exit') {
            return;
        }
        for (let i = 0; i < regrouped.length; i++) {
            if (side.shape === null) {
                continue;
            }
            const j = (i0 + i) % regrouped.length;
            if (
                regrouped[j].shape !== null &&
                regrouped[j].shape !== side.shape
            ) {
                side.kind.goingInside = regrouped[j].kind.type === 'enter';
                break;
            }
        }
    });

    // TODO: assert that there's an equal number
    // of entries and exits?
    // oh wait. no there could be odd.
    // not sure at what point to detect that.
    const result: Array<HitTransition> = [];

    // Ok, so at this point, I think we have goingInside taken care of.
    // Now, I go around and find "exit followed by entry" and remove.
    while (regrouped.length) {
        if (regrouped.length === 3) {
            // we're ambiguous here
            result.push({
                type: 'ambiguous',
                entries: regrouped
                    .filter((g) => g.kind.type === 'enter')
                    .map((g) => g.entries)
                    .flat(),
                exits: regrouped
                    .filter((g) => g.kind.type === 'exit')
                    .map((g) =>
                        g.entries.map((exit) => ({
                            exit,
                            goingInside: (g.kind as Exit).goingInside,
                        })),
                    )
                    .flat(),
            });
            break;
        }
        for (let i = 0; i < regrouped.length; i++) {
            let j = (i + 1) % regrouped.length;
            const a = regrouped[i];
            const b = regrouped[j];
            if (a.kind.type === 'exit' && b.kind.type === 'enter') {
                result.push({
                    type: 'ambiguous',
                    entries: b.entries,
                    exits: a.entries.map((exit) => ({
                        exit,
                        goingInside: (a.kind as Exit).goingInside,
                    })),
                });
                if (j > i) {
                    regrouped.splice(j, 1);
                    regrouped.splice(i, 1);
                } else {
                    regrouped.splice(i, 1);
                    regrouped.splice(j, 1);
                }
            }
        }
    }

    return result;
};

/**
 * Hmmm.
 * So in the general case,
 * I'm not totally sure how to resolve the ambiguous dealio.
 * Or whether hmmm
 * ok so the inside/outside determination maybe still just
 * works, because it doesn't depend on stuff.
 * And then we've got a general way of picking things out,
 * where you take any pairs that are adjacent (exit/enter),
 * connect & remove them from the list, and then keep going
 * through. Right?
 *
 * but we need special care for ambiguous things, right?
 * Hmm maybe you just
 * - find dup exits, and if the exits are different (outside),
 *   make them both null outside
 * - find duplicate entries, and just group them. right?
 *   right.
 *
 * and then we can go through and do our iterative pruning?
 * sounds legit to me.
 * we'll see if I can find any counterexamples. tbh it's
 * probably not going to impact anything anyway, because
 * the cases won't have any clockwise sections at that point?
 * idk.
 *
 *
 */
// hmm I guess these two cases could be unified into
// the second one ...

export type HitTransition =
    | {
          type: 'straight';
          entry: SegmentIntersection;
          exit: SegmentIntersection;
          goingInside: boolean | null;
      }
    | {
          type: 'ambiguous';
          entries: Array<SegmentIntersection>;
          exits: Array<{
              exit: SegmentIntersection;
              goingInside: null | boolean;
          }>;
      };

export type MultiSide = {
    kind: Side['kind'];
    theta: Angle;
    entries: SegmentIntersection[];
    shape: null | number;
};

const getShape = (items: SegmentIntersection[]): number | null => {
    let shape: null | number = items[0].shape;
    items.forEach((item) => {
        if (shape !== item.shape) {
            shape = null;
        }
    });
    return shape;
};
