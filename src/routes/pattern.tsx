import {useEffect, useMemo, useRef, useState} from 'react';
import {useLoaderData, useParams} from 'react-router';
import type {Route} from './+types/pattern';
import {getPattern} from './db.server';
import {flipPattern} from './flipPattern';
import {canonicalShape, getPatternData, humanReadableFraction} from './getPatternData';
import {normShape} from './normShape';
import {TilingPattern} from './ShowTiling';
import {shapeKey, Tiling} from '../types';
import {pk} from './pk';
import {drawBounds, drawLines, drawShapes, drawWoven} from './canvasDraw';

export async function loader({params}: Route.LoaderArgs) {
    if (!params.id) {
        return null;
    }
    return getPattern(params.id);
}

type Display = {
    bounds: boolean;
    draw: 'color-lines' | 'shapes' | 'woven';
    lineWidth: number;
};

export const Pattern = () => {
    const {id} = useParams();
    let pattern = useLoaderData<typeof loader>();

    const [display, setDisplay] = useState<Display>({
        bounds: false,
        draw: 'shapes',
        lineWidth: 0.1,
    });

    const tiling = pattern ? flipPattern(pattern.tiling) : null;
    // const tiling = pattern?.tiling;
    const data = useMemo(() => (tiling ? getPatternData(tiling) : null), [tiling]);
    if (!pattern || !tiling || !data || !id) {
        return <div>No data... {id}</div>;
    }

    const canonKeys: Record<string, ReturnType<typeof canonicalShape> & {percentage: number}> = {};
    data.canons.forEach((c) => {
        if (c.percentage) {
            if (!canonKeys[c.key]) {
                canonKeys[c.key] = {...c};
            } else {
                canonKeys[c.key].percentage += c.percentage;
            }
        }
    });

    return (
        <div className="mx-auto w-6xl p-4 bg-base-200">
            <div className="navbar">
                <h1 className="text-4xl">Pattern View</h1>
            </div>
            <div className="text-sm mb-3">ID {id}</div>
            <div className="flex items-start gap-2">
                <div className="flex flex-col gap-4">
                    {/* <TilingPattern tiling={tiling} size={400} data={data} showLines /> */}
                    <CanvasPattern
                        tiling={tiling}
                        size={400}
                        data={data}
                        showBounds={display.bounds}
                        showLines={display.draw === 'color-lines'}
                        showShapes={display.draw === 'shapes'}
                        showWoven={display.draw === 'woven'}
                        lineWidth={display.lineWidth}
                    />
                    <label>
                        <input
                            className="checkbox mr-4"
                            type="checkbox"
                            checked={display.bounds}
                            onChange={() => setDisplay({...display, bounds: !display.bounds})}
                        />
                        Show Bounds
                    </label>
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
                            min={0.1}
                            step={0.01}
                            max={1}
                            onChange={(evt) =>
                                setDisplay({...display, lineWidth: +evt.target.value})
                            }
                        />
                    </label>
                    Line width {display.lineWidth}
                </div>
                {/* {JSON.stringify(tiling.shape)} */}
                <div className="flex-1 px-2 gap-2 flex flex-col">
                    <div className="bg-base-100 p-4 rounded-xl shadow-md shadow-base-300">
                        Fundamental symmetry: {shapeKey(tiling.shape)}
                    </div>

                    <div className="bg-base-100 p-4 rounded-xl shadow-md shadow-base-300">
                        <div>
                            {Object.keys(canonKeys).length} unique{' '}
                            {Object.keys(canonKeys).length === 1 ? 'shape' : 'shapes'}
                        </div>
                        <div className="flex flex-wrap items-start gap-2">
                            {
                                //data.canons
                                Object.values(canonKeys).map((shape, i) => {
                                    const points = normShape(shape.scaled);

                                    return (
                                        <div key={i} className="relative">
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
                                            <tr>
                                                <td>Location</td>
                                                <td>{image.location}</td>
                                            </tr>
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
                </div>
            </div>
        </div>
    );
};

const CanvasPattern = ({
    data,
    tiling,
    size = 300,
    showBounds,
    showWoven,
    showLines,
    showShapes,
    lineWidth,
}: {
    data: ReturnType<typeof getPatternData>;
    tiling: Tiling;
    size?: number;
    showBounds?: boolean;
    showWoven?: boolean;
    showLines?: boolean;
    showShapes?: boolean;
    lineWidth: number;
}) => {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (!ref.current) return;
        const surface = pk.MakeWebGLCanvasSurface(ref.current);
        if (!surface) return;
        const ctx = surface.getCanvas();
        ctx.clear(pk.BLACK);

        const margin = 0.5;
        ctx.scale((size * 2) / (2 + margin * 2), (size * 2) / (2 + margin * 2));
        ctx.translate(1 + margin, 1 + margin);

        if (showShapes) {
            drawShapes(ctx, data, false, data.minSegLength * lineWidth * 2);
        }
        if (showLines) {
            drawLines(ctx, data, data.minSegLength * lineWidth * 2);
        }
        if (showWoven) {
            drawWoven(ctx, data, data.minSegLength * lineWidth * 2);
        }
        if (showBounds) {
            drawBounds(ctx, data);
        }
        surface.flush();
        // ok do the render
    }, [tiling, data, showShapes, showLines, showWoven, showBounds, lineWidth]);
    return (
        <canvas ref={ref} width={size * 2} height={size * 2} style={{width: size, height: size}} />
    );
};

export default Pattern;
