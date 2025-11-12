import {OrbitControls, PerspectiveCamera, ArcballControls} from '@react-three/drei';
import '@react-three/fiber';
import {Canvas} from '@react-three/fiber';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {DirectionalLight, PerspectiveCamera as TPC} from 'three';
import {BlurInt} from '../editor/Forms';
import {paletteColor} from '../editor/RenderPath';
import {Hover} from '../editor/Sidebar';
import {usePathsToShow} from '../editor/SVGCanvas';
import {mmToPX} from '../gcode/pxToMM';
import {Action} from '../state/Action';
import {State} from '../types';
import {calcShapes} from './calcShapes';
import {ExportSection} from './ExportSection';
import {groupSort} from './groupSort';

const useLatest = <T,>(value: T) => {
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
    let {pathsToShow, selectedIds} = usePathsToShow(state);
    const {
        thickness = 3,
        gap = 0,
        shadowZoom = 0.09,
        cameraDistance = 70,
        useMultiSVG,
    } = state.meta.threedSettings ?? {};

    const toBack = false; // TODO make this customizeable? idkyyy

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

    const thickPX = mmToPX(thickness, state.meta.ppi);
    const gapPX = mmToPX(gap, state.meta.ppi);

    const calced = useMemo(() => {
        return calcShapes(
            pathsToShow,
            thickPX,
            gapPX,
            selectedIds,
            latestState.current,
            toBack,
            dispatch,
            hover,
            useMultiSVG ? state.view.multi : undefined,
        );
    }, [
        pathsToShow,
        thickPX,
        selectedIds,
        toBack,
        gapPX,
        hover,
        useMultiSVG ? state.view.multi : undefined,
    ]);

    const canv = React.useRef<HTMLCanvasElement>(null);
    const virtualCamera = React.useRef<TPC>(null);
    const sc = React.useRef<TPC>(null);

    const dl = useRef<DirectionalLight>(null);
    const [move, setMove] = useState(false);

    const [[x, y], setCpos] = useState<[number, number]>([0, 0]);

    const [lpos, setLpos] = useState<[number, number, number]>([3, 0, 100]);

    useEffect(() => {
        if (!move) return;
        let r = 0;
        const iv = setInterval(() => {
            r += Math.PI / 80;
            setLpos([Math.cos(r) * 5, Math.sin(r) * 5, 10]);
        }, 100);
        return () => clearInterval(iv);
    }, [move]);

    if (!calced) return <div>No shapes</div>;

    const {items, stls, backs, covers} = calced;
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
                    shadows
                    style={{backgroundColor: 'white'}}
                    gl={{antialias: true, preserveDrawingBuffer: true}}
                >
                    <directionalLight
                        position={lpos}
                        ref={dl}
                        shadow-mapSize={[2048 * 4, 2048 * 4]}
                        // shadow-mapSize={[2048, 2048]}
                        castShadow
                    >
                        <orthographicCamera
                            zoom={shadowZoom}
                            attach="shadow-camera"
                        ></orthographicCamera>
                    </directionalLight>
                    <ambientLight intensity={0.3} />

                    <PerspectiveCamera
                        makeDefault
                        ref={virtualCamera}
                        position={[x, y, cameraDistance]}
                        args={[fov, 1, 1, 2000]}
                    />
                    <OrbitControls camera={virtualCamera.current!} />

                    <mesh position={[0, 0, -1]}>
                        <planeGeometry attach="geometry" args={[100, 100]} />
                        <meshPhongMaterial
                            attach="material"
                            color={paletteColor(state.palette, state.view.background)}
                        />
                    </mesh>
                    {items}
                </Canvas>
            </div>
            <CameraForm
                cameraDistance={cameraDistance}
                dispatch={dispatch}
                state={state}
                shadowZoom={shadowZoom}
                thickness={thickness}
                gap={gap}
                setMove={setMove}
                move={move}
                setCpos={setCpos}
                useMultiSVG={useMultiSVG}
            />
            <LightPosForm lpos={lpos} setLpos={setLpos} />
            <ExportSection canv={canv} state={state} stls={stls} backs={backs} covers={covers} />
        </div>
    );
};

export const ThreedScreenInner = ({
    children,
    color,
    size,
}: {
    children: React.ReactNode;
    color: string;
    size: number;
}) => {
    const fov = 40;
    const canv = React.useRef<HTMLCanvasElement>(null);
    const [lpos, setLpos] = useState<[number, number, number]>([3, 0, 100]);
    const dl = useRef<DirectionalLight>(null);

    const {shadowZoom = 0.09, cameraDistance = 5} = {};
    const virtualCamera = React.useRef<TPC>(null);
    const [[x, y], setCpos] = useState<[number, number]>([0, 0]);

    const boxsize = 1000;

    return (
        <div>
            <Canvas
                ref={canv}
                shadows
                style={{backgroundColor: 'white', height: size, width: size}}
                gl={{antialias: true, preserveDrawingBuffer: true}}
            >
                {/* <directionalLight
                    position={lpos}
                    ref={dl}
                    name="dirlight"
                    shadow-mapSize={[2048 * 4, 2048 * 4]}
                    // shadow-mapSize={[2048, 2048]}
                    castShadow
                    intensity={2}
                >
                    <orthographicCamera
                        zoom={shadowZoom}
                        attach="shadow-camera"
                    ></orthographicCamera>
                </directionalLight>

                <directionalLight
                    position={[0, 2, 10]}
                    ref={dl}
                    shadow-mapSize={[2048 * 4, 2048 * 4]}
                    // shadow-mapSize={[2048, 2048]}
                    castShadow
                    intensity={3}
                >
                    <orthographicCamera
                        zoom={shadowZoom}
                        attach="shadow-camera"
                    ></orthographicCamera>
                </directionalLight> */}

                {/* <directionalLight
                    position={[0, 0, -100]}
                    ref={dl}
                    shadow-mapSize={[2048 * 4, 2048 * 4]}
                    // shadow-mapSize={[2048, 2048]}
                    castShadow
                >
                    <orthographicCamera
                        zoom={shadowZoom}
                        attach="shadow-camera"
                    ></orthographicCamera>
                </directionalLight> */}

                <ambientLight intensity={1} />

                <PerspectiveCamera
                    makeDefault
                    ref={virtualCamera}
                    position={[x, y, cameraDistance]}
                    args={[fov, 1, 1, 2000]}
                />
                <OrbitControls camera={virtualCamera.current!} />
                {/* <ArcballControls camera={virtualCamera.current!} /> */}

                <SkyBox boxsize={boxsize} color={color} />

                {children}
            </Canvas>
            <LightPosForm lpos={lpos} setLpos={setLpos} />
        </div>
    );
};

const SkyBox = ({boxsize, color}: {boxsize: number; color: string}) => (
    <>
        <mesh position={[0, 0, -boxsize / 2]}>
            <planeGeometry attach="geometry" args={[boxsize, boxsize]} />
            <meshBasicMaterial attach="material" color={color} />
        </mesh>

        <mesh position={[0, boxsize / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry attach="geometry" args={[boxsize, boxsize]} />
            <meshBasicMaterial attach="material" color={color} />
        </mesh>

        <mesh position={[0, -boxsize / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry attach="geometry" args={[boxsize, boxsize]} />
            <meshBasicMaterial attach="material" color={color} />
        </mesh>

        <mesh position={[0, 0, boxsize / 2]} rotation={[0, Math.PI, 0]}>
            <planeGeometry attach="geometry" args={[boxsize, boxsize]} />
            <meshBasicMaterial attach="material" color={color} />
        </mesh>

        <mesh position={[-boxsize / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry attach="geometry" args={[boxsize, boxsize]} />
            <meshBasicMaterial attach="material" color={color} />
        </mesh>

        <mesh position={[boxsize / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry attach="geometry" args={[boxsize, boxsize]} />
            <meshBasicMaterial attach="material" color={color} />
        </mesh>
    </>
);

const handleKey = (evt: KeyboardEvent, state: State, dispatch: React.Dispatch<Action>) => {
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
            dispatch({type: 'groups:order', order});
        }
    }
};

function LightPosForm({
    lpos,
    setLpos,
}: {
    lpos: [number, number, number];
    setLpos: React.Dispatch<React.SetStateAction<[number, number, number]>>;
}) {
    return (
        <div>
            <div>Light pos</div>
            x
            <BlurInt
                value={lpos[0]}
                onChange={(t) => (t != null ? setLpos([t, lpos[1], lpos[2]]) : null)}
            />
            y
            <BlurInt
                value={lpos[1]}
                onChange={(t) => (t != null ? setLpos([lpos[0], t, lpos[2]]) : null)}
            />
            z
            <BlurInt
                value={lpos[2]}
                onChange={(t) => (t != null ? setLpos([lpos[0], lpos[1], t]) : null)}
            />
        </div>
    );
}

function CameraForm({
    cameraDistance,
    dispatch,
    state,
    shadowZoom,
    thickness,
    gap,
    setMove,
    move,
    setCpos,
    useMultiSVG,
}: {
    cameraDistance: number;
    dispatch: React.Dispatch<Action>;
    state: State;
    shadowZoom: number;
    thickness: number;
    gap: number;
    setMove: React.Dispatch<React.SetStateAction<boolean>>;
    move: boolean;
    setCpos: React.Dispatch<React.SetStateAction<[number, number]>>;
    useMultiSVG: boolean | undefined;
}) {
    return (
        <div>
            <label>
                Camera Distance
                <BlurInt
                    value={cameraDistance}
                    onChange={(t) =>
                        t != null
                            ? dispatch({
                                  type: 'meta:update',
                                  meta: {
                                      ...state.meta,
                                      threedSettings: {
                                          ...state.meta.threedSettings,
                                          cameraDistance: t,
                                      },
                                  },
                              })
                            : null
                    }
                />
            </label>
            <label>
                ShadowZoom
                <BlurInt
                    value={shadowZoom}
                    onChange={(t) =>
                        t != null
                            ? dispatch({
                                  type: 'meta:update',
                                  meta: {
                                      ...state.meta,
                                      threedSettings: {
                                          ...state.meta.threedSettings,
                                          shadowZoom: t,
                                      },
                                  },
                              })
                            : null
                    }
                />
            </label>
            <label>
                Thickness (mm)
                <BlurInt
                    value={thickness}
                    onChange={(t) =>
                        t != null
                            ? dispatch({
                                  type: 'meta:update',
                                  meta: {
                                      ...state.meta,
                                      threedSettings: {
                                          ...state.meta.threedSettings,
                                          thickness: t,
                                      },
                                  },
                              })
                            : null
                    }
                />
            </label>
            <label>
                Gap (mm)
                <BlurInt
                    value={gap}
                    onChange={(t) =>
                        t != null
                            ? dispatch({
                                  type: 'meta:update',
                                  meta: {
                                      ...state.meta,
                                      threedSettings: {...state.meta.threedSettings, gap: t},
                                  },
                              })
                            : null
                    }
                />
            </label>
            <button
                onClick={() => {
                    setMove(!move);
                    setCpos([0, 0]);
                }}
            >
                {move ? 'Stop moving' : 'Move'}
            </button>
            <label>
                Use multi svg
                <input
                    type="checkbox"
                    checked={useMultiSVG}
                    onChange={(t) =>
                        dispatch({
                            type: 'meta:update',
                            meta: {
                                ...state.meta,
                                threedSettings: {
                                    ...state.meta.threedSettings,
                                    useMultiSVG: t.target.checked,
                                },
                            },
                        })
                    }
                />
            </label>
        </div>
    );
}
