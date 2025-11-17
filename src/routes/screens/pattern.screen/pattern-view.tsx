import {useEffect, useMemo, useState} from 'react';
import {useFetcher} from 'react-router';
import type {Route} from '../+types/pattern';
import {shapeKey} from '../../../types';
import {canonicalShape, getPatternData, humanReadableFraction} from '../../getPatternData';
import {normShape} from '../../normShape';
import {CanvasPattern} from './CanvasPattern';

type Display = {
    bounds: boolean;
    draw: 'color-lines' | 'shapes' | 'woven';
    lineWidth: number;
    margin: number;
};

export const Pattern = ({
    loaderData: {pattern, similar},
    id,
}: {
    id?: string;
    loaderData: {} & Route.ComponentProps['loaderData'];
}) => {
    const data = useMemo(() => getPatternData(pattern.tiling), [pattern.tiling]);
    const [display, setDisplay] = useState<Display>({
        bounds: false,
        draw: 'shapes',
        lineWidth: 0.1,
        margin: 0.5,
    });
    const fetcher = useFetcher();

    const tiling = pattern.tiling; // flipPattern(pattern.tiling);

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

    useEffect(() => {
        // @ts-ignore
        window.pattern = pattern.tiling;
    }, []);

    return (
        <div className="mx-auto w-6xl p-4 pt-0 bg-base-200 shadow-base-300 shadow-md">
            <div className="sticky top-0 py-2 mb-2 bg-base-200 shadow-md shadow-base-200">
                <div className="breadcrumbs text-sm">
                    <ul>
                        <li>
                            <a href="/">Geometric Art</a>
                        </li>
                        <li>
                            <a href="/gallery/">Gallery</a>
                        </li>
                        {id ? (
                            <li>Pattern {id}</li>
                        ) : (
                            <li>
                                <button
                                    className="btn"
                                    onClick={() => {
                                        fetcher
                                            .submit(
                                                {state: JSON.stringify({tiling})},
                                                {method: 'POST'},
                                            )
                                            .then((value) => {
                                                console.log('got', value);
                                            });
                                    }}
                                >
                                    Save New Pattern
                                </button>
                            </li>
                        )}
                    </ul>
                </div>
                {/* <h1 className="text-4xl">Pattern View</h1> */}
            </div>
            {/* <div className="text-sm mb-3">ID {id}</div> */}
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
                        margin={display.margin}
                    />
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
                    <label>
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
                    </label>
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
                    {/* {Object.entries(pattern.imageDrawings).map(([key, state]) => (
                        <SimpleRender state={state} size={600} />
                    ))} */}
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

// const SimpleRender = ({state, size}: {size: number; state: State}) => {
//     const ref = useRef<HTMLCanvasElement>(null);
//     useEffect(() => {
//         const canvas = ref.current!;
//         const ctx = canvas.getContext('2d')!;

//         ctx.save();
//         canvasRender(ctx, state, size, size, size / 1000, {}, 0, {}, []);
//         ctx.restore();
//     }, [state, size]);
//     return (
//         <div className="relative">
//             <div style={{width: size / 2, height: size / 2, position: 'relative'}}>
//                 <canvas
//                     ref={ref}
//                     width={size}
//                     height={size}
//                     style={{width: size / 2, height: size / 2}}
//                 />
//                 <button
//                     className="btn btn-square absolute bottom-2 right-2"
//                     onClick={() => {
//                         exportPNG(size, state, 1000, true, false, 0).then((blob) => {
//                             const url = URL.createObjectURL(blob);
//                             const a = document.createElement('a');
//                             a.href = url;
//                             a.download = 'pattern.png';
//                             a.click();
//                         });
//                     }}
//                 >
//                     <BaselineDownload />
//                 </button>
//             </div>
//         </div>
//     );
// };
