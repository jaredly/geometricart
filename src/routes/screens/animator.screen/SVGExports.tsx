import {Path as PKPath} from 'canvaskit-wasm';
import {downloadZip} from 'client-zip';
import React, {useState, useMemo, useEffect, useRef} from 'react';
import {BlurInt} from '../../../editor/Forms';
import {epsilon} from '../../../rendering/epsilonToZero';
import {
    GeometryInner,
    pathToGeometry,
    pathToGeometryInner,
} from '../../../threed/pathToGeometryMid';
import {pathToGeometryMid} from '../../../threed/pathToGeometryMid';
import {ThreedScreenInner} from '../../../threed/ThreedScreen';
import {Tiling} from '../../../types';
import {pk} from '../../pk';
import {Config} from '../animator';
import {calcMargin} from './calcMargin';
import {State} from './animator.utils';
import {combinedPath} from './renderFrame';
import {MessageFromWorker, MessageToWorker} from './svg-worker';

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
    const [svgs, setSvgs] = useState([] as {svg: string; geom: GeometryInner[]; zoom: number}[]);

    const [thick, setThick] = useState(0.21);
    const [gap, setGap] = useState(0);

    const [size, setSize] = useState(500);

    const [min, setMin] = useState(0);
    const [max, setMax] = useState(0);

    const threedItems = useMemo(() => {
        return svgs.slice(min, max === 0 ? svgs.length : max).map(({geom}, i) => {
            const geometry = geom.map((sub) =>
                pathToGeometryMid({
                    fullThickness: false,
                    xoff: i * (gap + thick),
                    thick,
                    res: sub,
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
                            position={[0, 0, i * (gap + thick)]}
                            castShadow
                            receiveShadow
                        >
                            <meshPhongMaterial
                                flatShading
                                color={`hsl(30, 100%, ${((i / svgs.length) * 0.5 + 0.2) * 100}%)`}
                            />
                        </mesh>
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
    }, [svgs, thick, gap, min, max]);

    const worker = useRef(null as null | Worker);

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

    return (
        <div className="bg-base-100 p-4 rounded-md">
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
                Worker SVGS {progress != null ? `${Math.round(progress * 100)}%` : ''}
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
            {svgs.length ? (
                <>
                    <button className="btn" onClick={() => setSvgs([])}>
                        Clear SVGs
                    </button>
                    <button
                        className="btn btn-primary"
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
                </>
            ) : null}
            {svgs.length ? (
                <>
                    <ThreedScreenInner size={size} color="#000">
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
                                    setTimeout(
                                        step,
                                        (m - 2) % Math.round(1 / svStep) === 0 ? 1600 : 400,
                                    );
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
                    </div>
                </>
            ) : null}
        </div>
    );
};
