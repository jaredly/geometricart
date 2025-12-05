import {useMemo, useRef, useState} from 'react';
import {Coord} from '../../../types';
import {a, AnimCtx, Patterns, RenderItem} from './evaluate';
import {Color, colorToRgb, State} from './export-types';
import {svgItems} from './resolveMods';
import {Canvas, SVGCanvas} from './SVGCanvas';
import {sizeBox, useElementZoom} from './useSVGZoom';
import {VideoExport} from './VideoExport';
import {useAnimate} from './useAnimate';
import {useCropCache} from './useCropCache';
import {BaselineFilterCenterFocus, BaselineZoomInMap} from '../../../icons/Icon';
import {Hover} from './resolveMods';
import {EditStateUpdate, useEditState} from './editState';
import {make} from '../../../json-diff/make';
import {coordsFromBarePath} from '../../getPatternData';
import {parseColor} from './colors';
import {closeEnough} from '../../../rendering/epsilonToZero';

const renderShapes = (
    shapes: State['shapes'],
    hover: Hover | null,
    selectedShapes: string[],
    update: EditStateUpdate,
): RenderItem[] => {
    return Object.entries(shapes).flatMap(([key, shape]) => [
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
                hover?.id === key || selectedShapes.includes(key)
                    ? colorToRgb(parseColor('gold')!)
                    : {r: 255, g: 255, b: 255},
            key,
            onClick() {
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
    ]);
};

export const RenderExport = ({state, patterns}: {state: State; patterns: Patterns}) => {
    const [t, setT] = useState(0); // animateeeee
    const animCache = useMemo<AnimCtx['cache']>(() => new Map(), []);

    const [duration, setDuration] = useState(5);
    const [animate, setAnimate] = useState(false);

    const fpsref = useAnimate(t, animate, duration, setT, setAnimate);

    // well this is exciting
    const cropCache = useCropCache(state, t, animCache);

    const editContext = useEditState();
    const hover = editContext.use((v) => v.hover);
    const showShapes = editContext.use((v) => v.showShapes || v.pending?.type === 'select-shapes');

    const {items, warnings, keyPoints, byKey, bg} = useMemo(
        () => svgItems(state, animCache, cropCache, patterns, t),
        [state, patterns, cropCache, animCache, t],
    );

    const pending = editContext.use((v) => v.pending);
    const selectedShapes = pending?.type === 'select-shapes' ? pending.shapes : [];
    const shapesItems = useMemo(
        (): RenderItem[] =>
            showShapes ? renderShapes(state.shapes, hover, selectedShapes, editContext.update) : [],
        [showShapes, state.shapes, hover, selectedShapes, editContext.update],
    );

    const both = useMemo(() => [...items, ...shapesItems], [items, shapesItems]);

    const {zoomProps, box, reset: resetZoom} = useElementZoom(state.view.box);
    const [mouse, setMouse] = useState(null as null | Coord);
    const size = 500;

    const statusRef = useRef<HTMLDivElement>(null);

    return (
        <div className="flex">
            <div className="relative overflow-hidden">
                <SVGCanvas
                    {...zoomProps}
                    state={state}
                    mouse={mouse}
                    keyPoints={keyPoints}
                    setMouse={setMouse}
                    items={both}
                    size={size}
                    byKey={byKey}
                    bg={bg}
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
