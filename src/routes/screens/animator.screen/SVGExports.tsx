import {downloadZip} from 'client-zip';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {BlurInt} from '../../../editor/Forms';
import {
    GeometryInner,
    pathToGeometryInner,
    pathToGeometryMid,
} from '../../../threed/pathToGeometryMid';
import {ThreedScreenInner} from '../../../threed/ThreedScreen';
import {Tiling} from '../../../types';
import {Config} from '../animator';
import {State} from './animator.utils';
import {MessageFromWorker, MessageResponse, MessageToWorker} from './svg-worker';
import {
    BufferAttribute,
    BufferGeometry,
    Float32BufferAttribute,
    Material,
    MeshBasicMaterial,
    MeshPhongMaterial,
    MeshStandardMaterial,
    RepeatWrapping,
    Texture,
    TextureLoader,
    Vector2,
    // normalmap
} from 'three';
import {OrbitingCamera} from './OrbitingCamera';
import {ConfigForm} from './ConfigForm';
import {pkPathWithCmds} from './cropPath';
import {pk} from '../../pk';

const initialTscale = 5;

export type TConfig = {
    mm: [number, number];
    rev: boolean;
    gap: number;
    thick: number;
    size: number;
    tscale: number;
};
const initialTConfig: TConfig = {
    mm: [0, 0],
    rev: false,
    gap: 0,
    thick: 0.1,
    size: 500,
    tscale: 1,
};

export const SVGExports = ({
    state,
    config,
    patternMap,
}: {
    state: State;
    config: Config;
    patternMap: Record<string, Tiling>;
}) => {
    const [svStep, setSvStep] = useState(0.5);
    const [svgs, setSvgs] = useState([] as MessageResponse);
    const [paper, setPaper] = useState(null as null | Texture);
    const [tconfig, setTConfig] = useState(initialTConfig);

    useEffect(() => {
        const loader = new TextureLoader();

        loader.load('/assets/paper4.jpg', (tex) => {
            tex.wrapS = RepeatWrapping;
            tex.wrapT = RepeatWrapping;
            tex.repeat.set(initialTscale, initialTscale);
            setPaper(tex);
        });
    }, []);

    useEffect(() => {
        paper?.repeat.set(tconfig.tscale, tconfig.tscale);
    }, [tconfig.tscale, paper]);

    const threedItems = useMemo(() => {
        return makeThreedItems(tconfig, svgs, paper, config);
    }, [svgs, tconfig, paper, config]);

    const [rotate, setRotate] = useState(false);

    // const worker = useMemo(() => {
    //     const worker = new Worker(new URL('./svg-worker.ts', import.meta.url), {type: 'module'});
    //     return worker;
    // }, []);

    const [progress, setProgress] = useState(null as null | number);

    const worker = useRef(null as null | Worker);
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
            <ThreedScreenInner size={tconfig.size} color="#000">
                {rotate ? <OrbitingCamera radius={10} target={[0, 0, 0]} /> : null}
                {threedItems}
            </ThreedScreenInner>
            <ConfigForm
                tconfig={tconfig}
                setTConfig={setTConfig}
                svgs={svgs}
                svStep={svStep}
                rotate={rotate}
                setRotate={setRotate}
            />
        </div>
    );
};

function makeThreedItems(
    tconfig: TConfig,
    svgs: MessageResponse,
    paper: Texture | null,
    config: Config,
) {
    if (!svgs.length) return [];
    const items = tconfig.rev ? svgs.toReversed() : svgs;
    const mid = (tconfig.thick * items.length + tconfig.gap * (items.length - 1)) / 2;
    const [min, max] = tconfig.mm;
    const selected = items.slice(min, max === 0 ? svgs.length : max);
    if (!selected.length) return [];
    const result = selected.map(({geom}, i) => {
        const geometry = geom.map((sub) =>
            pathToGeometryMid({
                fullThickness: 0,
                thick: tconfig.thick,
                res: sub,
                zoff: i * tconfig.thick + tconfig.gap * i,
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
                        position={[0, 0, i * (tconfig.gap + tconfig.thick) - mid]}
                        castShadow
                        receiveShadow
                        material={[
                            // Front
                            new MeshStandardMaterial({
                                // color: 'red',
                                color: `hsl(30, 100%, ${((i / svgs.length) * 0.1 + 0.5) * 100}%)`,
                                map: paper,
                                normalMap: paper,
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
                                color: '#333',
                                flatShading: true,
                                // map: paper,
                            }),
                            // Inside
                            new MeshStandardMaterial({
                                // color: '#333',
                                color: '#333',
                                // color: `hsl(30, 20%, ${((i / svgs.length) * 0.1 + 0.4) * 100}%)`,
                                flatShading: true,
                                // map: paper,
                                metalness: 0,
                                roughness: 1,
                            }),
                        ]}
                    ></mesh>
                ))}
            </React.Fragment>
        );
    });

    selected[0].bounds.forEach((path, i) => {
        // const index: number[] = [];
        // const vertices: number[] = [];
        // const uvs: number[] = [];

        const pkp = pkPathWithCmds(path.origin, path.segments);
        pkp.stroke({
            width: (config.lineWidth / 200) * svgs[0].zoom,
            cap: config.sharp ? pk.StrokeCap.Butt : pk.StrokeCap.Round,
            join: config.sharp ? pk.StrokeJoin.Miter : pk.StrokeJoin.Round,
        });
        const gi = pathToGeometryInner(pkp);
        if (!gi) return;

        const bufgeom = pathToGeometryMid({
            fullThickness: mid * 2,
            thick: tconfig.thick,
            res: gi,
            zoff: 0,
        });

        // const geometry = new BufferGeometry();
        // geometry.setIndex(index);
        // geometry.setAttribute('position', new BufferAttribute(vertices, 3));
        // geometry.computeVertexNormals();

        // spans.forEach(({start, end}, i) => geometry.addGroup(start, end, i));
        const materials: Material[] = [];

        materials.push(
            new MeshStandardMaterial({
                color: 'hsl(30, 50%, 50%)',
                flatShading: true,
            }),
            new MeshStandardMaterial({
                color: 'hsl(30, 50%, 50%)',
                flatShading: true,
            }),
            new MeshStandardMaterial({
                color: 'hsl(30, 20%, 30%)',
                flatShading: true,
            }),
            // new MeshStandardMaterial({
            //     color: '#333',
            //     flatShading: true,
            // }),
            new MeshStandardMaterial({
                color: '#333',
                flatShading: true,
            }),
        );

        // 3. attach to geometry
        // geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));

        result.push(
            <mesh
                key={i}
                geometry={bufgeom}
                position={[0, 0, -mid - tconfig.thick / 2]}
                castShadow
                receiveShadow
                material={materials}
            />,
        );
    });
    return result;
}
