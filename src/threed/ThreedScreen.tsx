import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BlurInt } from '../editor/Forms';
import { Action } from '../state/Action';
import { Fill, Path, PathGroup, State, StyleLine } from '../types';
// import { Canvas } from '../editor/Canvas';
import earcut from 'earcut';
// import THREE from 'three';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import '@react-three/fiber';
import { Canvas } from '@react-three/fiber';
import {
    BufferAttribute,
    BufferGeometry,
    DirectionalLight,
    EdgesGeometry,
    LineBasicMaterial,
    MeshPhongMaterial,
    MeshStandardMaterial,
    PointsMaterial,
    PerspectiveCamera as TPC,
} from 'three';
import { segmentsBounds } from '../editor/Bounds';
import { calcPathD } from '../editor/calcPathD';
import { PK } from '../editor/pk';
import { paletteColor } from '../editor/RenderPath';
import { usePathsToShow } from '../editor/SVGCanvas';
import { cmdsToSegments } from '../gcode/cmdsToSegments';
import {
    ensureClockwise,
    isClockwise,
    pathToPoints,
    rasterSegPoints,
    reversePath,
} from '../rendering/pathToPoints';
import { useLocalStorage } from '../vest/App';
// @ts-ignore
import { serialize } from './serialize';
// @ts-ignore
import { serializeObj } from './serialize-obj';
import * as fflate from 'fflate';

export const unique = (v: string[]) => {
    const seen: Record<string, true> = {};
    return v.filter((v) => (!seen[v] ? (seen[v] = true) : false));
};

export const useLatest = <T,>(value: T) => {
    const ref = useRef(value);
    ref.current = value;
    return ref;
};

export const ThreedScreen = ({
    state,
    dispatch,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
}) => {
    let { pathsToShow, selectedIds, clip, rand } = usePathsToShow(state);
    const [thick, setThick] = useLocalStorage('thick', 3);
    const [toBack, setToBack] = useState(false as null | boolean);

    const latestState = useLatest(state);

    React.useEffect(() => {
        const fn = (evt: KeyboardEvent) => {
            handleKey(evt, latestState.current, dispatch);
        };
        document.addEventListener('keydown', fn);
        return () => {
            document.removeEventListener('keydown', fn);
        };
    }, [state.selection]);

    const { items, stls } = useMemo(() => {
        return calcShapes(
            pathsToShow,
            thick,
            selectedIds,
            latestState.current,
            toBack,
            dispatch,
        );
    }, [pathsToShow, thick, selectedIds]);

    const canv = React.useRef<HTMLCanvasElement>(null);
    const virtualCamera = React.useRef<TPC>();

    const dl = useRef<DirectionalLight>(null);
    const [move, setMove] = useState(false);

    useEffect(() => {
        if (!dl.current) return;
        dl.current!.shadow.camera.top = -1;
        dl.current!.shadow.camera.bottom = 1;
        dl.current!.shadow.camera.left = -1;
        dl.current!.shadow.camera.right = 1;
        // dl.current!.shadow.camera.matrixWorldNeedsUpdate = true;
        dl.current!.shadow.camera.updateProjectionMatrix();
        // dl.current!.shadow.mapSize.width = 1024;
        // dl.current!.shadow.mapSize.height = 1024;
        // dl.current!.shadow.needsUpdate = true;
    }, [dl.current]);

    const [[x, y], setCpos] = useState<[number, number]>([0, 0]);

    // useEffect(() => {
    //     if (!move) return;
    //     let r = 0;
    //     const iv = setInterval(() => {
    //         const rad = 10;
    //         setCpos([Math.sin(r) * rad, Math.sin(r) * rad]);
    //         r += Math.PI / 30;
    //     }, 50);
    //     return () => clearInterval(iv);
    // }, [move]);

    // const [lpos, setLpos] = useState<[number, number, number]>([3, 0, 10]);
    const lpos = [3, 0, 10] as const;
    // useEffect(() => {
    //     let r = 0;
    //     const iv = setInterval(() => {
    //         r += Math.PI / 10;
    //         setLpos([Math.cos(r) * 2, 0, 10]);
    //         // setLpos([Math.cos(r) * 5, Math.sin(r) * 5, 10]);
    //     }, 100);
    //     return () => clearInterval(iv);
    // }, []);

    // useEffect(() => {
    //     const iv = setInterval(() => {
    //         if (!dl.current) return
    //         // dl.current.update
    //     }, 100)
    //     return () => clearInterval(iv)
    // }, [])

    const tmax = 100;
    const tmin = 0;
    const [twiddle, setTwiddle] = useState(tmin);

    const perc = twiddle / tmax;

    // useEffect(() => {
    //     // virtualCamera.current?.updateMatrix();
    //     // virtualCamera.current?.updateMatrixWorld();
    //     virtualCamera.current?.updateProjectionMatrix();
    // }, [twiddle]);

    // 200 - 30
    // 1000 - 2
    // const cdist = 200 + 800 * perc;
    // const fov = 30 - 28 * perc;
    // const cdist = 1000;
    // const fov = 2;
    const cdist = 70;
    const fov = 40;

    return (
        <div>
            <div
                style={{
                    width: 1000,
                    height: 1000,
                    border: '1px solid magenta',
                }}
            >
                <Canvas
                    ref={canv}
                    // shadows
                    style={{ backgroundColor: 'white' }}
                    // gl={{ physicallyCorrectLights: true, antialias: true }}
                    // onClick={(evt) => {
                    //     if (state.selection) {
                    //         dispatch({
                    //             type: 'selection:set',
                    //             selection: null,
                    //         });
                    //     }
                    // }}
                >
                    {/* <ambientLight /> */}
                    {/* {back} */}
                    <directionalLight
                        // shadowc
                        position={lpos}
                        ref={dl}
                        shadow-mapSize={[1024, 1024]}
                        castShadow
                    />
                    {/* <pointLight position={lpos} /> */}
                    <PerspectiveCamera
                        makeDefault
                        ref={virtualCamera}
                        position={[x, y, cdist]}
                        args={[fov, 1, 1, 2000]}
                    />
                    <OrbitControls camera={virtualCamera.current} />
                    {/* {items.map((item) => item)} */}
                    {items.map(({ material, geometry, xoff, path }, i) => (
                        <mesh
                            key={i}
                            material={material}
                            geometry={geometry}
                            position={[0, 0, xoff]}
                            castShadow
                            receiveShadow
                            onClick={(evt) => {
                                evt.stopPropagation();
                                clickItem(selectedIds, path, state, dispatch);
                            }}
                        ></mesh>
                    ))}
                </Canvas>
            </div>
            <BlurInt value={thick} onChange={(t) => (t ? setThick(t) : null)} />
            <label>
                To Back
                <button
                    disabled={toBack === true}
                    onClick={() => setToBack(true)}
                >
                    All
                </button>
                <button
                    disabled={toBack === false}
                    onClick={() => setToBack(false)}
                >
                    Top
                </button>
                <button
                    disabled={toBack === null}
                    onClick={() => setToBack(null)}
                >
                    None
                </button>
            </label>
            <input
                value={twiddle}
                onChange={(evt) => setTwiddle(+evt.target.value)}
                type="range"
                min={tmin}
                max={tmax}
            />
            {twiddle}
            <button
                onClick={() => {
                    setMove(!move);
                    setCpos([0, 0]);
                }}
            >
                {move ? 'Stop moving' : 'Move'}
            </button>
            <button
                onClick={() => {
                    const node = document.createElement('a');
                    node.download = `group-${Date.now()}.obj`;

                    let off = 0;
                    const res = stls
                        .map(({ cells, positions }, i) => {
                            const txt = serializeObj(
                                cells,
                                positions,
                                // null,
                                // null,
                                // null,
                                // null,
                                `item_${i}`,
                                off,
                            );
                            off += positions.length;
                            return txt;
                        })
                        .join('\n');

                    // node.download = `group-${Date.now()}.zip`;
                    // const map: Record<string, Uint8Array> = {};
                    // stls.forEach(
                    //     ({ cells, positions }, i) =>
                    //         (map[`item_${i}.stl`] = fflate.strToU8(
                    //             serialize(
                    //                 cells,
                    //                 positions,
                    //                 undefined,
                    //                 'item_' + i,
                    //             ),
                    //         )),
                    // );
                    // const res = fflate.zipSync(map);

                    node.href = URL.createObjectURL(
                        new Blob([res], { type: 'text/plain' }),
                    );
                    node.click();
                }}
            >
                Download I guess
            </button>
        </div>
    );
};

export function groupSort(a: PathGroup, b: PathGroup): number {
    return a.ordering == b.ordering
        ? 0
        : a.ordering == null
        ? b.ordering == null
            ? 0
            : b.ordering >= 0
            ? 1
            : -1
        : b.ordering == null
        ? a.ordering >= 0
            ? -1
            : 1
        : b.ordering - a.ordering;
}

const back = () => {
    return useMemo(() => {
        const geometry = new BufferGeometry();
        const material = new MeshStandardMaterial({
            color: '#eeeeee',
            // flatShading: true,
        });
        const vertices = new Float32Array(
            [
                -1, -1, 0,
                //
                -1, 1, 0,
                //
                1, 1, 0,
                //
                1, -1, 0,
                //
                -1, -1, -0.1,
                //
                -1, 1, -0.1,
                //
                1, 1, -0.1,
                //
                1, -1, -0.1,
            ].map((n) => n * 60),
        );
        geometry.setIndex([
            // 1, 2, 3,
            2, 1, 3,
            // 0, 1, 3,
            0, 3, 1, 5, 6, 7, 4, 5, 7,
        ]);
        geometry.setAttribute('position', new BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();
        return (
            <mesh
                material={material}
                geometry={geometry}
                position={[0, 0, -30]}
                // castShadow
                // receiveShadow
            ></mesh>
        );
    }, []);
};

const handleKey = (
    evt: KeyboardEvent,
    state: State,
    dispatch: React.Dispatch<Action>,
) => {
    switch (evt.key) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'PageUp':
        case 'PageDown':
            break;
        default:
            return;
    }
    evt.preventDefault();
    evt.stopPropagation();
    if (state.selection?.type === 'PathGroup') {
        if (state.selection.ids.length === 1) {
            const id = state.selection.ids[0];
            const hasPaths: Record<string, boolean> = {};
            Object.values(state.paths).forEach((p) =>
                p.group != null ? (hasPaths[p.group] = true) : null,
            );
            const groups = Object.values(state.pathGroups)
                .filter((g) => hasPaths[g.id])
                .sort((a, b) => groupSort(a, b));
            const at = groups.findIndex((g) => g.id === id);
            if (at === 0 && evt.key.endsWith('Up')) return;
            if (at === groups.length - 1 && evt.key.endsWith('Down')) return;
            const [got] = groups.splice(at, 1);
            switch (evt.key) {
                case 'ArrowUp':
                    groups.splice(at - 1, 0, got);
                    break;
                case 'ArrowDown':
                    groups.splice(at + 1, 0, got);
                    break;
                case 'PageDown':
                    groups.splice(groups.length, 0, got);
                    break;
                case 'PageUp':
                    groups.splice(0, 0, got);
                    break;
            }
            const order: Record<string, number> = {};
            groups.forEach((group, n) => {
                const i = groups.length - n;
                if (group.ordering !== i) {
                    order[group.id] = i;
                }
            });
            console.log('reorder', order);
            dispatch({ type: 'groups:order', order });
        }
    }
};

const calcShapes = (
    pathsToShow: Path[],
    thick: number,
    selectedIds: Record<string, boolean>,
    state: State,
    toBack: boolean | null,

    dispatch: React.Dispatch<Action>,
) => {
    console.log('Doing a calc');

    const stls: {
        cells: [number, number, number][];
        positions: [number, number, number][];
    }[] = [];

    // TODO: group paths by ... group id.
    const gids = unique(pathsToShow.map((p) => p.group || ''));
    const items = pathsToShow
        .flatMap((path, n) => {
            const gat = gids.indexOf(path.group || '');
            const xoff = gat * thick;

            const isSelected = selectedIds[path.id];

            const style:
                | null
                | { type: 'line'; line: StyleLine }
                | { type: 'fill'; fill: Fill } =
                path.style.lines.length === 1
                    ? { type: 'line', line: path.style.lines[0]! }
                    : path.style.fills.length
                    ? { type: 'fill', fill: path.style.fills[0]! }
                    : null;

            if (!style) return null;

            const pkpath = PK.FromSVGString(calcPathD(path, 10));

            if (style.type === 'line') {
                pkpath.stroke({
                    width: style.line.width! / 10,
                    cap: PK.StrokeCap.BUTT,
                    join: PK.StrokeJoin.MITER,
                });
                pkpath.simplify();
            }

            const clipped = cmdsToSegments(pkpath.toCmds(), PK).map((r) => ({
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
                          style.line.color,
                          style.line.lighten,
                      )
                    : paletteColor(
                          state.palette,
                          style.fill.color,
                          style.fill.lighten,
                      );

            const geometry = new BufferGeometry();

            const material = new MeshPhongMaterial({
                color: col, // isSelected ? '#ffaaaa' : col,
                flatShading: true,
            });

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

            return { material, geometry, xoff, path };
            // <React.Fragment key={`${n}`}>
            //     <mesh
            //         material={material}
            //         geometry={geometry}
            //         position={[0, 0, xoff]}
            //         castShadow
            //         receiveShadow
            //         onClick={(evt) => {
            //             evt.stopPropagation();
            //             clickItem(selectedIds, path, state, dispatch);
            //         }}
            //     ></mesh>
            //     {isSelected ? (
            //         <points
            //             geometry={geometry}
            //             position={[0, 0, xoff]}
            //             material={
            //                 new PointsMaterial({
            //                     color: 'white',
            //                 })
            //             }
            //         />
            //     ) : null}
            //     <lineSegments
            //         position={[0, 0, xoff]}
            //         key={`${n}-sel`}
            //         geometry={new EdgesGeometry(geometry)}
            //         material={
            //             new LineBasicMaterial({
            //                 color: isSelected ? 'red' : '#555',
            //             })
            //         }
            //     />
            // </React.Fragment>
        })
        .filter((n) => n != null);

    return { items, stls };
};

function clickItem(
    selectedIds: Record<string, boolean>,
    path: Path,
    state: State,
    dispatch: React.Dispatch<Action>,
) {
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
