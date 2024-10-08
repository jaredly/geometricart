import React from 'react';
import { Action } from '../state/Action';
import { Fill, Path, State, StyleLine } from '../types';
import earcut from 'earcut';
import '@react-three/fiber';
import { BufferAttribute, BufferGeometry, PointsMaterial } from 'three';
import { segmentsBounds } from '../editor/Bounds';
import { calcPathD } from '../editor/calcPathD';
import { PK } from '../editor/pk';
import { paletteColor } from '../editor/RenderPath';
import { Hover } from '../editor/Sidebar';
import { cmdsToSegments } from '../gcode/cmdsToSegments';
import { scaleMatrix } from '../rendering/getMirrorTransforms';
import {
    angleDifferences,
    ensureClockwise,
    isClockwise,
    pathToPoints,
    pointsAngles,
    rasterSegPoints,
    reversePath,
    totalAngle,
} from '../rendering/pathToPoints';
import { transformBarePath } from '../rendering/points';
import { mmToPX } from '../gcode/generateGcode';

export const unique = (v: string[]) => {
    const seen: Record<string, true> = {};
    return v.filter((v) => (!seen[v] ? (seen[v] = true) : false));
};

export const matchesHover = (path: Path, hover: Hover | null) => {
    if (!hover) return false;
    if (hover.type !== 'element') return false;
    if (hover.kind === 'Path') {
        return hover.id === path.id;
    }
    return hover.kind === 'PathGroup' && hover.id === path.group;
};

export const calcShapes = (
    pathsToShow: Path[],
    thick: number,
    gap: number,
    selectedIds: Record<string, boolean>,
    state: State,
    toBack: boolean | null,

    dispatch: React.Dispatch<Action>,
    hover: Hover | null,
) => {
    console.log('Doing a calc');

    const stls: {
        cells: [number, number, number][];
        positions: [number, number, number][];
    }[] = [];

    const baseThick = thick;

    const gids = unique(pathsToShow.map((p) => p.group || ''));

    const pkPaths = pathsToShow
        .map((path) => {
            const style:
                | null
                | { type: 'line'; style: StyleLine }
                | { type: 'fill'; style: Fill } =
                path.style.lines.length === 1
                    ? { type: 'line', style: path.style.lines[0]! }
                    : path.style.fills.length
                    ? { type: 'fill', style: path.style.fills[0]! }
                    : null;

            if (!style) return null;

            const pkpath = PK.FromSVGString(calcPathD(path, 1));

            if (style.type === 'line') {
                pkpath.stroke({
                    width: (style.style.width || 5) / 100,
                    cap: PK.StrokeCap.BUTT,
                    join: PK.StrokeJoin.MITER,
                });
                pkpath.simplify();
            }
            const gat = gids.indexOf(path.group || '');
            return { pkpath, path, gat, style };
        })
        .filter((x) => x != null)
        .sort((a, b) => a.gat - b.gat);

    const border = pkPaths.find(
        ({ path }) => gids[gids.length - 1] === path.group,
    )?.pkpath;

    // TODO: group paths by ... group id.
    const items = pkPaths
        .flatMap(({ path, pkpath, gat, style }, n) => {
            let xoff = gat * baseThick + gap * gat;

            // ermmm so smart collapse? idk maybe.

            const isSelected = selectedIds[path.id];

            console.log('orgi', style.style.originalIdx);
            let thick = baseThick;
            if (
                style.style.originalIdx != null &&
                style.style.originalIdx > 0
            ) {
                thick = mmToPX(0.2, state.meta.ppi);
                xoff += thick;
            }

            const clipped = cmdsToSegments(pkpath.toCmds(), PK)
                .map((r) => transformBarePath(r, [scaleMatrix(1, -1)]))
                .map((r) => ({
                    ...r,
                    bounds: segmentsBounds(r.segments),
                }));
            clipped.sort(
                (a, b) =>
                    b.bounds.x1 - b.bounds.x0 - (a.bounds.x1 - a.bounds.x0),
            );

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

            const outer = rasterSegPoints(
                pathToPoints(houter.segments, houter.origin),
            );
            const inners = holes.map((region) =>
                rasterSegPoints(pathToPoints(region.segments, region.origin)),
            );

            const col =
                style.type === 'line'
                    ? paletteColor(
                          state.palette,
                          style.style.color,
                          style.style.lighten,
                      )
                    : paletteColor(
                          state.palette,
                          style.style.color,
                          style.style.lighten,
                      );

            const geometry = new BufferGeometry();

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

            const thickness =
                toBack === true || (toBack === false && gat === gids.length - 1)
                    ? xoff + thick
                    : thick;

            flat3d.push(...outer.flatMap((pt) => [pt.x, pt.y, -thickness]));
            inners.forEach((pts) => {
                flat3d.push(...pts.flatMap((pt) => [pt.x, pt.y, -thickness]));
            });
            const vertices = new Float32Array(flat3d);
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
                tris.push(
                    start + pts.length - 1,
                    start + count,
                    start + count + pts.length - 1,
                );
            });

            geometry.setIndex(tris);
            geometry.setAttribute('position', new BufferAttribute(vertices, 3));
            geometry.computeVertexNormals();

            const cells: [number, number, number][] = [];
            for (let i = 0; i < tris.length; i += 3) {
                cells.push([tris[i], tris[i + 1], tris[i + 2]]);
            }
            const positions: [number, number, number][] = [];
            for (let i = 0; i < flat3d.length; i += 3) {
                positions.push([flat3d[i], flat3d[i + 1], flat3d[i + 2]]);
            }
            stls.push({
                cells,
                positions: positions.map(([x, y, z]) => [x, y, z + xoff]),
            });

            const center = state.view.center;

            const isHovered = matchesHover(path, hover);

            // return { geometry, xoff, path, col };
            return (
                <React.Fragment key={`${n}`}>
                    <mesh
                        geometry={geometry}
                        position={[center.x, center.y, xoff]}
                        castShadow
                        receiveShadow
                        onClick={(evt) => {
                            evt.stopPropagation();
                            clickItem(
                                evt.nativeEvent.shiftKey,
                                selectedIds,
                                path,
                                state,
                                dispatch,
                            );
                        }}
                    >
                        <meshPhongMaterial
                            flatShading
                            color={isHovered ? 'red' : col}
                        />
                    </mesh>
                    {isSelected ? (
                        <points
                            geometry={geometry}
                            position={[center.x, center.y, xoff]}
                            material={
                                new PointsMaterial({
                                    color: 'white',
                                    size: 0.3,
                                })
                            }
                        />
                    ) : null}
                    {/* <lineSegments
                        position={[0, 0, xoff]}
                        key={`${n}-sel`}
                        geometry={new EdgesGeometry(geometry)}
                        material={
                            new LineBasicMaterial({
                                color: isSelected ? 'red' : '#555',
                            })
                        }
                    /> */}
                </React.Fragment>
            );
        })
        .filter((n) => n != null);

    type PKPath = typeof pkPaths[0]['pkpath'];

    const backs: PKPath[] = [];
    const covers: PKPath[] = [];
    pkPaths.forEach(({ pkpath, style, gat }) => {
        const svgs = style.style.originalIdx === 1 ? covers : backs;
        if (!svgs[gat]) {
            svgs[gat] = pkpath;
            if (border && gat < gids.length - 1) {
                svgs[gat].op(border, PK.PathOp.UNION);
            }
        } else {
            svgs[gat].op(pkpath, PK.PathOp.UNION);
        }
    });
    const convert = (pk: PKPath) => {
        const svg = pk.toSVGString();
        const bounds = pk.computeTightBounds();
        return {
            svg,
            bounds: {
                x: bounds.fLeft,
                y: bounds.fTop,
                w: bounds.fRight - bounds.fLeft,
                h: bounds.fBottom - bounds.fTop,
            },
        };
    };

    return {
        items,
        stls,
        backs: backs.map(convert),
        covers: covers.map(convert),
    };
};

function clickItem(
    shift: boolean,
    selectedIds: Record<string, boolean>,
    path: Path,
    state: State,
    dispatch: React.Dispatch<Action>,
) {
    if (shift && state.selection?.type === 'PathGroup') {
        const k = path.group!;
        dispatch({
            type: 'selection:set',
            selection: {
                type: 'PathGroup',
                ids: state.selection.ids.includes(k)
                    ? state.selection.ids.filter((i) => i !== k)
                    : state.selection.ids.concat([k]),
            },
        });
        return;
    }
    if (selectedIds[path.id]) {
        if (state.selection?.type === 'PathGroup') {
            dispatch({
                type: 'selection:set',
                selection: {
                    type: 'Path',
                    ids: [path.id],
                },
            });
        } else {
            dispatch({
                type: 'selection:set',
                selection: null,
            });
        }
    } else {
        if (shift && state.selection?.type === 'Path') {
            dispatch({
                type: 'selection:set',
                selection: {
                    type: 'Path',
                    ids: state.selection.ids.includes(path.id)
                        ? state.selection.ids.filter((i) => i !== path.id)
                        : state.selection.ids.concat([path.id]),
                },
            });
            return;
        }
        dispatch({
            type: 'selection:set',
            selection: path.group
                ? {
                      type: 'PathGroup',
                      ids: [path.group],
                  }
                : {
                      type: 'Path',
                      ids: [path.id],
                  },
        });
    }
}
