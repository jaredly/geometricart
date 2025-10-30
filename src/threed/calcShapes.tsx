import '@react-three/fiber';
import earcut from 'earcut';
import {Path as PKPath, PathKit} from 'pathkit-wasm';
import React from 'react';
import {BufferAttribute, BufferGeometry, PointsMaterial} from 'three';
import {segmentsBounds} from '../editor/Bounds';
import {calcPathD} from '../editor/calcPathD';
import {paletteColor} from '../editor/RenderPath';
import {Hover} from '../editor/Sidebar';
import {cmdsToSegments} from '../gcode/cmdsToSegments';
import {mmToPX} from '../gcode/pxToMM';
import {scaleMatrix} from '../rendering/getMirrorTransforms';
import {
    ensureClockwise,
    isClockwise,
    pathToPoints,
    rasterSegPoints,
    reversePath,
} from '../rendering/pathToPoints';
import {transformBarePath} from '../rendering/points';
import {Action} from '../state/Action';
import {Fill, Path, State, Style, StyleLine} from '../types';
import {PK} from '../editor/pk';
import {generatePathsAndOutlines} from '../editor/ExportSVG';

const unique = (v: string[]) => {
    const seen: Record<string, true> = {};
    return v.filter((v) => (!seen[v] ? (seen[v] = true) : false));
};

const matchesHover = (path: Path, hover: Hover | null) => {
    if (!hover) return false;
    if (hover.type !== 'element') return false;
    if (hover.kind === 'Path') {
        return hover.id === path.id;
    }
    return hover.kind === 'PathGroup' && hover.id === path.group;
};

const byMultiSvg = (pathsToShow: Path[], multi: State['view']['multi'] & {}): Shapes | null => {
    const grouped = generatePathsAndOutlines(multi, pathsToShow);
    // console.log("grouped", grouped);

    if (!grouped.outlines.length || !grouped.pathsToRender.length) {
        return null;
    }

    // console.log("grp", grouped, multi, pathsToShow);

    const outline = PK.NewPath();
    grouped.outlines.forEach((path) => {
        const pkpath = PK.FromSVGString(calcPathD(path, 1));
        outline.op(pkpath, PK.PathOp.UNION);
        pkpath.delete();
    });

    const populated = grouped.pathsToRender.filter((p) => p.length && p[0].style.lines[0]);

    if (!populated.length) return null;
    const outlinestyle = grouped.outlines[0].style.lines[0]!;

    const styles: StyleLine[] = populated.map((paths) => paths[0].style.lines[0]!);
    // const backcolor = styles.shift()!;
    styles.push({...outlinestyle, originalIdx: 0});
    styles.push(styles.shift()!);

    const pkPaths = populated
        .map((paths, i): Shapes['pkPaths'][0] | undefined => {
            if (!paths.length) return;
            const style = styles[i];
            // const style = paths[0].style.lines[0];
            if (!style) return;
            console.log(style);

            // const pkpath = PK.NewPath();
            const pkpath = outline.copy();
            paths.forEach((path) => {
                const single = PK.FromSVGString(calcPathD(path, 1));

                if (style.color === 2 && style.lighten === 1) {
                    console.log(calcPathD(path, 1));
                    console.log(single.getBounds());
                }

                pkpath.op(single, PK.PathOp.DIFFERENCE);
                single.delete();
            });

            if (!pkpath.toSVGString().trim()) {
                console.log(`This path is bad news sorry`);
                console.log(paths, style);
            }

            // const gat = gids.indexOf(path.group || "");
            return {
                pkpath,
                gat: i,
                style: {type: 'fill', style: {...style, originalIdx: 0}},
                // path: paths[0],
            };
        })
        .filter((x) => x != null);
    // .sort((a, b) => a.gat - b.gat);

    pkPaths.push({
        pkpath: outline,
        gat: -1,
        style: {
            type: 'fill',
            style: {...styles[styles.length - 1], originalIdx: 0}, //grouped.outlines[0].style.lines[0]!,
        },
    });
    // outline.delete();

    return {pkPaths, border: undefined, fullThicknessGat: null};
};

type Shapes = {
    border?: PKPath;
    pkPaths: {
        path?: Path;
        pkpath: PKPath;
        gat: number;
        style: {type: 'line'; style: StyleLine} | {type: 'fill'; style: Fill};
    }[];
    fullThicknessGat: number | null;
};

const byGroupShapes = (pathsToShow: Path[]): Shapes => {
    const gids = unique(pathsToShow.map((p) => p.group || ''));
    const fullThicknessGat = gids.length - 1;

    const pkPaths = pathsToShow
        .map((path) => {
            const style: null | {type: 'line'; style: StyleLine} | {type: 'fill'; style: Fill} =
                path.style.lines.length === 1
                    ? {type: 'line', style: path.style.lines[0]!}
                    : path.style.fills.length
                      ? {type: 'fill', style: path.style.fills[0]!}
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
            return {pkpath, path, gat, style};
        })
        .filter((x) => x != null)
        .sort((a, b) => a.gat - b.gat);

    const border = pkPaths.find(({path}) => gids[gids.length - 1] === path.group)?.pkpath;

    return {border, pkPaths, fullThicknessGat};
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
    useMultiSVG?: State['view']['multi'],
) => {
    console.log('Doing a calc');

    const baseThick = thick;
    const shapes = useMultiSVG ? byMultiSvg(pathsToShow, useMultiSVG) : byGroupShapes(pathsToShow);

    if (!shapes) return;
    const {border, pkPaths, fullThicknessGat} = shapes;

    const stls: {
        cells: [number, number, number][];
        positions: [number, number, number][];
    }[] = [];

    const items = pkPaths
        .flatMap(({path, pkpath, gat, style}, n) => {
            let xoff = gat * baseThick + gap * gat;

            const isSelected = path ? selectedIds[path.id] : false;

            let thick = baseThick;
            if (style.style.originalIdx != null && style.style.originalIdx > 0) {
                thick = mmToPX(0.2, state.meta.ppi);
                xoff += thick;
            }

            const pg = pathToGeometry({
                pkpath,
                fullThickness: toBack === true || (toBack === false && gat === fullThicknessGat),
                xoff,
                thick,
            });
            if (!pg) {
                console.log('Notice! PathToGeometry said no', gat, style);
                return [];
            }
            const {geometry, stl} = pg;
            stls.push(stl);

            const center = state.view.center;

            const col = paletteColor(state.palette, style.style.color, style.style.lighten);

            const isHovered = path ? matchesHover(path, hover) : false;

            return (
                <React.Fragment key={`${n}`}>
                    {/** @ts-ignore */}
                    <mesh
                        geometry={geometry}
                        position={[center.x, center.y, xoff]}
                        castShadow
                        receiveShadow
                        onClick={(evt: any) => {
                            evt.stopPropagation();
                            if (!path) return;
                            clickItem(evt.nativeEvent.shiftKey, selectedIds, path, state, dispatch);
                        }}
                    >
                        {/** @ts-ignore */}
                        <meshPhongMaterial flatShading color={isHovered ? 'red' : col} />
                        {/** @ts-ignore */}
                    </mesh>
                    {isSelected ? (
                        /** @ts-ignore */
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

    const backs: PKPath[] = [];
    const covers: PKPath[] = [];
    pkPaths.forEach(({pkpath, style, gat}) => {
        const svgs = style.style.originalIdx === 1 ? covers : backs;
        if (!svgs[gat]) {
            svgs[gat] = pkpath;
            if (border && fullThicknessGat != null && gat < fullThicknessGat) {
                svgs[gat].op(border, PK.PathOp.UNION);
            }
        } else {
            svgs[gat].op(pkpath, PK.PathOp.UNION);
        }
    });
    const svgPathWithBounds = (pk: PKPath) => {
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
        backs: backs.filter(Boolean).map(svgPathWithBounds),
        covers: covers.filter(Boolean).map(svgPathWithBounds),
    };
};

function pathToGeometry({
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
    const clipped = cmdsToSegments(pkpath.toCmds(), PK)
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

    const thickness = fullThickness ? xoff + thick : thick;

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
        tris.push(start + pts.length - 1, start + count, start + count + pts.length - 1);
    });

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
