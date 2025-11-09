import '@react-three/fiber';
import earcut from 'earcut';
import {Path as PKPath} from 'canvaskit-wasm';
import React from 'react';
import {PointsMaterial} from 'three';
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
import {Coord, Fill, Path, State, StyleLine} from '../types';
import {pk as PK} from '../routes/pk';
import {generatePathsAndOutlines} from '../editor/generatePathsAndOutlines';
import {ThreeEvent} from '@react-three/fiber';
import {pathToGeometry} from './pathToGeometryMid';

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

    const outline = new PK.Path();
    grouped.outlines.forEach((path) => {
        const pkpath = PK.Path.MakeFromSVGString(calcPathD(path, 1))!;
        outline.op(pkpath, PK.PathOp.Union);
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
                const single = PK.Path.MakeFromSVGString(calcPathD(path, 1))!;

                if (style.color === 2 && style.lighten === 1) {
                    console.log(calcPathD(path, 1));
                    console.log(single.getBounds());
                }

                pkpath.op(single, PK.PathOp.Difference);
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

            const pkpath = PK.Path.MakeFromSVGString(calcPathD(path, 1))!;

            if (style.type === 'line') {
                pkpath.stroke({
                    width: (style.style.width || 5) / 100,
                    cap: PK.StrokeCap.Butt,
                    join: PK.StrokeJoin.Miter,
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

    const items = pkPathToThreed(
        pkPaths,
        baseThick,
        gap,
        selectedIds,
        state,
        toBack === false ? fullThicknessGat : toBack,
        stls,
        hover,
        (evt: ThreeEvent<MouseEvent>, path: Path) => {
            clickItem(evt.nativeEvent.shiftKey, selectedIds, path, state, dispatch);
        },
    );

    const backs: PKPath[] = [];
    const covers: PKPath[] = [];
    pkPaths.forEach(({pkpath, style, gat}) => {
        const svgs = style.style.originalIdx === 1 ? covers : backs;
        if (!svgs[gat]) {
            svgs[gat] = pkpath;
            if (border && fullThicknessGat != null && gat < fullThicknessGat) {
                svgs[gat].op(border, PK.PathOp.Union);
            }
        } else {
            svgs[gat].op(pkpath, PK.PathOp.Union);
        }
    });
    const svgPathWithBounds = (pk: PKPath) => {
        const svg = pk.toSVGString();
        const bounds = pk.computeTightBounds();
        return {
            svg,
            bounds: {
                x: bounds[0],
                y: bounds[1],
                w: bounds[3] - bounds[0],
                h: bounds[4] - bounds[1],
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

function pkPathToThreed(
    pkPaths: {
        path?: Path;
        pkpath: PKPath;
        gat: number;
        style: {type: 'line'; style: StyleLine} | {type: 'fill'; style: Fill};
    }[],
    baseThick: number,
    gap: number,
    selectedIds: Record<string, boolean>,
    state: State,
    toBack: boolean | number | null,
    stls: {cells: [number, number, number][]; positions: [number, number, number][]}[],
    hover: Hover | null,
    onClick: (evt: ThreeEvent<MouseEvent>, path: Path) => void,
) {
    return pkPaths
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
                fullThickness: typeof toBack === 'number' ? toBack === gat : !!toBack,
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
                    <mesh
                        geometry={geometry}
                        position={[center.x, center.y, xoff]}
                        castShadow
                        receiveShadow
                        onClick={(evt: ThreeEvent<MouseEvent>) => {
                            evt.stopPropagation();
                            if (!path) return;
                            onClick(evt, path);
                        }}
                    >
                        <meshPhongMaterial flatShading color={isHovered ? 'red' : col} />
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
                </React.Fragment>
            );
        })
        .filter((n) => n != null);
}

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
