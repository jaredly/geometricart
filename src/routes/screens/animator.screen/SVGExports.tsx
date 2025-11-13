import {downloadZip} from 'client-zip';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {BlurInt} from '../../../editor/Forms';
import {GeometryInner, pathToGeometryMid} from '../../../threed/pathToGeometryMid';
import {ThreedScreenInner} from '../../../threed/ThreedScreen';
import {Tiling} from '../../../types';
import {Config} from '../animator';
import {State} from './animator.utils';
import {MessageFromWorker, MessageToWorker} from './svg-worker';
import {useFrame, useThree} from '@react-three/fiber';
import {
    DirectionalLight,
    MeshBasicMaterial,
    MeshPhongMaterial,
    MeshStandardMaterial,
    RepeatWrapping,
    Texture,
    TextureLoader,
    Vector2,
    // normalmap
} from 'three';

const initialTscale = 5;

export const SVGExports = ({
    state,
    config,
    patternMap,
}: {
    state: State;
    config: Config;
    patternMap: Record<string, Tiling>;
}) => {
    const [svStep, setSvStep] = useState(2);
    // const [svStep, setSvStep] = useState(0.5);
    const [svgs, setSvgs] = useState([] as {svg: string; geom: GeometryInner[]; zoom: number}[]);

    const [paper, setPaper] = useState(null as null | Texture);
    const [tscale, setTscale] = useState(initialTscale);

    useEffect(() => {
        const loader = new TextureLoader();

        loader.load('/assets/paper4.jpg', (tex) => {
            tex.wrapS = RepeatWrapping;
            tex.wrapT = RepeatWrapping;
            tex.repeat.set(initialTscale, initialTscale);

            // const normalMap = computeNormalMap(paperTex.image);
            // material.normalMap = normalMap;
            // material.normalScale.set(1, 1);

            // If you're using a recent Three.js version:
            // tex.colorSpace = SRGBColorSpace;
            setPaper(tex);
        });
    }, []);

    useEffect(() => {
        paper?.repeat.set(tscale, tscale);
    }, [tscale, paper]);

    const [thick, setThick] = useState(0.1);
    const [gap, setGap] = useState(0);

    const [size, setSize] = useState(500);

    const [min, setMin] = useState(0);
    const [max, setMax] = useState(0);
    const [rev, setRev] = useState(false);

    const threedItems = useMemo(() => {
        const items = rev ? svgs.toReversed() : svgs;
        const mid = (thick * items.length + gap * (items.length - 1)) / 2;
        return items.slice(min, max === 0 ? svgs.length : max).map(({geom}, i) => {
            const geometry = geom.map((sub) =>
                pathToGeometryMid({
                    fullThickness: 0,
                    thick,
                    res: sub,
                    zoff: i * thick + gap * i,
                }),
            );
            if (!geometry) {
                return null;
            }
            return (
                <React.Fragment key={`${i}`}>
                    {geometry.map((geom, j) => (
                        <mesh
                            key={j}
                            geometry={geom}
                            position={[0, 0, i * (gap + thick) - mid]}
                            castShadow
                            receiveShadow
                            material={[
                                // Front
                                new MeshStandardMaterial({
                                    // color: 'red',
                                    color: `hsl(30, 100%, ${((i / svgs.length) * 0.1 + 0.5) * 100}%)`,
                                    map: paper,
                                    // normalMap: paper,
                                    // normalScale: new Vector2(0.1, 0.1),
                                    // color: 'white',
                                    flatShading: true,
                                    metalness: 0,
                                    roughness: 1,
                                }),
                                // Back
                                new MeshStandardMaterial({
                                    color: `hsl(30, 100%, ${((i / svgs.length) * 0.1 + 0.5) * 100}%)`,
                                    flatShading: true,
                                    map: paper,
                                }),
                                // Sides
                                new MeshStandardMaterial({
                                    // color: `hsl(30, 50%, ${((i / svgs.length) * 0.1 + 0.4) * 100}%)`,
                                    color: '#666',
                                    flatShading: true,
                                    map: paper,
                                }),
                                // Inside
                                new MeshStandardMaterial({
                                    // color: '#333',
                                    color: `hsl(30, 20%, ${((i / svgs.length) * 0.1 + 0.4) * 100}%)`,
                                    flatShading: true,
                                    map: paper,
                                    metalness: 0,
                                    roughness: 1,
                                }),
                            ]}
                        ></mesh>
                    ))}
                    {/* {isSelected ? (
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
                    ) : null} */}
                </React.Fragment>
            );
        });
    }, [svgs, thick, gap, min, max, rev]);

    const worker = useRef(null as null | Worker);
    const [rotate, setRotate] = useState(false);

    // const worker = useMemo(() => {
    //     const worker = new Worker(new URL('./svg-worker.ts', import.meta.url), {type: 'module'});
    //     return worker;
    // }, []);

    const [progress, setProgress] = useState(null as null | number);

    useEffect(() => {
        if (!worker.current) {
            worker.current = new Worker(new URL('./svg-worker.ts', import.meta.url), {
                type: 'module',
            });
        }
        const fn = (evt: MessageEvent<MessageFromWorker>) => {
            if (Array.isArray(evt.data)) {
                setProgress(null);
                setSvgs(evt.data);
            } else {
                setProgress(evt.data.amount);
            }
        };
        worker.current.onerror = (err) => {
            console.log('ERRR', err);
        };
        worker.current.addEventListener('message', fn);
        return () => worker.current!.removeEventListener('message', fn);
    }, []);

    const form = (
        <div>
            <button
                disabled={progress != null}
                className="btn"
                onClick={() => {
                    // setProgress(0);
                    const msg: MessageToWorker = {
                        state,
                        shape: patternMap[state.layers[0].pattern].shape,
                        config,
                        step: svStep,
                    };
                    worker.current!.postMessage(msg);
                }}
            >
                Generate SVGs {progress != null ? `${Math.round(progress * 100)}%` : ''}
            </button>
            <label className="m-4">
                {'Step: '}
                <BlurInt
                    className="input w-20"
                    step={1}
                    value={svStep}
                    onChange={(value) => (value ? setSvStep(value) : null)}
                />
            </label>
        </div>
    );

    if (!svgs.length) {
        return <div className="bg-base-100 p-4 rounded-md">{form}</div>;
    }

    return (
        <div className="bg-base-100 p-4 rounded-md">
            {form}
            <details>
                <summary>{svgs.length} svgs</summary>
                <div className="flex flex-wrap gap-4">
                    {svgs.map((item, i) => (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox={`${-item.zoom / 2} ${-item.zoom / 2} ${item.zoom} ${item.zoom}`}
                            style={{background: 'black', width: 200, height: 200}}
                            key={i}
                        >
                            <path fill="red" fillRule="evenodd" d={item.svg} />
                        </svg>
                    ))}
                </div>
            </details>
            <div className="mb-4">
                <button className="btn" onClick={() => setSvgs([])}>
                    Clear SVGs
                </button>
                <button
                    className="btn btn-primary ml-4"
                    onClick={async () => {
                        // get the ZIP stream in a Blob
                        const blob = await downloadZip(
                            svgs.map(({svg, zoom}, i) => ({
                                name: `level-${i}.svg`,
                                input: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="${-zoom / 2} ${-zoom / 2} ${zoom} ${zoom}">
            <path fill="red" fill-rule="evenodd" d="${svg}" />
        </svg>`,
                            })),
                        ).blob();

                        // make and click a temporary link to download the Blob
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = 'svgs.zip';
                        link.click();
                        link.remove();
                    }}
                >
                    Download SVGs as .zip
                </button>
            </div>
            <ThreedScreenInner size={size} color="#000">
                {rotate ? <OrbitingCamera radius={10} target={[0, 0, 0]} /> : null}
                {threedItems}
            </ThreedScreenInner>
            <label className="m-4">
                {'Thick: '}
                <BlurInt
                    className="input w-20"
                    step={0.01}
                    value={thick}
                    onChange={(value) => (value != null ? setThick(value) : null)}
                />
            </label>
            <label className="m-4">
                {'Gap: '}
                <BlurInt
                    className="input w-20"
                    step={0.01}
                    value={gap}
                    onChange={(value) => (value != null ? setGap(value) : null)}
                />
            </label>
            <label className="m-4">
                {'Size: '}
                <BlurInt
                    className="input w-20"
                    step={50}
                    value={size}
                    onChange={(value) => (value != null ? setSize(value) : null)}
                />
            </label>
            <button
                className="btn"
                onClick={() => {
                    let m = 0;
                    const step = () => {
                        setMax(m++);
                        if (m < svgs.length + 1) {
                            setTimeout(step, (m - 2) % Math.round(1 / svStep) === 0 ? 1600 : 400);
                        }
                    };
                    step();
                }}
            >
                Animate Max
            </button>
            <div>
                <label className="m-2">
                    {'Min: '}
                    <BlurInt
                        className="input w-10"
                        step={1}
                        value={min}
                        onChange={(value) => (value != null ? setMin(value) : null)}
                    />
                </label>
                <label className="m-2">
                    {'Max: '}
                    <BlurInt
                        className="input w-10"
                        step={1}
                        value={max}
                        onChange={(value) => (value != null ? setMax(value) : null)}
                    />
                </label>
                <label className="m-2">
                    {'Reverse: '}
                    <input
                        type="checkbox"
                        className="checkbox"
                        checked={rev}
                        onChange={() => setRev(!rev)}
                    />
                </label>
                <button
                    className={`btn ` + (rotate ? 'btn-accent' : '')}
                    onClick={() => setRotate(!rotate)}
                >
                    Rotate
                </button>
                <label className="m-2">
                    {'Tscale: '}
                    <BlurInt
                        className="input w-20"
                        step={1}
                        value={tscale}
                        onChange={(value) => (value != null ? setTscale(value) : null)}
                    />
                </label>
            </div>
        </div>
    );
};

function OrbitingCamera({
    radius,
    target = [0, 0, 0],
}: {
    radius: number;
    target: [number, number, number];
}) {
    const {camera, scene} = useThree();
    const angleRef = useRef(Math.PI / 2);

    useFrame((state, delta) => {
        angleRef.current += delta * 0.5; // speed

        camera.position.x = radius * Math.cos(angleRef.current) + target[0];
        camera.position.z = radius * Math.sin(angleRef.current) + target[2];
        camera.position.y = target[1];
        camera.lookAt(...target);

        const light: DirectionalLight = scene.getObjectByName('dirlight') as DirectionalLight;
        if (light) {
            const off = Math.PI / 8;
            light.position.copy(camera.position);
            light.position.set(
                radius * Math.cos(angleRef.current + off) + target[0],
                target[1],
                radius * Math.sin(angleRef.current + off) + target[2],
            );
            light.target.position.set(...target);
            light.target.updateMatrixWorld();
        }
    });

    return null; // this is a "controller" component
}
