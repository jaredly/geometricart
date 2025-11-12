import {Path as PKPath} from 'canvaskit-wasm';
import {closeEnough} from '../rendering/epsilonToZero';
import {pk} from '../routes/pk';

// Split an even-odd compound path into independent "filled shapes" (as even-odd paths).
// Example: three concentric circles (outer/mid/inner) => [ donut(outer+mid), innerDisk(inner) ]

export function splitEvenOddIntoDisconnectedShapes(
    src: PKPath /* CanvasKit.Path */,
): PKPath[] /* CanvasKit.Path[] */ {
    // ---- Helpers -------------------------------------------------------------
    const FT_EO = pk.FillType.EvenOdd;
    const FT_W = pk.FillType.Winding;

    type Pt = {x: number; y: number};
    type Bounds = {l: number; t: number; r: number; b: number};

    function mkPath(): PKPath {
        return new pk.Path();
    }

    function boundsOf(p: PKPath): Bounds {
        // computeTightBounds() -> Float32Array [l, t, r, b]
        const b = p.computeTightBounds() as Float32Array;
        return {l: b[0], t: b[1], r: b[2], b: b[3]};
    }
    function centerOf(b: Bounds): Pt {
        return {x: (b.l + b.r) / 2, y: (b.t + b.b) / 2};
    }
    function width(b: Bounds): number {
        return Math.max(0, b.r - b.l);
    }
    function height(b: Bounds): number {
        return Math.max(0, b.b - b.t);
    }

    function boundsContains(b: Bounds, p: Pt): boolean {
        return p.x >= b.l && p.x <= b.r && p.y >= b.t && p.y <= b.b;
    }

    function containsWinding(container: any, p: Pt): boolean {
        // Use Winding for robust point-in-path
        const prev = container.getFillType?.();
        container.setFillType(FT_W);
        const inside = container.contains(p.x, p.y);
        if (prev !== undefined) container.setFillType(prev);
        return inside;
    }

    // Extract closed contours from src by reading its verbs.
    function extractContours(srcPath: PKPath): PKPath[] {
        const contours: number[][] = [];
        const cmds = srcPath.toCmds();

        const cmdSize = {
            [pk.MOVE_VERB]: 2,
            [pk.LINE_VERB]: 2,
            [pk.QUAD_VERB]: 4,
            [pk.CUBIC_VERB]: 6,
            [pk.CONIC_VERB]: 5,
            [pk.CLOSE_VERB]: 0,
        };

        for (let i = 0; i < cmds.length; ) {
            const op = cmds[i++];
            const size = cmdSize[op];
            if (size === undefined) {
                throw new Error(`no size for op ${op}`);
            }
            const args = cmds.slice(i, i + size);
            i += size;

            if (op === pk.CLOSE_VERB) continue; // ignore, we auto-close

            if (op === pk.MOVE_VERB) {
                contours.push([op, ...args]);
            } else {
                contours[contours.length - 1].push(op, ...args);
            }
        }

        return contours.map((cmds) => {
            const path = pk.Path.MakeFromCmds([...cmds, pk.CLOSE_VERB]);
            if (!path) {
                console.log(cmds);
                throw new Error(`unable to make path`);
            }
            return path;
        });
    }

    // ---- Algorithm -----------------------------------------------------------
    // 0) (Optional) You could "simplify" first; CanvasKit doesn't expose SkPathOps::Simplify directly,
    //    so we proceed assuming non-self-intersecting, disjoint contours.
    // 1) Split into contours
    const rawContours = extractContours(src);

    // Represent each contour with cached data
    type Node = {
        path: PKPath;
        bounds: Bounds;
        probe: Pt;
        parent: number;
        children: number[];
        depth: number;
    };

    function rectContainsRect(outer: Bounds, inner: Bounds): boolean {
        return outer.l <= inner.l && outer.t <= inner.t && outer.r >= inner.r && outer.b >= inner.b;
    }

    // Return true if A is completely inside B (no area of A lies outside B).
    function pathAInsideB(A: PKPath, B: PKPath): boolean {
        // Work on winding clones for stable ops.
        const a = A.copy();
        a.setFillType(pk.FillType.Winding);
        const b = B.copy();
        b.setFillType(pk.FillType.Winding);

        const diff = pk.Path.MakeFromOp(a, b, pk.PathOp.Difference);
        a.delete();
        b.delete();

        // If MakeFromOp fails, be conservative and say "not contained".
        if (!diff) return true;
        const empty = diff.isEmpty();
        diff.delete();
        return empty;
    }

    const nodes: Node[] = rawContours
        .map((p) => {
            const path = p.copy();
            const b = boundsOf(path);
            if (closeEnough(b.r - b.l, 0) || closeEnough(b.t - b.b, 0)) {
                return null;
            }
            // pick a probe near center; jitter slightly to avoid edge ambiguity
            const cx = centerOf(b);
            const eps = 1e-3 * Math.max(1, Math.max(width(b), height(b)));
            const probe: Pt = {x: cx.x + eps, y: cx.y + eps};
            return {path, bounds: b, probe, parent: -1, children: [], depth: 0};
        })
        .filter(Boolean) as Node[];

    // 2) Build containment tree (parent = smallest contour that contains our probe)
    for (let i = 0; i < nodes.length; i++) {
        let best = -1;

        let bestArea = Number.POSITIVE_INFINITY;

        const innerB = nodes[i].bounds;

        for (let j = 0; j < nodes.length; j++)
            if (i !== j) {
                const outerB = nodes[j].bounds;

                // fast reject: if B's bounds don't contain A's bounds, B can't contain A
                if (!rectContainsRect(outerB, innerB)) continue;

                // robust check: A inside B ?
                if (pathAInsideB(nodes[i].path, nodes[j].path)) {
                    const area =
                        Math.max(0, outerB.r - outerB.l) * Math.max(0, outerB.b - outerB.t);
                    if (area < bestArea) {
                        bestArea = area;
                        best = j;
                    }
                }
            }
        nodes[i].parent = best;
    }
    for (let i = 0; i < nodes.length; i++) {
        const p = nodes[i].parent;
        if (p >= 0) nodes[p].children.push(i);
    }
    const computeDepth = (i: number, path: number[]): number => {
        if (path.includes(i)) {
            path.forEach((i) => {
                const {path, ...node} = nodes[i];
                console.log(node, path.toSVGString());
            });
            throw new Error(`how did we get here ${path.join(', ')}`);
        }
        const p = nodes[i].parent;
        const sub = path.concat([i]);
        return (nodes[i].depth = p < 0 ? 0 : computeDepth(p, sub) + 1);
    };
    for (let i = 0; i < nodes.length; i++) computeDepth(i, []);

    // 3) Emit shapes: each even-depth node + its immediate odd-depth children (holes)
    const shapes: any[] = [];
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].depth % 2 !== 0) continue; // only even-depth roots become solids
        const out = mkPath();
        out.setFillType(FT_EO);

        // Add the even-depth "shell"
        out.addPath(nodes[i].path);

        // Add immediate odd-depth children as holes
        for (const c of nodes[i].children) {
            if (nodes[c].depth % 2 === 1) {
                out.addPath(nodes[c].path);
            }
        }
        shapes.push(out);
    }

    return shapes;
}
