import {useCallback, useContext, useMemo, useRef, useState} from 'react';
import {AddIcon, BaselineFilterCenterFocus, BaselineZoomInMap} from '../../../icons/Icon';
import {Updater} from '../../../json-diff/Updater';
import {closeEnough} from '../../../rendering/epsilonToZero';
import {DeferredRender} from './DeferredRender';
import {AnimCtx} from './eval/evaluate';
import {FrameExport} from './FrameExport';
import {WorkerSend} from './render/render-client';
import {State} from './types/state-type';
import {useAnimate} from './hooks/useAnimate';
import {useCropCache} from './hooks/useCropCache';
import {useElementZoom} from './hooks/useSVGZoom';
import {VideoExport} from './VideoExport';
import {SnapshotUrl} from './state-editor/saveAnnotation';
import {useLocation, useNavigate} from 'react-router';
import {makeBox} from './makeBox';
import {GlobalDependenciesCtx} from './window/GlobalDependencies';

export const RenderExport = ({
    namePrefix,
    state,
    onChange,
}: {
    namePrefix: string;
    state: State;
    onChange: Updater<State>;
}) => {
    const [t, setT] = useState(0); // animateeeee
    const animCache = useMemo<AnimCtx['cache']>(() => new Map(), []);
    const nav = useNavigate();
    const {snapshotUrl, worker} = useContext(GlobalDependenciesCtx);

    const [duration, setDuration] = useState(5);
    const [animate, setAnimate] = useState(false);
    const [warnings, setWarnings] = useState<string[]>([]);

    const fpsref = useAnimate(t, animate, duration, setT, setAnimate);

    // well this is exciting
    const cropCache = useCropCache(state, t, animCache);

    const vbox = useMemo(() => makeBox(state.view, 500, 500), [state.view]);
    const {zoomProps, box, reset: resetZoom} = useElementZoom(vbox);
    const config = useMemo(
        () => ({scale: Math.max(500 / box.width, 500 / box.height), box, type: '2d' as const}),
        [box],
    );

    const statusRef = useRef<HTMLDivElement>(null);

    const onFPS = useCallback(
        (v: number) => {
            if (fpsref.current) fpsref.current.textContent = v.toFixed(2) + 'fps';
        },
        [fpsref],
    );

    const size = 500;
    return (
        <div className="flex flex-1">
            <div className="relative overflow-hidden">
                <DeferredRender
                    worker={worker}
                    setWarnings={setWarnings}
                    onFPS={onFPS}
                    t={t}
                    state={state}
                    config={config}
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
                                const ppu = size / box.width;
                                const center = {
                                    x: box.x + box.width / 2,
                                    y: box.y + box.height / 2,
                                };
                                onChange.view((one, up) => [up.ppu(ppu), up.center(center)]);
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
                {/*<button className="btn" onClick={() => nav(`?debug=${t}`)}>
                    Debug
                </button>*/}
                <VideoExport
                    worker={worker}
                    state={state}
                    // box={box}
                    config={config}
                    duration={duration}
                    statusRef={statusRef}
                    cropCache={cropCache}
                />
                <FrameExport
                    namePrefix={namePrefix}
                    snapshotUrl={snapshotUrl}
                    state={state}
                    box={box}
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
