import {Path as PKPath} from 'canvaskit-wasm';
import earcut from 'earcut';
import {BufferAttribute} from 'three';
import {BufferGeometry, Float32BufferAttribute} from 'three/src/Three';
import {boundsForCoords, segmentsBounds} from '../editor/Bounds';
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
    res,
    zoff,
}: {
    fullThickness: number;
    thick: number;
    res: GeometryInner;
    zoff: number;
}) {
    const thickness = fullThickness ? fullThickness + thick : thick;
    const {positions, index, spans, uvs} = calcPositionsAndTriangles(res, thickness, zoff);

    const vertices = new Float32Array(positions);

    const geometry = new BufferGeometry();
    geometry.setIndex(index);
    geometry.setAttribute('position', new BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    spans.forEach(({start, end}, i) => geometry.addGroup(start, end, i));

    // 3. attach to geometry
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));

    return geometry;
}

export type GeometryInner = {
    outer: Coord[];
    inners: Coord[][];
    cut: {
        holeStarts: number[];
        topIndex: number[];
        count: number;
    };
};

function getPositionBounds(positions: number[]) {
    let minX = Infinity,
        maxX = -Infinity;
    let minY = Infinity,
        maxY = -Infinity;
    let minZ = Infinity,
        maxZ = -Infinity;

    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
    }

    const sizeX = maxX - minX || 1;
    const sizeY = maxY - minY || 1;
    const sizeZ = maxZ - minZ || 1;
    return {minX, sizeX, minY, sizeY, minZ, sizeZ};
}

function makeSpans(indexSections: {index: number[]; name: string}[]) {
    const spans: {name: string; start: number; end: number}[] = [];
    indexSections.forEach((section) => {
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

    return {outer, inners, cut: doEarcut(outer, inners)};
}

const doEarcut = (outer: Coord[], inners: Coord[][]) => {
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

    return {holeStarts, topIndex, count};
};

const calcPositionsAndTriangles = (pre: GeometryInner, thickness: number, zoff: number) => {
    const {
        outer,
        inners,
        cut: {topIndex, holeStarts, count: topCount},
    } = pre;

    const bounds = boundsForCoords(...outer);
    const bw = bounds.x1 - bounds.x0;
    const bh = bounds.y1 - bounds.y0;

    const positions: number[] = [
        // top-outer
        ...outer.flatMap((pt) => [pt.x, pt.y, 0]),
        // top-holes
        ...inners.flatMap((pts) => pts.flatMap((p) => [p.x, p.y, 0])),
        // bottom-outer
        ...outer.flatMap((p) => [p.x, p.y, -thickness]),
        // bottom-holes
        ...inners.flatMap((pts) => pts.flatMap((p) => [p.x, p.y, -thickness])),
    ];
    // Now for the positions for the sides
    positions.push(...positions);

    const uvs: number[] = [
        ...outer.flatMap((pt) => [(pt.x - bounds.x0) / bw, (pt.y - bounds.y0) / bh]),
        ...inners.flatMap((pts) =>
            pts.flatMap((p) => [(p.x - bounds.x0) / bw, (p.y - bounds.y0) / bh]),
        ),
        ...outer.flatMap((pt) => [(pt.x - bounds.x0) / bw, (pt.y - bounds.y0) / bh]),
        ...inners.flatMap((pts) =>
            pts.flatMap((p) => [(p.x - bounds.x0) / bw, (p.y - bounds.y0) / bh]),
        ),
    ];
    uvs.push(...uvs);

    const indexSections: {name: string; index: number[]}[] = [
        {name: 'top', index: topIndex},
        {name: 'bottom', index: topIndex.map((n) => n + topCount).reverse()},
    ];

    const border: number[] = [];
    for (let i = 0; i < outer.length - 1; i++) {
        border.push(i, i + 1, i + topCount);
        border.push(i + topCount, i + 1, i + topCount + 1);
    }
    border.push(topCount, outer.length - 1, 0);
    border.push(outer.length - 1, topCount, topCount + outer.length - 1);
    indexSections.push({name: 'outside', index: border.map((n) => n + topCount * 2)});

    inners.forEach((pts, n) => {
        const index = [];
        let start = holeStarts[n];
        for (let i = start; i < start + pts.length - 1; i++) {
            index.push(i, i + 1, i + topCount);
            index.push(i + topCount, i + 1, i + topCount + 1);
        }
        index.push(topCount + start, start + pts.length - 1, start);
        index.push(start + pts.length - 1, start + topCount, start + topCount + pts.length - 1);
        indexSections.push({name: 'hole', index: index.map((n) => n + topCount * 2)});
    });

    // 1. find bounds in 2D
    const {minX, sizeX, minY, sizeY, minZ, sizeZ} = getPositionBounds(positions);

    // 2. build UVs in same vertex order as positions
    // const uvs = [];

    // for (let i = 0; i < positions.length; i += 3) {
    //     const x = positions[i];
    //     const y = positions[i + 1];
    //     const z = positions[i + 2];
    //     if (i < positions.length / 2) {
    //         const u = (x - minX) / sizeX; // 0 → 1 across X
    //         const v = (y - minY) / sizeY; // 0 → 1 across Y
    //         uvs.push(u, v);
    //     } else {
    //         const u = (z - minZ + zoff) / sizeY; // 0 → 1 across Z
    //         const v = (y - minY + (x - minX)) / sizeY; // 0 → 1 across Y
    //         uvs.push(u, v);
    //     }
    // }

    // const positions = positionSections.flatMap((s) => s.positions);
    const index = indexSections.flatMap((s) => s.index);
    return {positions, index, spans: makeSpans(indexSections), uvs};
};

export function pathToGeometry({
    pkpath,
    fullThickness,
    zoff,
    thick,
}: {
    pkpath: PKPath;
    fullThickness: boolean;
    zoff: number;
    thick: number;
}) {
    const innerResult = pathToGeometryInner(pkpath);
    if (!innerResult) return;

    const thickness = fullThickness ? zoff + thick : thick;
    const {positions, index} = calcPositionsAndTriangles(innerResult, thickness, zoff);

    const geometry = new BufferGeometry();
    geometry.setIndex(index);
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    geometry.computeVertexNormals();

    return {geometry, stl: toStl(index, positions)};
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
