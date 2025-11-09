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

export function pathToGeometryMid({
    fullThickness,
    xoff,
    thick,
    res: {flat3d, inners, outer, tris},
}: {
    fullThickness: boolean;
    xoff: number;
    thick: number;
    res: GeometryInner;
}) {
    const thickness = fullThickness ? xoff + thick : thick;
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

export type GeometryInner = {flat3d: number[]; inners: Coord[][]; outer: Coord[]; tris: number[]};

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

    // Bottom:
    tris.push(...tris.map((n) => n + count).reverse());

    // Border (outside):
    for (let i = 0; i < outer.length - 1; i++) {
        tris.push(i, i + 1, i + count);
        tris.push(i + count, i + 1, i + count + 1);
    }
    tris.push(count, outer.length - 1, 0);
    tris.push(outer.length - 1, count, count + outer.length - 1);

    inners.forEach((pts, n) => {
        let start = holeStarts[n];
        for (let i = start; i < start + pts.length - 1; i++) {
            tris.push(i, i + 1, i + count);
            tris.push(i + count, i + 1, i + count + 1);
        }
        tris.push(count + start, start + pts.length - 1, start);
        tris.push(start + pts.length - 1, start + count, start + count + pts.length - 1);
    });

    return {flat3d, inners, outer, tris};
}
