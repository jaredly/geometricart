import {useMemo, useRef, useState} from 'react';
import {Coord} from '../../../types';
import {AnimCtx, Patterns} from './evaluate';
import {State} from './export-types';
import {svgItems} from './resolveMods';
import {Canvas, SVGCanvas} from './SVGCanvas';
import {useElementZoom} from './useSVGZoom';
import {VideoExport} from './VideoExport';
import {useAnimate} from './useAnimate';
import {useCropCache} from './useCropCache';
import {BaselineZoomInMap} from '../../../icons/Icon';

export const RenderExport = ({state, patterns}: {state: State; patterns: Patterns}) => {
    const [t, setT] = useState(0); // animateeeee
    const animCache = useMemo<AnimCtx['cache']>(() => new Map(), []);

    const [duration, setDuration] = useState(5);
    const [animate, setAnimate] = useState(false);

    const fpsref = useAnimate(t, animate, duration, setT, setAnimate);

    // well this is exciting
    const cropCache = useCropCache(state, t, animCache);

    const {items, warnings} = useMemo(
        () => svgItems(state, animCache, cropCache, patterns, t),
        [state, patterns, cropCache, animCache, t],
    );

    const {zoomProps, box, reset: resetZoom} = useElementZoom(6);
    const [mouse, setMouse] = useState(null as null | Coord);
    const size = 500;

    const statusRef = useRef<HTMLDivElement>(null);

    return (
        <div className="flex">
            <div className="relative overflow-hidden">
                <SVGCanvas {...zoomProps} setMouse={setMouse} items={items} size={size} />
                <div ref={fpsref} className="absolute top-0 right-0 hidden px-2 py-1 bg-base-100" />
                {resetZoom ? (
                    <button
                        className="absolute btn btn-square top-0 left-0 px-2 py-1 bg-base-100"
                        onClick={() => resetZoom()}
                    >
                        <BaselineZoomInMap />
                    </button>
                ) : null}
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
                <VideoExport
                    state={state}
                    box={box}
                    size={size}
                    patterns={patterns}
                    duration={duration}
                    statusRef={statusRef}
                    cropCache={cropCache}
                />
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
