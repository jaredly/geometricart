import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bounds, findBoundingRect } from '../editor/Export';
import { BlurInt, Text } from '../editor/Forms';
import { canvasRender } from '../rendering/CanvasRender';
import { Action } from '../state/Action';
import { Fill, Path, PathGroup, State, StyleLine } from '../types';
import PathKitInit, { PathKit } from 'pathkit-wasm';
// import { Canvas } from '../editor/Canvas';
import { IconDelete } from '../icons/Icon';
import earcut from 'earcut';
// import THREE from 'three';
import '@react-three/fiber';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import {
    OrbitControls,
    PerspectiveCamera,
    PointMaterial,
} from '@react-three/drei';
import {
    BufferAttribute,
    BufferGeometry,
    Camera,
    CanvasTexture,
    DirectionalLight,
    DoubleSide,
    EdgesGeometry,
    LinearFilter,
    LineBasicMaterial,
    Mesh,
    MeshBasicMaterial,
    MeshPhongMaterial,
    MeshStandardMaterial,
    PointsMaterial,
    RepeatWrapping,
    ShaderMaterial,
    Texture,
    TextureLoader,
    Vector3,
} from 'three';
import { consumePath, getClips, PKInsetCache } from '../rendering/pkInsetPaths';
import { sortedVisibleInsetPaths } from '../rendering/sortedVisibleInsetPaths';
import Prando from 'prando';
import { getSelectedIds, usePathsToShow } from '../editor/SVGCanvas';
import {
    ensureClockwise,
    isClockwise,
    pathToPoints,
    rasterSegPoints,
    reversePath,
} from '../rendering/pathToPoints';
import { PK } from '../editor/pk';
import { calcPathD } from '../editor/calcPathD';
import { paletteColor } from '../editor/RenderPath';
import { cmdsToSegments } from '../gcode/cmdsToSegments';
import { segmentsBounds } from '../editor/Bounds';
// PK

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
    const [thick, setThick] = useState(3);

    const latestState = useLatest(state);

    React.useEffect(() => {
        const fn = (evt: KeyboardEvent) => {
            const state = latestState.current;
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
                    if (at === groups.length - 1 && evt.key.endsWith('Down'))
                        return;
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
        document.addEventListener('keydown', fn);
        return () => {
            document.removeEventListener('keydown', fn);
        };
    }, [state.selection]);

    const items = useMemo(() => {
        console.log('Doing a calc');

        // TODO: group paths by ... group id.
        const gids = unique(pathsToShow.map((p) => p.group || ''));
        return pathsToShow.flatMap((path, n) => {
            const xoff = gids.indexOf(path.group || '') * thick;

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

            // const paths = consumePath(PK, pkpath, path);

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
                //0xff0000,
                // map: tex,
                flatShading: true,
            });

            // const segs = pathToPoints(path.segments, path.origin);
            // const points = rasterSegPoints(segs);

            // console.log('one', path, points);

            const flat = outer.flatMap((pt) => [pt.x, pt.y]);
            const flat3d = outer.flatMap((pt) => [pt.x, pt.y, 0]);
            const holeStarts: number[] = [];
            let count = outer.length;
            // console.log('outer', outer);

            inners.forEach((pts) => {
                // console.log('inner', pts);
                holeStarts.push(count);
                flat.push(...pts.flatMap((pt) => [pt.x, pt.y]));
                flat3d.push(...pts.flatMap((pt) => [pt.x, pt.y, 0]));
                count += pts.length;
            });

            flat3d.push(...outer.flatMap((pt) => [pt.x, pt.y, -thick]));
            inners.forEach((pts) => {
                flat3d.push(...pts.flatMap((pt) => [pt.x, pt.y, -thick]));
            });
            const vertices = new Float32Array(flat3d);
            // const tris = [];
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

            // let start = outer.length;
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
                // tris.push(count, outer.length - 1, 0);
                // tris.push(outer.length - 1, count, count + outer.length - 1);

                // start += pts.length;
            });

            geometry.setIndex(tris);
            geometry.setAttribute('position', new BufferAttribute(vertices, 3));
            geometry.computeVertexNormals();

            return (
                <React.Fragment key={`${n}`}>
                    <mesh
                        material={material}
                        geometry={geometry}
                        position={[0, 0, xoff]}
                        // castShadow
                        // receiveShadow
                        onClick={(evt) => {
                            evt.stopPropagation();
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
                        }}
                    ></mesh>
                    {isSelected ? (
                        <points
                            geometry={geometry}
                            position={[0, 0, xoff]}
                            material={
                                new PointsMaterial({
                                    color: 'white',
                                })
                            }
                        />
                    ) : null}
                    <lineSegments
                        position={[0, 0, xoff]}
                        key={`${n}-sel`}
                        geometry={new EdgesGeometry(geometry)}
                        material={
                            new LineBasicMaterial({
                                color: isSelected ? 'red' : '#555',
                            })
                        }
                    />
                </React.Fragment>
            );
        });
    }, [pathsToShow, thick]);
    const canv = React.useRef<HTMLCanvasElement>(null);
    const virtualCamera = React.useRef<Camera>();

    const dl = useRef<DirectionalLight>(null);

    const [[x, y], setCpos] = useState<[number, number]>([0, 0]);
    // useEffect(() => {
    //     let r = 0;
    //     const iv = setInterval(() => {
    //         r += Math.PI / 30;
    //         const rad = 30;
    //         setCpos([Math.cos(r) * rad, Math.sin(r) * rad]);
    //         virtualCamera.current?.lookAt(new Vector3(x, y, 0));
    //         virtualCamera.current!.matrixWorldNeedsUpdate = true;
    //         // setLpos([Math.cos(r) * 5, Math.sin(r) * 5, 10]);
    //     }, 100);
    //     return () => clearInterval(iv);
    // }, []);

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
                    gl={{ physicallyCorrectLights: true, antialias: true }}
                    // onClick={(evt) => {
                    //     if (state.selection) {
                    //         dispatch({
                    //             type: 'selection:set',
                    //             selection: null,
                    //         });
                    //     }
                    // }}
                >
                    <ambientLight />
                    {/* {back} */}
                    <directionalLight
                        position={lpos}
                        ref={dl}
                        shadow-mapSize={[1024, 1024]}
                    />
                    <pointLight position={lpos} />
                    <PerspectiveCamera
                        makeDefault
                        ref={virtualCamera}
                        position={[x, y, 200]}
                        args={[30, 1, 1, 1000]}
                    />
                    <OrbitControls camera={virtualCamera.current} />
                    {items.map((item) => item)}
                </Canvas>
            </div>
            <BlurInt value={thick} onChange={(t) => (t ? setThick(t) : null)} />
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
