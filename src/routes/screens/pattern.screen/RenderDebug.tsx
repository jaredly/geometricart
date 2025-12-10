import {useMemo, useRef, useState} from 'react';
import {Coord} from '../../../types';
import {a, AnimCtx, Patterns, RenderItem} from './evaluate';
import {Color, colorToRgb, State} from './export-types';
import {barePathFromCoords, LogItem, RenderLog, svgItems} from './resolveMods';
import {Canvas, SVGCanvas} from './SVGCanvas';
import {sizeBox, useElementZoom} from './useSVGZoom';
import {VideoExport} from './VideoExport';
import {useAnimate} from './useAnimate';
import {useCropCache} from './useCropCache';
import {
    BaselineFilterCenterFocus,
    BaselineZoomInMap,
    CheckboxChecked,
    CheckboxUnchecked,
} from '../../../icons/Icon';
import {Hover} from './resolveMods';
import {EditStateUpdate, useEditState} from './editState';
import {make} from '../../../json-diff/make';
import {coordsFromBarePath} from '../../getPatternData';
import {parseColor} from './colors';
import {closeEnough} from '../../../rendering/epsilonToZero';
import {push} from '../../../rendering/getMirrorTransforms';

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

const allItems = (log: RenderLog): LogItem[] => {
    if (log.type === 'items') return log.items.map((l) => l.item);
    return log.children.flatMap(allItems);
};

const getLogSelection = (logSelection: number[], log: RenderLog): LogItem[] => {
    for (let i = 0; i < logSelection.length - 1; i++) {
        if (log.type !== 'group') return [];
        log = log.children[i];
    }
    const last = logSelection[logSelection.length - 1];
    if (last === -1) return allItems(log);
    if (log.type === 'items') {
        return [log.items[last].item];
    }
    return [];
};

// START HERE
const renderLogSelection = (logSelection: number[], log: RenderLog): RenderItem[] => {
    const selection = getLogSelection(logSelection, log);
    return selection.flatMap((item, i): RenderItem[] => {
        switch (item.type) {
            case 'seg':
                return [
                    {
                        type: 'path',
                        color: {r: 255, g: 0, b: 0},
                        strokeWidth: 2,
                        shapes: [{origin: item.prev, segments: [item.seg], open: true}],
                        key: 'log-' + i,
                    },
                ];
            case 'point': {
                const s = 0.01;
                const p = push(item.p, 0, s);
                return [
                    {
                        type: 'path',
                        color: {r: 255, g: 0, b: 0},
                        strokeWidth: 2,
                        shapes: [
                            {
                                origin: p,
                                segments: [{type: 'Arc', center: item.p, clockwise: true, to: p}],
                            },
                        ],
                        key: 'log-' + i,
                    },
                ];
            }
            case 'shape':
                return [
                    {
                        type: 'path',
                        color: {r: 255, g: 0, b: 0},
                        // strokeWidth: 2,
                        shapes: [item.shape],
                        key: 'log-' + i,
                    },
                    {
                        type: 'path',
                        color: {r: 255, g: 255, b: 255},
                        strokeWidth: 2,
                        shapes: [item.shape],
                        key: 'log-' + i,
                    },
                ];
        }
    });
};

const matchPath = (one: number[], two: number[]) => {
    if (one.length !== two.length - 1) {
        return null;
    }
    if (!one.every((n, i) => n === two[i])) return null;
    return two[two.length - 1];
};

const ShowRenderLog = ({
    log,
    path,
    onSelect,
    selection,
}: {
    selection: number[];
    log: RenderLog;
    path: number[];
    onSelect: (n: number[]) => void;
}) => {
    if (log.type === 'items') {
        const sel = matchPath(path, selection);
        return (
            <div className={sel != null ? 'bg-base-100' : ''}>
                <div>
                    {log.title}
                    <button
                        onClick={() => onSelect(sel === -1 ? [] : path.concat([-1]))}
                        className={'btn btn-square '}
                    >
                        {sel === -1 ? <CheckboxChecked /> : <CheckboxUnchecked />}
                    </button>
                </div>
                <div>
                    <input
                        type="range"
                        className="range"
                        value={sel ?? 0}
                        onChange={(evt) => onSelect(path.concat([+evt.target.value]))}
                    />
                </div>
            </div>
        );
    }
    const sel = matchPath(path, selection);
    return (
        <div>
            <div>
                {log.title}

                <button
                    onClick={() => onSelect(sel === -1 ? [] : path.concat([-1]))}
                    className={'btn btn-square '}
                >
                    {sel === -1 ? <CheckboxChecked /> : <CheckboxUnchecked />}
                </button>
            </div>
            <div className="p-2 ml-10">
                {log.children.map((child, i) => (
                    <ShowRenderLog
                        key={i}
                        log={child}
                        path={path.concat([i])}
                        onSelect={onSelect}
                        selection={selection}
                    />
                ))}
            </div>
        </div>
    );
};

export const RenderDebug = ({state, patterns}: {state: State; patterns: Patterns}) => {
    const animCache = useMemo<AnimCtx['cache']>(() => new Map(), []);

    const t = 0;
    const cropCache = useCropCache(state, t, animCache);

    const {items, warnings, keyPoints, byKey, bg, log} = useMemo(
        () => svgItems(state, animCache, cropCache, patterns, t),
        [state, patterns, cropCache, animCache, t],
    );

    const {zoomProps, box, reset: resetZoom} = useElementZoom(state.view.box);
    const [mouse, setMouse] = useState(null as null | Coord);
    const size = 500;

    const statusRef = useRef<HTMLDivElement>(null);

    const [logSelection, setLogSelection] = useState<number[]>([]);
    const logItems = renderLogSelection(logSelection, {type: 'group', children: log, title: 'Log'});
    const both = useMemo(() => [...items, ...logItems], [items, logItems]);

    return (
        <div>
            <div className="relative">
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
            </div>
            <div>{JSON.stringify(logSelection)}</div>
            <div className="overflow-auto" style={{maxHeight: 600}}>
                <ShowRenderLog
                    log={{type: 'group', title: 'Debug Log', children: log}}
                    onSelect={setLogSelection}
                    path={[]}
                    selection={logSelection}
                />
            </div>
        </div>
    );
};
