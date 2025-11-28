import {useEffect, useMemo, useRef, useState} from 'react';
import {transformBarePath} from '../../../rendering/points';
import {Coord} from '../../../types';
import {PKPath} from '../../pk';
import {pkPathWithCmds} from '../animator.screen/cropPath';
import {AnimCtx, Patterns} from './evaluate';
import {Crop, insetPkPath, modsTransforms, State} from './export-types';
import {useElementZoom} from './useSVGZoom';
import {modsToShapes, pathMod, resolveMods, resolvePMod, svgItems} from './resolveMods';
import {recordVideo} from './recordVideo';
import {Canvas, SVGCanvas} from './SVGCanvas';

export const RenderExport = ({state, patterns}: {state: State; patterns: Patterns}) => {
    const [t, setT] = useState(0); // animateeeee
    const cropCache = useMemo(() => new Map<string, {path: PKPath; crop: Crop; t?: number}>(), []);
    const animCache = useMemo<AnimCtx['cache']>(() => new Map(), []);

    const [duration, setDuration] = useState(5);
    const [animate, setAnimate] = useState(false);
    const nt = useRef(t);
    nt.current = t;
    const fpsref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!animate) {
            fpsref.current!.style.display = 'none';
            return;
        }
        fpsref.current!.style.display = 'block';
        const t = nt.current;
        let st = Date.now() - (t > 0.99 ? 0 : t) * duration * 1000;
        let af: number = 0;
        const times: number[] = [];
        let lt = Date.now();
        const step = () => {
            const now = Date.now();
            times.push(now - lt);
            lt = now;
            if (times.length > 2) {
                const some = times.slice(-5);
                const sum = some.reduce((a, b) => a + b, 0);
                fpsref.current!.textContent = (1000 / (sum / some.length)).toFixed(2) + 'fps';
            }
            const diff = (now - st) / 1000;
            setT(Math.min(1, diff / duration));
            if (diff < duration) {
                af = requestAnimationFrame(step);
            } else {
                setAnimate(false);
            }
        };
        step();
        return () => cancelAnimationFrame(af);
    }, [animate, duration]);

    // well this is exciting
    useMemo(() => {
        for (let crop of Object.values(state.crops)) {
            const current = cropCache.get(crop.id);
            if (current?.crop === crop && (current.t == null || current.t === t)) continue;

            if (!crop.mods?.length) {
                const path = pkPathWithCmds(crop.shape[crop.shape.length - 1].to, crop.shape);
                cropCache.set(crop.id, {path, crop});
            } else {
                const actx: AnimCtx = {
                    accessedValues: new Set(),
                    values: {t},
                    cache: animCache,
                    palette: [],
                    warn: (v) => console.warn(v),
                };
                const cropmods = crop.mods.map((m) => resolvePMod(actx, m));

                // const mods = resolveMods(actx, crop.mods);
                // const tx = modsTransforms(mods);
                const path = pkPathWithCmds(crop.shape[crop.shape.length - 1].to, crop.shape);

                let remove = false;
                cropmods.forEach((mod) => {
                    remove = remove || pathMod(cropCache, mod, path);
                });

                // const shape = modsToShapes(
                //     cropCache,
                //     patternmods,
                //     [{shape: crop.shape, i: 0}]
                // )
                // const shape = transformBarePath(
                //     {
                //         segments: crop.shape,
                //         origin: crop.shape[crop.shape.length - 1].to,
                //     },
                //     tx,
                // );
                // const path = pkPathWithCmds(shape.origin, shape.segments);
                // if (mods.inset) {
                //     insetPkPath(path, mods.inset);
                // }

                cropCache.set(crop.id, {path, crop, t: actx.accessedValues?.size ? t : undefined});
            }
        }
    }, [state.crops, cropCache, t, animCache]);

    const {items, warnings} = useMemo(
        () => svgItems(state, animCache, cropCache, patterns, t),
        [state, patterns, cropCache, animCache, t],
    );

    const {zoomProps, box} = useElementZoom(6);
    const [mouse, setMouse] = useState(null as null | Coord);
    const [video, setVideo] = useState(null as null | number | string);
    const size = 500;

    const statusRef = useRef<HTMLDivElement>(null);

    return (
        <div className="flex">
            <div className="relative overflow-hidden">
                <SVGCanvas {...zoomProps} setMouse={setMouse} items={items} size={size} />
                <div ref={fpsref} className="absolute top-0 right-0 hidden px-2 py-1 bg-base-100" />
                {/* <Canvas {...zoomProps} setMouse={setMouse} items={items} size={size} /> */}
                <div className="mt-4">
                    <input
                        type="range"
                        value={t}
                        onChange={(evt) => setT(+evt.target.value)}
                        className="range"
                        min={0}
                        max={1}
                        step={0.01}
                    />
                    <button
                        className={'btn mx-2 ' + (animate ? 'btn-accent' : '')}
                        onClick={() => setAnimate(!animate)}
                    >
                        Animate
                    </button>
                    <input
                        value={duration}
                        onChange={(evt) => setDuration(+evt.currentTarget.value)}
                        type="number"
                        className="input w-13"
                    />
                </div>
                <div className="flex gap-2 items-center">
                    <button
                        className={'btn'}
                        onClick={() =>
                            recordVideo(
                                state,
                                size,
                                box,
                                patterns,
                                duration,
                                statusRef,
                                cropCache,
                            ).then((url) => setVideo(url))
                        }
                    >
                        Record Video
                    </button>
                    <div ref={statusRef} className="w-20 text-right" />
                    {video ? (
                        <button className={'btn'} onClick={() => setVideo(null)}>
                            &times;
                        </button>
                    ) : null}
                    {/* {typeof video === 'number' ? (
                        <input type="range" value={video} onChange={() => {}} min={0} max={1} />
                    ) : null} */}
                </div>
                {typeof video === 'string' ? (
                    <div>
                        <video src={video} controls loop style={{width: size, height: size}} />
                    </div>
                ) : null}
            </div>
            <div className="flex flex-col gap-2 p-2">
                {warnings.map((w, i) => (
                    <div key={i} className="px-4 py-2 rounded bg-base-100">
                        {w}
                    </div>
                ))}
            </div>
        </div>
    );

    // ok
};
