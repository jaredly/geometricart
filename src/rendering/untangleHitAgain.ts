import {Exit, SegmentIntersection, HitSegment} from './untangleHit';
import {backAngle, sortAngles} from './clipPath';
import {Angle} from './epsilonToZero';
import {anglesEqual} from './epsilonToZero';

// @trace
/**
 * ## `untangleHit`
 *
 * This method is responsible for taking an intersection of several
 * line segments and splitting it into "corners", each consisting
 * of an entrance and an exit, that a final clipped shape will follow.
 */
export const untangleHit = (entries: Array<SegmentIntersection>): Array<HitCorner> => {
    /**
     * #### Preprocessing
     *
     * First, we go through the provided segments,
     * some of which *both* enter and exit the intersection
     * (meaning the intersection happens in the middle of the
     * segment), and some just start or end at the intersection.
     */
    const segments: Array<HitSegment> = [];
    for (const entry of entries) {
        if (entry.enter) {
            segments.push({
                kind: {type: 'enter'},
                entry,
                theta: backAngle(entry.theta),
            });
        }
        if (entry.exit) {
            segments.push({
                kind: {type: 'exit', goingInside: null},
                entry,
                theta: entry.theta,
            });
        }
    }
    /**
     * ##### Handling segments with identicial angles
     *
     * Then we sort the segments according to their angles, and group
     * segments with identical angles together.
     */
    segments.sort((a, b) => sortAngles(a.theta, b.theta));
    const sameAngles: Array<Array<HitSegment>> = [];
    for (const side of segments) {
        // @show(side)
        if (
            sameAngles.length &&
            anglesEqual(side.theta, sameAngles[sameAngles.length - 1][0].theta)
        ) {
            sameAngles[sameAngles.length - 1].push(side);
        } else {
            sameAngles.push([side]);
        }
    }
    /**
     * Next we form `SegmentGroup`s, of segments that have the same
     * angle and the same kind. If there's an entry and an exit
     * with the same angle, the entry is treated as being
     * 'less clockwise' for sorting purposes.
     */
    const segmentGroups: Array<SegmentGroup> = [];
    for (const group of sameAngles) {
        // @show(group)
        if (group.length > 1) {
            /**
             * We have some duplicate angles! Note that when checking
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
             * entraces before (e.g. less clockwise than) the exits.
             */
            if (exit && entry) {
                // @list-examples
                const enters = group.filter((s) => s.kind.type === 'enter').map((s) => s.entry);
                segmentGroups.push({
                    kind: {type: 'enter'},
                    entries: enters,
                    theta: group[0].theta,
                    shape: getShape(enters),
                });
                const exits = group.filter((s) => s.kind.type === 'exit').map((s) => s.entry);
                segmentGroups.push({
                    kind: {type: 'exit', goingInside: null},
                    entries: exits,
                    theta: group[0].theta,
                    shape: getShape(exits),
                });
                continue;
            }
        }
        const items = group.map((s) => s.entry);
        segmentGroups.push({
            kind: group[0].kind,
            entries: items,
            theta: group[0].theta,
            shape: getShape(items),
        });
    }
    /**
     * #### Determining the `goingInside` flag for exit segments
     *
     * Going around clockwise from an exit, if you see [enter, exit] from the other shape,
     * before you see an enter from your own shape, you are going `inside` the other shape.
     * But, if you see [exit, enter] from the other shape, you are going `outside`.
     *
     * So assuming there are only two shapes in this picture, we just need to find the next
     * side that is from the other shape. If we wanted to support multiple shapes
     * at once, we'd probably need to expand the `goingInside` flag into a map of
     * `{[shapeId]: boolean}`.
     */
    for (let i0 = 0; i0 < segmentGroups.length; i0++) {
        const side = segmentGroups[i0];
        if (side.kind.type !== 'exit' || side.shape == null) {
            continue;
        }
        outer: for (let i = 0; i < segmentGroups.length; i++) {
            const j = (i0 + i) % segmentGroups.length;
            for (let other of segmentGroups[j].entries) {
                if (other.shape !== side.shape) {
                    // @show(side, other)
                    side.kind.goingInside = segmentGroups[j].kind.type === 'enter';
                    break outer;
                }
            }
        }
    }
    /**
     * #### Pairing entrances & exits into corners
     *
     * Now we go through the sorted list of SegmentGroups to "pick off" the
     * easily recognizable corners, which we can identify by an `exit` that's
     * immediately followed by an `enter`.
     */
    const result: Array<HitCorner> = [];
    while (segmentGroups.length) {
        /**
         * If we're left with a trio, then it's either two entrances
         * that exit the exact same way, or two exits that came from
         * the same place.
         */
        if (segmentGroups.length === 3) {
            // @list-examples
            result.push({
                entries: segmentGroups
                    .filter((g) => g.kind.type === 'enter')
                    .map((g) => g.entries)
                    .flat(),
                exits: segmentGroups
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
        for (let i = 0; i < segmentGroups.length; i++) {
            let j = (i + 1) % segmentGroups.length;
            const a = segmentGroups[i];
            const b = segmentGroups[j];
            if (a.kind.type === 'exit' && b.kind.type === 'enter') {
                // @show(b, a)
                const doubleBack = anglesEqual(a.theta, b.theta);
                result.push({
                    entries: b.entries,
                    exits: a.entries.map((exit) => ({
                        exit,
                        /**
                         * When doubling back (exit at the exact same
                         * angle as the entrance) it's impossible to know
                         * whether we're 'inside' or 'outside' the other
                         * shape, so we ditch that information.
                         */
                        goingInside: doubleBack ? null : (a.kind as Exit).goingInside,
                    })),
                });
                if (j > i) {
                    segmentGroups.splice(j, 1);
                    segmentGroups.splice(i, 1);
                } else {
                    segmentGroups.splice(i, 1);
                    segmentGroups.splice(j, 1);
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

export type HitCorner = {
    entries: Array<SegmentIntersection>;
    exits: Array<{
        exit: SegmentIntersection;
        goingInside: null | boolean;
    }>;
};

export type SegmentGroup = {
    kind: HitSegment['kind'];
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
