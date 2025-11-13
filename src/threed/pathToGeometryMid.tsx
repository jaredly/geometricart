import {Path as PKPath} from 'canvaskit-wasm';
import earcut from 'earcut';
import {BufferAttribute} from 'three';
import {BufferGeometry, Float32BufferAttribute} from 'three/src/Three';
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
    thick,
    res: {inners, outer},
}: {
    fullThickness: number;
    thick: number;
    res: GeometryInner;
}) {
    const thickness = fullThickness ? fullThickness + thick : thick;
    const {sections, indexSections} = calcPositionsAndTriangles(outer, inners, thickness);

    const flat3d = sections.flatMap((s) => s.positions);
    const vertices = new Float32Array(flat3d);

    const geometry = new BufferGeometry();
    geometry.setIndex(indexSections.flatMap((s) => s.index));
    geometry.setAttribute('position', new BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    makeSpans(indexSections).forEach(({start, end}, i) => {
        geometry.addGroup(start, end, i);
    });

    {
        // 1. find bounds in 2D
        let minX = Infinity,
            maxX = -Infinity;
        let minY = Infinity,
            maxY = -Infinity;

        for (let i = 0; i < flat3d.length; i += 3) {
            const x = flat3d[i];
            const y = flat3d[i + 1];

            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

        const sizeX = maxX - minX || 1; // avoid divide by zero
        const sizeY = maxY - minY || 1;

        // 2. build UVs in same vertex order as positions
        const uvs = [];

        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const u = (x - minX) / sizeX; // 0 → 1 across X
            const v = (y - minY) / sizeY; // 0 → 1 across Y
            uvs.push(u, v);
        }

        // 3. attach to geometry
        geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    }

    return geometry;
}

export type GeometryInner = {
    outer: Coord[];
    inners: Coord[][];
    // indexSections: {index: number[]; name: string}[];
};

function makeSpans(indexSections: {index: number[]; name: string}[]) {
    const spans: {name: string; start: number; end: number}[] = [];
    indexSections.forEach((section, i) => {
        if (!spans.length || spans[spans.length - 1].name !== section.name) {
            const start = !spans.length ? 0 : spans[spans.length - 1].end;
            spans.push({
                name: section.name,
                start,
                end: start + section.index.length,
            });
        } else {
            spans[spans.length - 1].end += section.index.length;
        }
    });
    return spans;
}

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

    return {outer, inners};
}

const calcPositionsAndTriangles = (outer: Coord[], inners: Coord[][], thickness: number) => {
    const holeStarts: number[] = [];
    let count = outer.length;
    inners.forEach((pts) => {
        holeStarts.push(count);
        count += pts.length;
    });

    const topIndex = earcut(
        outer.concat(...inners).flatMap((p) => [p.x, p.y]),
        holeStarts,
    );

    const indexSections: {name: string; index: number[]}[] = [
        {name: 'top', index: topIndex},
        {name: 'bottom', index: topIndex.map((n) => n + count).reverse()},
    ];

    const border: number[] = [];
    for (let i = 0; i < outer.length - 1; i++) {
        border.push(i, i + 1, i + count);
        border.push(i + count, i + 1, i + count + 1);
    }
    border.push(count, outer.length - 1, 0);
    border.push(outer.length - 1, count, count + outer.length - 1);
    indexSections.push({name: 'outside', index: border});

    inners.forEach((pts, n) => {
        const index = [];
        let start = holeStarts[n];
        for (let i = start; i < start + pts.length - 1; i++) {
            index.push(i, i + 1, i + count);
            index.push(i + count, i + 1, i + count + 1);
        }
        index.push(count + start, start + pts.length - 1, start);
        index.push(start + pts.length - 1, start + count, start + count + pts.length - 1);
        indexSections.push({name: 'hole', index});
    });

    // Sections
    const sections: {name: string; positions: number[]}[] = [
        {name: 'top-outer', positions: outer.flatMap((pt) => [pt.x, pt.y, 0])},
        ...inners.map((pts) => ({
            name: 'top-hole',
            positions: pts.flatMap((p) => [p.x, p.y, 0]),
        })),
        {name: 'bottom-outer', positions: outer.flatMap((p) => [p.x, p.y, -thickness])},
        ...inners.map((pts) => ({
            name: 'bottom-hole',
            positions: pts.flatMap((p) => [p.x, p.y, -thickness]),
        })),
    ];

    // const flat3d = sections.flatMap((s) => s.positions);
    // sections.push()

    // // flat3d.push(...outer.flatMap((pt) => [pt.x, pt.y, -thickness]));
    // inners.forEach((pts) => {
    //     flat3d.push(...pts.flatMap((pt) => [pt.x, pt.y, -thickness]));
    // });

    return {sections, indexSections};
};

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

    const {inners, outer} = innerResult;
    // const indexSections = calcPositionsAndTriangles(outer, inners);
    const thickness = fullThickness ? xoff + thick : thick;
    const {sections, indexSections} = calcPositionsAndTriangles(outer, inners, thickness);

    const flat3d = sections.flatMap((s) => s.positions);

    // const sections: {name: string; positions: number[]}[] = [
    //     {name: 'top', positions: outer.flatMap((pt) => [pt.x, pt.y, 0])},
    //     ...inners.map((pts) => ({
    //         name: 'hol',
    //         positions: pts.flatMap((p) => [p.x, p.y, 0]),
    //     })),
    // ];
    // const flat3d = sections.flatMap((s) => s.positions);

    // flat3d.push(...outer.flatMap((pt) => [pt.x, pt.y, -thickness]));
    // inners.forEach((pts) => {
    //     flat3d.push(...pts.flatMap((pt) => [pt.x, pt.y, -thickness]));
    // });
    const vertices = new Float32Array(flat3d);

    const index = indexSections.flatMap((s) => s.index);

    const geometry = new BufferGeometry();
    geometry.setIndex(index);
    geometry.setAttribute('position', new BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    return {geometry, stl: toStl(index, flat3d)};
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
