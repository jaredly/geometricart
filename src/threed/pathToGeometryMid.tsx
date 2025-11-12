import {Path as PKPath} from 'canvaskit-wasm';
import earcut from 'earcut';
import {BufferAttribute} from 'three';
import {BufferGeometry} from 'three/src/Three';
import {segmentsBounds} from '../editor/Bounds';
import {cmdsToSegments} from '../gcode/cmdsToSegments';
import {scaleMatrix} from '../rendering/getMirrorTransforms';
import {
    ensureClockwise,
    isClockwise,
    pathToPoints,
    rasterSegPoints,
    reversePath,
} from '../rendering/pathToPoints';
import {transformBarePath} from '../rendering/points';
import {Coord} from '../types';
import {pk} from '../routes/pk';
import {closeEnough} from '../rendering/epsilonToZero';

export function pathToGeometryMid({
    fullThickness,
    thick,
    res: {flat3d, inners, outer, tris, groups},
}: {
    fullThickness: number;
    thick: number;
    res: GeometryInner;
}) {
    const thickness = fullThickness ? fullThickness + thick : thick;
    const one = flat3d.length;
    flat3d = flat3d.slice();

    flat3d.push(...outer.flatMap((pt) => [pt.x, pt.y, -thickness]));
    inners.forEach((pts) => {
        flat3d.push(...pts.flatMap((pt) => [pt.x, pt.y, -thickness]));
    });
    const vertices = new Float32Array(flat3d);

    const geometry = new BufferGeometry();
    geometry.setIndex(tris);
    geometry.setAttribute('position', new BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    groups.forEach((group, i) => {
        geometry.addGroup(i === 0 ? 0 : groups[i - 1], group, i);
    });
    // geometry.addGroup(one * 3, flat3d.length, 1);

    return geometry;
}

export function pathToGeometry({
    pkpath,
    fullThickness,
    xoff,
    thick,
}: {
    pkpath: PKPath;
    fullThickness: boolean;
    xoff: number;
    thick: number;
}) {
    const innerResult = pathToGeometryInner(pkpath);
    if (!innerResult) return;

    const {flat3d, inners, outer, tris} = innerResult;

    const thickness = fullThickness ? xoff + thick : thick;

    flat3d.push(...outer.flatMap((pt) => [pt.x, pt.y, -thickness]));
    inners.forEach((pts) => {
        flat3d.push(...pts.flatMap((pt) => [pt.x, pt.y, -thickness]));
    });
    const vertices = new Float32Array(flat3d);

    const geometry = new BufferGeometry();
    geometry.setIndex(tris);
    geometry.setAttribute('position', new BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    return {geometry, stl: toStl(tris, flat3d)};
}
const toStl = (tris: number[], flat3d: number[]) => {
    const cells: [number, number, number][] = [];
    for (let i = 0; i < tris.length; i += 3) {
        cells.push([tris[i], tris[i + 1], tris[i + 2]]);
    }
    const positions: [number, number, number][] = [];
    for (let i = 0; i < flat3d.length; i += 3) {
        positions.push([flat3d[i], flat3d[i + 1], flat3d[i + 2]]);
    }

    return {cells, positions};
};

export type GeometryInner = {
    flat3d: number[];
    inners: Coord[][];
    outer: Coord[];
    tris: number[];
    groups: number[];
    // positions: number[]
};

export function pathToGeometryInner(pkpath: PKPath): GeometryInner | undefined {
    const clipped = cmdsToSegments([...pkpath.toCmds()])
        .map((r) => transformBarePath(r, [scaleMatrix(1, -1)]))
        .map((r) => ({
            ...r,
            bounds: segmentsBounds(r.segments),
        }));
    clipped.sort((a, b) => b.bounds.x1 - b.bounds.x0 - (a.bounds.x1 - a.bounds.x0));

    if (!clipped.length) {
        console.log('After clipping, there was nothing left.');
        console.log(pkpath.toSVGString());
        return;
    }

    const houter = clipped[0];
    if (!houter.open && isClockwise(houter.segments)) {
        houter.segments = reversePath(houter.segments);
        houter.origin = houter.segments[houter.segments.length - 1].to;
    }

    // OK SO we

    const holes = clipped.slice(1).map((r) => {
        if (r.open) {
            console.log(r);
            throw new Error(`hole cannot be open`);
        }
        r.segments = ensureClockwise(r.segments);
        r.origin = r.segments[r.segments.length - 1].to;
        return r;
    });

    const outer = rasterSegPoints(pathToPoints(houter.segments, houter.origin));
    const inners = holes.map((region) =>
        rasterSegPoints(pathToPoints(region.segments, region.origin)),
    );

    const flat = outer.flatMap((pt) => [pt.x, pt.y]);
    const flat3d = outer.flatMap((pt) => [pt.x, pt.y, 0]);
    const holeStarts: number[] = [];
    let count = outer.length;

    inners.forEach((pts) => {
        holeStarts.push(count);
        flat.push(...pts.flatMap((pt) => [pt.x, pt.y]));
        flat3d.push(...pts.flatMap((pt) => [pt.x, pt.y, 0]));
        count += pts.length;
    });
    const tris = earcut(flat, holeStarts);
    const groups: number[] = [];

    // const positions: number[] = [];
    // for (let i = 0; i < flat.length; i += 2) {
    // const x = flat[i];
    // const y = flat[i + 1];

    //     // Put polygon on XZ-plane (y as Z) or XY-plane, your choice.
    //     // Here: XZ plane at Y=0:
    //     positions.push(x, 0, y);
    // }

    groups.push(tris.length);

    // Bottom:
    tris.push(...tris.map((n) => n + count).reverse());

    groups.push(tris.length);

    // Border (outside):
    for (let i = 0; i < outer.length - 1; i++) {
        tris.push(i, i + 1, i + count);
        tris.push(i + count, i + 1, i + count + 1);
    }
    tris.push(count, outer.length - 1, 0);
    tris.push(outer.length - 1, count, count + outer.length - 1);

    groups.push(tris.length);
    inners.forEach((pts, n) => {
        let start = holeStarts[n];
        for (let i = start; i < start + pts.length - 1; i++) {
            tris.push(i, i + 1, i + count);
            tris.push(i + count, i + 1, i + count + 1);
        }
        tris.push(count + start, start + pts.length - 1, start);
        tris.push(start + pts.length - 1, start + count, start + count + pts.length - 1);
    });

    return {flat3d, inners, outer, tris, groups};
}

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
