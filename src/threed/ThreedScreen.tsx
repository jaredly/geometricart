import React, { useMemo, useRef, useState } from 'react';
import { BlurInt } from '../editor/Forms';
import { Action } from '../state/Action';
import { PathGroup, State } from '../types';
import { OrbitControls, PerspectiveCamera, useHelper } from '@react-three/drei';
import '@react-three/fiber';
import { Canvas } from '@react-three/fiber';
import {
    BufferAttribute,
    BufferGeometry,
    CameraHelper,
    DirectionalLight,
    MeshStandardMaterial,
    PerspectiveCamera as TPC,
} from 'three';
import { usePathsToShow } from '../editor/SVGCanvas';
import { useLocalStorage } from '../vest/App';
// @ts-ignore
import { serializeObj } from './serialize-obj';
import { calcShapes } from './calcShapes';
import { addMetadata } from '../editor/ExportPng';
import { initialHistory } from '../state/initialState';
import { Hover } from '../editor/Sidebar';

export const useLatest = <T,>(value: T) => {
    const ref = useRef(value);
    ref.current = value;
    return ref;
};

export const ThreedScreen = ({
    state,
    dispatch,
    hover,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
    hover: Hover | null;
}) => {
    let { pathsToShow, selectedIds, clip, rand } = usePathsToShow(state);
    const [thick, setThick] = useLocalStorage('thick', 3);
    const [gap, setGap] = useLocalStorage('gap', 2);
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
            gap,
            selectedIds,
            latestState.current,
            toBack,
            dispatch,
            hover,
        );
    }, [pathsToShow, thick, selectedIds, toBack, gap, hover]);

    const canv = React.useRef<HTMLCanvasElement>(null);
    const virtualCamera = React.useRef<TPC>();
    const sc = React.useRef<TPC>();

    const dl = useRef<DirectionalLight>(null);
    const [move, setMove] = useState(false);

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

    const [lpos, setLpos] = useState<[number, number, number]>([3, 0, 100]);
    // const lpos = [0, 0, 10] as const;
    // useEffect(() => {
    //     let r = 0;
    //     const iv = setInterval(() => {
    //         r += Math.PI / 40;
    //         // setLpos([Math.cos(r) * 2, 0, 10]);
    //         setLpos([Math.cos(r) * 5, Math.sin(r) * 5, 10]);
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
    const [exurl, setExport] = useState(null as null | string);

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
                    shadows
                    style={{ backgroundColor: 'white' }}
                    gl={{ antialias: true, preserveDrawingBuffer: true }}
                >
                    <directionalLight
                        position={lpos}
                        ref={dl}
                        shadow-mapSize={[2048, 2048]}
                        castShadow
                    >
                        <orthographicCamera
                            zoom={0.009}
                            attach="shadow-camera"
                        ></orthographicCamera>
                    </directionalLight>
                    {/* {sc.current ? <cameraHelper camera={sc.current} /> : null} */}
                    <ambientLight intensity={0.3} />
                    <CH camera={sc} />

                    <PerspectiveCamera
                        makeDefault
                        ref={virtualCamera}
                        position={[x, y, cdist]}
                        args={[fov, 1, 1, 2000]}
                    />
                    <OrbitControls camera={virtualCamera.current} />
                    {items}
                </Canvas>
            </div>
            <div>
                <label>
                    Thickness
                    <BlurInt
                        value={thick}
                        onChange={(t) => (t != null ? setThick(t) : null)}
                    />
                </label>
                <label>
                    Gap
                    <BlurInt
                        value={gap}
                        onChange={(t) => (t != null ? setGap(t) : null)}
                    />
                </label>
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
            </div>
            <div>
                <div>Light pos</div>
                x
                <BlurInt
                    value={lpos[0]}
                    onChange={(t) =>
                        t ? setLpos([t, lpos[1], lpos[2]]) : null
                    }
                />
                y
                <BlurInt
                    value={lpos[1]}
                    onChange={(t) =>
                        t ? setLpos([lpos[0], t, lpos[2]]) : null
                    }
                />
                z
                <BlurInt
                    value={lpos[2]}
                    onChange={(t) =>
                        t ? setLpos([lpos[0], lpos[1], t]) : null
                    }
                />
            </div>
            <div>
                <button
                    onClick={() => {
                        // const c2 = document.createElement('canvas');
                        // const ctx = c2.getContext('2d')!;
                        // ctx.fillRect(0, 0, 100, 100);
                        // ctx.drawImage(canv.current!, 0, 0);
                        // setExport(c2.toDataURL());
                        // setExport(canv.current!.toDataURL());
                        canv.current!.toBlob(async (blob) => {
                            blob = await addMetadata(blob, {
                                ...state,
                                history: initialHistory,
                            });
                            setExport(URL.createObjectURL(blob!));
                        });
                    }}
                >
                    Export image with state
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
                                    `item_${i}`,
                                    off,
                                );
                                off += positions.length;
                                return txt;
                            })
                            .join('\n');

                        node.href = URL.createObjectURL(
                            new Blob([res], { type: 'text/plain' }),
                        );
                        node.click();
                    }}
                >
                    Download .obj of the scene
                </button>
            </div>
            {exurl ? (
                <div>
                    <a href={exurl} download={`render-${Date.now()}.png`}>
                        <img
                            src={exurl}
                            style={{ maxWidth: 200, maxHeight: 200 }}
                        />
                    </a>
                    <button onClick={() => setExport(null)}>Clear</button>
                </div>
            ) : null}
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

const CH = ({ camera }: { camera: any }) => {
    useHelper(camera, CameraHelper); //, 1, 'hotpink')

    return null;
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
