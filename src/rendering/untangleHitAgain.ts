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
     * Then we sort the sides according to their angles, and group
     * sides with identical angles together.
     */
    sides.sort((a, b) => sortAngles(a.theta, b.theta));
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
    /**
     * Next we form `MultiSide`s, of sides that have the same
     * angle and the same kind. If there's an entry and an exit
     * with the same angle, the entry is treated as being
     * 'less clockwise' for sorting purposes.
     */
    const regrouped: Array<MultiSide> = [];
    grouped.forEach((group) => {
        if (group.length > 1) {
            /**
             * We have some duplicate angles! Not that when checking
             * for angle equality of arcs, we're not just looking at
             * the tangent angle of the intersection; in order to
             * be equal, two arc-angles must also have the same radius
             * and clockwise flag.
             */
            // @list-examples
            let exit = false;
            let entry = false;
            group.forEach((side) => {
                if (side.kind.type === 'exit') {
                    exit = true;
                } else {
                    entry = true;
                }
            });
            /** If a group of segments contains *both* exits and
             * entrances, we need to split them up, and place the
             * entraces before (less clockwise) the exits.
             */
            if (exit && entry) {
                // @list-examples
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
     * Going around clockwise from an exit, if you see [enter, exit] from the other shape,
     * before you see an enter from your own shape, you are going `inside` the other shape.
     * But, if you see [exit, enter] from the other shape, you are going `outside`.
     *
     * So assuming there are only two shapes in this picture, we just need to find the next
     * side that is from the other shape. If we wanted to support multiple shapes
     * at once, we'd probably need to expand the `goingInside` flag into a map of
     * `{[shapeId]: boolean}`.
     */
    regrouped.forEach((side, i0) => {
        if (side.kind.type !== 'exit' || side.shape == null) {
            return;
        }
        outer: for (let i = 0; i < regrouped.length; i++) {
            const j = (i0 + i) % regrouped.length;
            for (let other of regrouped[j].entries) {
                if (other.shape !== side.shape) {
                    side.kind.goingInside = regrouped[j].kind.type === 'enter';
                    break outer;
                }
            }
        }
    });
    /**
     * Now we go through the sorted list of multisides to "pick off" the
     * easily recognizable corners, which we can identify by an `exit` that's
     * immediately followed by an `enter`.
     */
    const result: Array<HitTransition> = [];
    while (regrouped.length) {
        /**
         * If we're left with a trio, then it's either two entrances
         * that exit the exact same way, or two exits that came from
         * the same place.
         */
        if (regrouped.length === 3) {
            // @list-examples
            result.push({
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
                // @trace(a, b)
                const doubleBack = anglesEqual(a.theta, b.theta);
                result.push({
                    entries: b.entries,
                    exits: a.entries.map((exit) => ({
                        exit,
                        goingInside: doubleBack
                            ? null
                            : (a.kind as Exit).goingInside,
                    })),
                });
                if (j > i) {
                    regrouped.splice(j, 1);
                    regrouped.splice(i, 1);
                } else {
                    regrouped.splice(i, 1);
                    regrouped.splice(j, 1);
                }
                break;
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

export type HitTransition = {
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
