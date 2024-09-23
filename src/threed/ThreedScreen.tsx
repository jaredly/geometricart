import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bounds, findBoundingRect } from '../editor/Export';
import { Text } from '../editor/Forms';
import { canvasRender } from '../rendering/CanvasRender';
import { Action } from '../state/Action';
import { Path, State, StyleLine } from '../types';
import PathKitInit, { PathKit } from 'pathkit-wasm';
// import { Canvas } from '../editor/Canvas';
import { IconDelete } from '../icons/Icon';
import earcut from 'earcut';
// import THREE from 'three';
import '@react-three/fiber';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import {
    BufferAttribute,
    BufferGeometry,
    Camera,
    CanvasTexture,
    DoubleSide,
    EdgesGeometry,
    LinearFilter,
    LineBasicMaterial,
    Mesh,
    MeshBasicMaterial,
    MeshPhongMaterial,
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
    isClockwise,
    pathToPoints,
    rasterSegPoints,
} from '../rendering/pathToPoints';
import { PK } from '../editor/pk';
import { calcPathD } from '../editor/calcPathD';
import { paletteColor } from '../editor/RenderPath';
import { cmdsToSegments } from '../gcode/cmdsToSegments';
// PK

const unique = (v: string[]) => {
    const seen: Record<string, true> = {};
    return v.filter((v) => (!seen[v] ? (seen[v] = true) : false));
};

export const ThreedScreen = ({
    state,
    dispatch,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
}) => {
    let { pathsToShow, selectedIds, clip, rand } = usePathsToShow(state);
    // const wood = useLoader(TextureLoader, 'wood.jpg');
    const [tex, setTex] = useState(null as null | Texture);
    useEffect(() => {
        new TextureLoader().load('wood.jpg', (texture) => {
            setTex(texture);
        });
    }, []);

    const items = useMemo(() => {
        if (!tex) return [];
        // ok

        console.log('Doing a calc');

        // TODO: group paths by ... group id.
        const gids = unique(pathsToShow.map((p) => p.group || ''));
        return pathsToShow.flatMap((path, n) => {
            const xoff = gids.indexOf(path.group || '');

            const isSelected = selectedIds[path.id];

            if (path.style.lines.length !== 1) return null;
            const line = path.style.lines[0]!;

            const pkpath = PK.FromSVGString(calcPathD(path, 10));
            pkpath.stroke({
                width: line.width! / 10,
                cap: PK.StrokeCap.BUTT,
                join: PK.StrokeJoin.MITER,
            });
            pkpath.simplify();

            const clipped = cmdsToSegments(pkpath.toCmds(), PK);

            clipped.forEach((region) => {
                console.log('region', isClockwise(region.segments));
            });

            const paths = consumePath(PK, pkpath, path);

            const col = paletteColor(state.palette, line.color, line.lighten);

            return paths.map((path, i) => {
                const geometry = new BufferGeometry();

                const material = new MeshPhongMaterial({
                    color: isSelected ? '#ffaaaa' : col,
                    //0xff0000,
                    // map: tex,
                    flatShading: true,
                });

                const segs = pathToPoints(path.segments, path.origin);
                const points = rasterSegPoints(segs);

                console.log('one', path, points);

                const flat = points.flatMap((pt) => [pt.x, pt.y]);

                const flat3d = points.flatMap((pt) => [pt.x, pt.y, 0 + i * 2]);
                flat3d.push(
                    ...points.flatMap((pt) => [pt.x, pt.y, -1 + i * 2]),
                );
                const vertices = new Float32Array(flat3d);
                // const tris = [];
                const tris = earcut(flat);
                tris.push(...tris.map((n) => n + points.length).reverse());
                for (let i = 0; i < points.length - 1; i++) {
                    tris.push(i + 1, i, i + points.length);
                    tris.push(i + 1, i + points.length, i + points.length + 1);
                }
                tris.push(points.length - 1, points.length, 0);
                tris.push(
                    points.length,
                    points.length - 1,
                    points.length * 2 - 1,
                );

                geometry.setIndex(tris);
                geometry.setAttribute(
                    'position',
                    new BufferAttribute(vertices, 3),
                );

                // const mesh = new Mesh(geometry, material);
                // return { geometry, material, isSelected };
                if (isSelected) {
                    return (
                        <React.Fragment key={`${n}-${i}`}>
                            <mesh
                                material={material}
                                geometry={geometry}
                                position={[0, 0, xoff]}
                            ></mesh>
                            <lineSegments
                                position={[0, 0, xoff]}
                                key={`${n}-${i}-sel`}
                                geometry={new EdgesGeometry(geometry)}
                                material={
                                    new LineBasicMaterial({
                                        color: 'red',
                                    })
                                }
                            />
                        </React.Fragment>
                    );
                }
                // return (
                //     <mesh
                //         key={`${n}-${i}`}
                //         material={material}
                //         geometry={geometry}
                //         position={[0, 0, xoff]}
                //     ></mesh>
                // );
                return (
                    <React.Fragment key={`${n}-${i}`}>
                        <mesh
                            material={material}
                            geometry={geometry}
                            position={[0, 0, xoff]}
                        ></mesh>
                        <lineSegments
                            position={[0, 0, xoff]}
                            key={`${n}-${i}-sel`}
                            geometry={new EdgesGeometry(geometry)}
                            material={
                                new LineBasicMaterial({
                                    color: '#555',
                                })
                            }
                        />
                    </React.Fragment>
                );
            });
        });
    }, [pathsToShow, tex]);
    const canv = React.useRef<HTMLCanvasElement>(null);
    const virtualCamera = React.useRef<Camera>();

    return (
        <div>
            Ok lol
            <div
                style={{
                    width: 1000,
                    height: 1000,
                    border: '1px solid magenta',
                }}
            >
                <Canvas ref={canv} style={{ backgroundColor: 'white' }}>
                    <ambientLight />
                    <pointLight position={[10, 10, 10]} />
                    {/* <VBox tx={tx} data={data} scale={scale} /> */}
                    {/* <GetState ok={stateRef} /> */}
                    <PerspectiveCamera
                        makeDefault
                        ref={virtualCamera}
                        position={[0, 0, 100]}
                        args={[30, 1, 1, 1000]}
                    />
                    <OrbitControls camera={virtualCamera.current} />
                    {items.map((item) => item)}
                </Canvas>
            </div>
        </div>
    );
};
