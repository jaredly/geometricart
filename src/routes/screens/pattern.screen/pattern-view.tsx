import {useEffect, useMemo, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import type {Route} from '../+types/pattern';
import {shapeKey, State} from '../../../types';
import {canonicalShape, getNewPatternData, getPatternData} from '../../getPatternData';
import {humanReadableFraction} from '../../findCommonFractions';
import {normShape} from '../../normShape';
import {CanvasPattern} from './CanvasPattern';
import {canvasRender} from '../../../rendering/CanvasRender';
import {exportPNG} from '../../../editor/ExportPng';
import {BaselineDownload, BaselineFilterCenterFocus, BaselineZoomInMap} from '../../../icons/Icon';
import {useOnOpen} from '../../useOnOpen';
import {InspectShape} from '../../InspectShape';
import {normalizeCanonShape, Shape} from '../../getUniqueShapes';
import {useElementZoom} from './hooks/useSVGZoom';
import {closeEnough} from '../../../rendering/epsilonToZero';
import {thinTiling} from './render/renderPattern';

type Display = {
    bounds: boolean;
    draw: 'color-lines' | 'shapes' | 'woven';
    lineWidth: number;
    margin: number;
};

const useIsLocal = () => {
    const [isLocal, setIsLocal] = useState(false);
    useEffect(() => {
        setIsLocal(window.location.host === 'localhost:5173');
    }, []);
    return isLocal;
};

export const PatternView = ({
    loaderData: {pattern, similar},
}: {
    loaderData: {} & Route.ComponentProps['loaderData'];
}) => {
    const data = useMemo(() => getNewPatternData(thinTiling(pattern.tiling), 3), [pattern.tiling]);
    const [display, setDisplay] = useState<Display>({
        bounds: false,
        draw: 'shapes',
        lineWidth: 0.1,
        margin: 0.5,
    });
    const tiling = pattern.tiling; // flipPattern(pattern.tiling);

    const canonKeys: Record<string, Shape & {percentage: number}> = {};
    data.canons.forEach((c) => {
        if (c.percentage) {
            if (!canonKeys[c.key]) {
                canonKeys[c.key] = {
                    ...normalizeCanonShape(c),
                    percentage: c.percentage,
                };
            } else {
                canonKeys[c.key].percentage += c.percentage;
            }
        }
    });

    const {zoomProps, box, reset: resetZoom} = useElementZoom({x: -2, y: -2, width: 4, height: 4});
    const [inspect, setInspect] = useState(null as null | string);
    const [showDialog, setShowDialog] = useState(false);
    const dialogRef = useOnOpen(setShowDialog);

    const isLocal = useIsLocal();

    useEffect(() => {
        // @ts-ignore
        window.pattern = pattern.tiling;
    }, []);

    return (
        <div>
            <div className="flex items-start gap-2">
                <div className="flex flex-col gap-4">
                    {/* <TilingPattern tiling={tiling} size={400} data={data} showLines /> */}
                    <div className="relative">
                        {resetZoom ? (
                            <div className="absolute top-0 left-0 flex">
                                <button
                                    className="btn btn-square px-2 py-1 bg-base-100"
                                    onClick={() => resetZoom()}
                                >
                                    <BaselineZoomInMap />
                                </button>
                                {!(
                                    closeEnough(box.y, -box.height / 2) &&
                                    closeEnough(box.x, -box.width / 2)
                                ) && (
                                    <button
                                        className="btn btn-square px-2 py-1 bg-base-100"
                                        onClick={() => resetZoom(true)}
                                    >
                                        <BaselineFilterCenterFocus />
                                    </button>
                                )}
                            </div>
                        ) : null}
                        <CanvasPattern
                            zoomProps={zoomProps}
                            tiling={tiling}
                            size={400}
                            data={data}
                            showBounds={display.bounds}
                            showLines={display.draw === 'color-lines'}
                            showShapes={display.draw === 'shapes'}
                            showWoven={display.draw === 'woven'}
                            lineWidth={display.lineWidth}
                            // margin={display.margin}
                        />
                    </div>
                    {/* <label>
                        <input
                            className="checkbox mr-4"
                            type="checkbox"
                            checked={display.bounds}
                            onChange={() => setDisplay({...display, bounds: !display.bounds})}
                        />
                        Show Bounds
                    </label> */}
                    <div>
                        {(['shapes', 'color-lines', 'woven'] as const).map((kind) => (
                            <button
                                className="btn"
                                disabled={kind === display.draw}
                                onClick={() => setDisplay({...display, draw: kind})}
                            >
                                {kind}
                            </button>
                        ))}
                    </div>
                    <label>
                        <input
                            className="range"
                            type="range"
                            value={display.lineWidth}
                            min={0}
                            step={0.01}
                            max={1}
                            onChange={(evt) =>
                                setDisplay({...display, lineWidth: +evt.target.value})
                            }
                        />
                        Line width {display.lineWidth}
                    </label>
                    {/* <label>
                        <input
                            className="input"
                            type="number"
                            value={display.margin}
                            min={0}
                            step={0.01}
                            max={10}
                            onChange={(evt) => setDisplay({...display, margin: +evt.target.value})}
                        />
                        Margin {display.margin}
                    </label> */}
                </div>
                {/* {JSON.stringify(tiling.shape)} */}
                <div className="flex-1 px-2 gap-2 flex flex-col">
                    <div className="bg-base-100 p-4 rounded-xl shadow-md shadow-base-300">
                        Fundamental symmetry: {shapeKey(tiling.shape)}
                        <button
                            className="btn ml-4"
                            onClick={() => setDisplay({...display, bounds: !display.bounds})}
                        >
                            {display.bounds ? 'Hide' : 'Show'}
                        </button>
                    </div>

                    <div className="bg-base-100 p-4 rounded-xl shadow-md shadow-base-300">
                        <div>
                            {Object.keys(canonKeys).length} unique{' '}
                            {Object.keys(canonKeys).length === 1 ? 'shape' : 'shapes'}
                        </div>
                        <div className="flex flex-wrap items-start gap-2 mt-4">
                            {
                                //data.canons
                                Object.values(canonKeys).map((shape, i) => {
                                    const points = normShape(shape.rotated);

                                    return (
                                        <div
                                            key={i}
                                            className="relative hover:bg-base-300 cursor-pointer rounded"
                                            onClick={(evt) => {
                                                evt.stopPropagation();
                                                evt.preventDefault();
                                                setInspect(shape.key);
                                                setTimeout(() => {
                                                    dialogRef.current?.showModal();
                                                }, 10);
                                            }}
                                        >
                                            <svg
                                                data-key={shape.key}
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="-1 -1 2 2"
                                                style={{
                                                    width: 100,
                                                    height: 100,
                                                }}
                                            >
                                                <path
                                                    fill="#555"
                                                    d={
                                                        `M` +
                                                        points
                                                            .map(
                                                                ({x, y}) =>
                                                                    `${x.toFixed(3)} ${y.toFixed(3)}`,
                                                            )
                                                            .join('L') +
                                                        'Z'
                                                    }
                                                />
                                            </svg>
                                            <div className="absolute text-center bottom-0 right-0 flex items-center justify-center">
                                                <div className="bg-slate-700 px-2 rounded">
                                                    {humanReadableFraction(shape.percentage)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            }
                        </div>
                        <dialog id="shape-modal" className="modal" ref={dialogRef}>
                            {inspect != null ? <InspectShape shape={canonKeys[inspect]} /> : null}
                            <form method="dialog" className="modal-backdrop">
                                <button>close</button>
                            </form>
                        </dialog>
                    </div>
                    {pattern.images.length ? (
                        <div className="bg-base-100 p-4 rounded-xl shadow-md shadow-base-300 flex flex-col gap-4">
                            {pattern.images.map((image) => (
                                <div key={image.url} className="flex items-start">
                                    <img
                                        src={image.url}
                                        className="max-w-40 max-h-40 w-40 h-40 object-cover"
                                    />
                                    <table className="table">
                                        <tbody>
                                            {image.location ? (
                                                <tr>
                                                    <td>Location</td>
                                                    <td>{image.location}</td>
                                                </tr>
                                            ) : null}
                                            <tr>
                                                <td>Source</td>
                                                <td>
                                                    {image.source.startsWith('http') ? (
                                                        <a
                                                            className="link-accent"
                                                            target="_blank"
                                                            href={image.source}
                                                        >
                                                            {image.source}
                                                        </a>
                                                    ) : (
                                                        image.source
                                                    )}
                                                </td>
                                            </tr>
                                            {image.date ? (
                                                <tr>
                                                    <td>Date</td>
                                                    <td>{image.date}</td>
                                                </tr>
                                            ) : null}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    ) : null}
                    {isLocal ? (
                        <div className="bg-amber-950 p-4 rounded-xl">
                            {Object.entries(pattern.imageDrawings).map(([key, path]) => (
                                <StateLoader key={key} path={'/' + path}>
                                    {(state) => <SimpleRender state={state} size={600} />}
                                </StateLoader>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
            {similar.length ? (
                <div>
                    <h1 className="text-4xl">Similar Patterns</h1>
                    <div className="flex flex-wrap gap-4 mt-4">
                        {similar.map(({score, hash}) => (
                            <div key={hash}>
                                <a href={`/gallery/pattern/${hash}`}>
                                    <img
                                        src={`/gallery/pattern/${hash}/${400}.png`}
                                        style={{width: 200, height: 200}}
                                        className="rounded-md"
                                    />
                                    {/* {score.toFixed(2)} */}
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

const StateLoader = ({
    path,
    children,
}: {
    path: string;
    children: (data: State) => React.ReactNode;
}) => {
    const [data, setData] = useState(null as null | State);
    useEffect(() => {
        fetch(path)
            .then((res) => res.json())
            .then(setData);
    }, [path]);
    return data ? children(data) : null;
};

const SimpleRender = ({state, size}: {size: number; state: State}) => {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current!;
        const ctx = canvas.getContext('2d')!;

        ctx.save();
        canvasRender(ctx, state, size, size, size / 1000, {}, 0, {}, []);
        ctx.restore();
    }, [state, size]);
    return (
        <div className="relative">
            <div style={{width: size / 2, height: size / 2, position: 'relative'}}>
                <canvas
                    ref={ref}
                    width={size}
                    height={size}
                    style={{width: size / 2, height: size / 2}}
                    className="rounded-md"
                />
                <button
                    className="btn btn-square absolute bottom-2 right-2"
                    onClick={() => {
                        exportPNG(size, state, 1000, true, false, 0).then((blob) => {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'pattern.png';
                            a.click();
                        });
                    }}
                >
                    <BaselineDownload />
                </button>
            </div>
        </div>
    );
};
