import {useCallback, useMemo, useRef, useState} from 'react';
import {AddIcon, BaselineFilterCenterFocus, BaselineZoomInMap} from '../../../icons/Icon';
import {closeEnough} from '../../../rendering/epsilonToZero';
import {BarePath} from '../../../types';
import {parseColor} from './colors';
import {EditStateUpdate, PendingState, PendingStateUpdate} from './editState';
import {AnimCtx, Ctx, Patterns, RenderItem} from './evaluate';
import {colorToRgb, State} from './export-types';
import {Hover} from './resolveMods';
import {svgItems} from './svgItems';
import {SVGCanvas} from './SVGCanvas';
import {useAnimate} from './useAnimate';
import {useCropCache} from './useCropCache';
import {useElementZoom} from './useSVGZoom';
import {VideoExport} from './VideoExport';
import {Updater} from '../../../json-diff/Updater';
import {FrameExport} from './FrameExport';
import {useWorker, WorkerSend} from './render-client';
import {DeferredRender} from './DeferredRender';

export const RenderExport = ({
    id,
    state,
    patterns,
    onChange,
    worker,
}: {
    worker: WorkerSend;
    id: string;
    state: State;
    patterns: Patterns;
    onChange: Updater<State>;
}) => {
    const [t, setT] = useState(0); // animateeeee
    const animCache = useMemo<AnimCtx['cache']>(() => new Map(), []);

    const [duration, setDuration] = useState(5);
    const [animate, setAnimate] = useState(false);
    const [warnings, setWarnings] = useState<string[]>([]);

    const fpsref = useAnimate(t, animate, duration, setT, setAnimate);

    // well this is exciting
    const cropCache = useCropCache(state, t, animCache);

    const {zoomProps, box, reset: resetZoom} = useElementZoom(state.view.box);
    const size = 500;

    const statusRef = useRef<HTMLDivElement>(null);

    const onFPS = useCallback(
        (v: number) => {
            if (fpsref.current) fpsref.current.textContent = v.toFixed(2) + 'fps';
        },
        [fpsref],
    );

    return (
        <div className="flex">
            <div className="relative overflow-hidden">
                <DeferredRender
                    worker={worker}
                    setWarnings={setWarnings}
                    onFPS={onFPS}
                    t={t}
                    state={state}
                    patterns={patterns}
                    size={size}
                    zoomProps={zoomProps}
                />
                <div ref={fpsref} className="absolute top-0 right-0 hidden px-2 py-1 bg-base-100" />
                {resetZoom ? (
                    <div className="absolute top-0 left-0 flex">
                        <button
                            className="btn btn-square px-2 py-1 bg-base-100"
                            onClick={() => resetZoom()}
                        >
                            <BaselineZoomInMap />
                        </button>
                        <button
                            className="btn btn-square px-2 py-1 bg-base-100"
                            onClick={() => {
                                onChange.view.box(box);
                            }}
                        >
                            <AddIcon />
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
                <div className="mt-4">
                    <input
                        type="range"
                        value={t}
                        onChange={(evt) => setT(+evt.target.value)}
                        className="range"
                        min={0}
                        max={1}
                        step={0.001}
                    />
                    {/* <BlurInt value={t} onChange={(v) => (v != null ? setT(v) : null)} /> */}
                    <button
                        className={'btn mx-2 ' + (animate ? 'btn-accent' : '')}
                        onClick={() => setAnimate(!animate)}
                        title={t + ''}
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
                    worker={worker}
                    state={state}
                    box={box}
                    size={size}
                    patterns={patterns}
                    duration={duration}
                    statusRef={statusRef}
                    cropCache={cropCache}
                />
                <FrameExport
                    id={id}
                    state={state}
                    box={box}
                    patterns={patterns}
                    t={t}
                    worker={worker}
                    statusRef={statusRef}
                    cropCache={cropCache}
                />
                <div className="flex flex-col gap-2 p-2">
                    {warnings.map((w, i) => (
                        <div key={i} className="px-4 py-2 rounded bg-base-100">
                            {w}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    // ok
};

export function renderShape(
    key: string,
    shape: BarePath,
    hover: Hover | null,
    selectedShapes: string[],
    pending?: PendingState['pending'],
    update?: PendingStateUpdate,
): RenderItem[] {
    return [
        {
            type: 'path',
            color: {r: 255, g: 255, b: 255},
            shadow: {
                offset: {x: 0, y: 0},
                blur: {x: 0.03, y: 0.03},
                color: {r: 0, g: 0, b: 0},
            },
            key,
            shapes: [shape],
            strokeWidth: 0.03,
            zIndex: 100,
        },
        {
            type: 'path',
            color:
                (hover?.type === 'shape' && hover.id === key) ||
                (hover?.type === 'shapes' && hover.ids.includes(key)) ||
                selectedShapes.includes(key)
                    ? colorToRgb(parseColor('gold')!)
                    : {r: 255, g: 255, b: 255},
            key,
            onClick() {
                if (!update || !pending) return;
                if (pending?.type === 'select-shape') {
                    update.pending.replace(null);
                    pending.onDone(key);
                    return;
                }
                if (pending?.type !== 'select-shapes') return;
                if (!selectedShapes.includes(key)) {
                    update.pending.variant('select-shapes').shapes.push(key);
                } else {
                    const idx = selectedShapes.indexOf(key);
                    update.pending.variant('select-shapes').shapes[idx].remove();
                }
            },
            shapes: [shape],
            strokeWidth: 0.03,
            zIndex: 100,
        },
    ];
}
