import {downloadZip} from 'client-zip';
import {useEffect, useMemo, useRef, useState} from 'react';
import {BlurInt} from '../../../editor/Forms';
import {epsilon} from '../../../rendering/epsilonToZero';
import {dist} from '../../../rendering/getMirrorTransforms';
import {ThreedScreenInner} from '../../../threed/ThreedScreen';
import {pathToGeometry} from '../../../threed/calcShapes';
import {Tiling} from '../../../types';
import {drawWoven} from '../../canvasDraw';
import {getPatternData} from '../../getPatternData';
import {pk, Path as PKPath} from '../../pk';
import {Config} from '../animator';
import {lineAt, State} from './animator.utils';
import {combinedPath, recordVideo, renderFrame} from './renderFrame';

export const calcMargin = (preview: number, line: State['lines'][0]) => {
    const lat = lineAt(line.keyframes, preview, line.fade);
    const log = lineAt(line.keyframes, 0, line.fade);
    if (!lat || !log) return 1;
    const d1 = dist(lat.points[0], lat.points[1]);
    const d2 = dist(log.points[0], log.points[1]);
    return d1 / d2;
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
    const [svgs, setSvgs] = useState([] as {svg: string; pkpath: PKPath; zoom: number}[]);

    const thick = 0.01;

    const threedItems = useMemo(() => {
        return svgs.map(({pkpath}, i) => {
            const res = pathToGeometry({
                pkpath,
                fullThickness: false,
                xoff: i * thick,
                thick,
            });
            if (!res) {
                return null;
            }
            const {geometry, stl} = res;
            return (
                <React.Fragment key={`${i}`}>
                    <mesh geometry={geometry} position={[0, 0, 0]} castShadow receiveShadow>
                        <meshPhongMaterial flatShading color={'red'} />
                    </mesh>
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
    }, [svgs]);

    return (
        <div className="bg-base-100 p-4 rounded-md">
            <button
                className="btn"
                onClick={() => {
                    let i = 0;
                    const step = () => {
                        if (i > state.layers.length - 1 + epsilon) return;

                        const peggedZoom =
                            (config.peg ? calcMargin(i, state.lines[0]) : 1) * config.zoom;

                        const path = combinedPath(i, config, state, patternMap);
                        path.setFillType(pk.FillType.EvenOdd);
                        const svg = path.toSVGString();
                        path.delete();
                        setSvgs((svgs) => [...svgs, {svg, pkpath: path, zoom: peggedZoom}]);
                        i += svStep;
                        // requestAnimationFrame(step);
                        setTimeout(step, 100);
                    };
                    step();
                }}
            >
                Get SVGs
            </button>
            <label className="m-4">
                {'Step: '}
                <BlurInt
                    className="input w-10"
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
            {svgs.length ? <ThreedScreenInner>{threedItems}</ThreedScreenInner> : null}
        </div>
    );
};

export const AnimatedCanvas = ({
    patternMap,
    state,
    config,
}: {
    config: Config;
    state: State;
    patternMap: Record<string, Tiling>;
}) => {
    const ref = useRef<HTMLCanvasElement>(null);

    const [videos, setVideos] = useState([] as {url: string; date: number}[]);
    const [recording, setRecording] = useState(false);

    const patternDatas = useMemo(() => {
        return config.showNice
            ? state.layers.map((l) => getPatternData(patternMap[l.pattern], false, config.repl))
            : [];
    }, [state.layers, patternMap, config.repl, config.showNice]);

    useEffect(() => {
        if (!ref.current) return;
        const surface = pk.MakeWebGLCanvasSurface(ref.current)!;
        const ctx = surface.getCanvas();
        ctx.clear(pk.BLACK);

        if (Number.isInteger(config.preview) && config.showNice) {
            ctx.save();
            ctx.scale((config.size * 2) / config.zoom, (config.size * 2) / config.zoom);
            ctx.translate(config.zoom / 2, config.zoom / 2);
            drawWoven(ctx, patternDatas[config.preview], (config.lineWidth / 200) * config.zoom);
            ctx.restore();
        } else {
            renderFrame(state, patternMap, config.preview, ctx, config);
        }

        surface.flush();
    }, [patternDatas, patternMap, config, state]);

    return (
        <div>
            <canvas
                ref={ref}
                width={config.size * 2}
                height={config.size * 2}
                style={{width: config.size, height: config.size}}
            />
            <div className="bg-base-100 p-4 rounded-md my-4">
                <div>
                    <button
                        className="btn"
                        disabled={recording}
                        onClick={() => {
                            // setRecording(true);
                            recordVideo(state, ref.current!, patternMap, config).then(
                                (url) => {
                                    if (url) {
                                        setVideos([...videos, {url, date: Date.now()}]);
                                    }
                                    // setRecording(false);
                                },
                                () => {
                                    // setRecording(false);
                                },
                            );
                        }}
                    >
                        Record Video
                    </button>
                </div>

                {videos.map(({url, date}, i) => (
                    <div key={url} className="relative">
                        <video src={url} loop controls />
                        <a key={i} href={url} download={`video_${date}.mp4`}>
                            Download
                        </a>
                        <button
                            className="btn btn-square absolute top-4 right-4"
                            onClick={() => {
                                setVideos(videos.filter((_, j) => j !== i));
                            }}
                        >
                            &times;
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
