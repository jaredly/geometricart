import {useMemo, useRef, useState} from 'react';
import {
    AddIcon,
    BaselineFilterCenterFocus,
    BaselineZoomInMap,
    CheckboxChecked,
    CheckboxUnchecked,
} from '../../../icons/Icon';
import {closeEnough} from '../../../rendering/epsilonToZero';
import {push} from '../../../rendering/getMirrorTransforms';
import {BarePath, Coord} from '../../../types';
import {AnimCtx, Patterns, RenderItem} from './evaluate';
import {State} from './export-types';
import {LogItem, RenderLog, svgItems} from './resolveMods';
import {SVGCanvas} from './SVGCanvas';
import {useCropCache} from './useCropCache';
import {useElementZoom} from './useSVGZoom';
import {useEditState} from './editState';
import {renderShape} from './RenderExport';
import {Updater} from '../../../json-diff/Updater';

const allItems = (log: RenderLog): LogItem[] => {
    if (log.type === 'items') return log.items.flatMap((l) => l.item);
    return log.children.length ? allItems(log.children[0]) : [];
};

const getLogSelection = (logSelection: number[], log: RenderLog): LogItem[] => {
    const base = log;
    for (let i = 0; i < logSelection.length - 1; i++) {
        if (log.type !== 'group') return [];
        log = log.children[logSelection[i]];
        if (!log) return [];
    }
    if (!log) {
        console.log(base, logSelection);
        throw Error(`no item` + logSelection);
    }
    const last = logSelection[logSelection.length - 1];
    if (last === -1) return allItems(log);
    if (log.type === 'items') {
        if (!log.items[last]) {
            console.warn(`BAD NEWS`, log, last);
            return [];
        }
        const item = log.items[last].item;
        return Array.isArray(item) ? item : [item];
    }
    return [];
};

const circleSeg = (center: Coord, size: number): BarePath => {
    const p = push(center, 0, size);
    return {
        origin: p,
        segments: [{type: 'Arc', center, clockwise: true, to: p}],
    };
};

// START HERE
const renderLogSelection = (
    logSelection: number[],
    log: RenderLog,
    detectOverlaps: boolean,
): RenderItem[] => {
    const selection = getLogSelection(logSelection, log);
    return selection.flatMap((item, i): RenderItem[] => {
        switch (item.type) {
            case 'seg':
                return [
                    {
                        type: 'path',
                        color: {r: 255, g: 0, b: 0},
                        strokeWidth: 0.02,
                        adjustForZoom: true,
                        shapes: [{origin: item.prev, segments: [item.seg], open: true}],
                        opacity: detectOverlaps ? 0.3 : undefined,
                        key: 'log-' + i,
                    },
                    ...(detectOverlaps
                        ? []
                        : [
                              {
                                  type: 'point' as const,
                                  color: {r: 255, g: 255, b: 255},
                                  coord: item.prev,
                                  key: 'log2-' + i,
                              },
                              {
                                  type: 'point' as const,
                                  color: {r: 255, g: 255, b: 255},
                                  coord: item.seg.to,
                                  key: 'log3-' + i,
                              },
                          ]),
                ];
            case 'point': {
                return [
                    {
                        type: 'point',
                        color: {r: 255, g: 0, b: 0},
                        // strokeWidth: 0.02,
                        opacity: detectOverlaps ? 0.3 : undefined,
                        // shapes: [circleSeg(item.p, 0.01)],
                        coord: item.p,
                        key: 'log-' + i,
                    },
                ];
            }
            case 'shape':
                return [
                    {
                        type: 'path',
                        color: {r: 255, g: 0, b: 0},
                        opacity: detectOverlaps ? 0.3 : undefined,
                        adjustForZoom: true,
                        shapes: [item.shape],
                        key: 'log-' + i,
                    },
                    ...(detectOverlaps
                        ? []
                        : [
                              {
                                  type: 'path' as const,
                                  color: {r: 255, g: 255, b: 255},
                                  adjustForZoom: true,
                                  strokeWidth: 0.02,
                                  shapes: [item.shape],
                                  key: 'log-z' + i,
                              },
                          ]),
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
        const v = sel != null && sel !== -1 ? log.items[sel] : null;
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
                    {sel?.toString()} {v?.text ?? 'No text'}
                </div>
                <div>
                    <input
                        type="range"
                        className="range"
                        value={sel ?? 0}
                        min={0}
                        max={log.items.length - 1}
                        onClick={() =>
                            sel === -1 || sel == null ? onSelect(path.concat([0])) : null
                        }
                        onChange={(evt) => onSelect(path.concat([+evt.target.value]))}
                    />
                </div>
            </div>
        );
    }
    const sel = matchPath(path, selection);
    return (
        <details>
            <summary className="cursor-pointer">
                {log.title} ({log.children.length})
                <button
                    onClick={(evt) => {
                        evt.preventDefault();
                        onSelect(sel === -1 ? [] : path.concat([-1]));
                    }}
                    className={'btn btn-square '}
                >
                    {sel === -1 ? <CheckboxChecked /> : <CheckboxUnchecked />}
                </button>
            </summary>
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
        </details>
    );
};

export const RenderDebug = ({
    state,
    patterns,
    update,
}: {
    state: State;
    patterns: Patterns;
    update: Updater<State>;
}) => {
    const animCache = useMemo<AnimCtx['cache']>(() => new Map(), []);

    const m = location.search.match(/debug=([\d.]+)/g);
    const t = m ? +m[0].split('=')[1] : 0;

    const es = useEditState();
    const hover = es.use((es) => es.hover);
    // const t = 0.763;
    // const t = 0.592;
    // const t = 0.992;
    const cropCache = useCropCache(state, t, animCache);

    const {items, warnings, keyPoints, byKey, bg, log} = useMemo(
        () => svgItems(state, animCache, cropCache, patterns, t, true),
        [state, patterns, cropCache, animCache, t],
    );

    const {zoomProps, box, reset: resetZoom} = useElementZoom(state.view.box);
    const [mouse, setMouse] = useState(null as null | Coord);
    const size = 500;

    const [detectOverlaps, setDetectOverlaps] = useState(false);

    const statusRef = useRef<HTMLDivElement>(null);

    const [showMain, setShowMain] = useState(true);

    const [logSelection, setLogSelection] = useState<number[]>([]);
    const logItems = renderLogSelection(
        logSelection,
        {type: 'group', children: log!, title: 'Log'},
        detectOverlaps,
    );

    const shapesItems = useMemo(
        (): RenderItem[] =>
            hover
                ? (hover.type === 'shape' ? [hover.id] : hover.ids).flatMap((id) =>
                      renderShape(id, state.shapes[id], hover, []),
                  )
                : [],
        [state.shapes, hover],
    );

    const both = useMemo(
        () => (showMain || shapesItems.length ? [...items, ...logItems, ...shapesItems] : logItems),
        [showMain, items, logItems, shapesItems],
    );

    return (
        <div className="p-4">
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
                        <button
                            className="btn btn-square px-2 py-1 bg-base-100"
                            onClick={() => {
                                update.view.box(box);
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
            </div>
            <label>
                Show Main Pattern
                <input
                    type="checkbox"
                    className="checkbox"
                    checked={showMain}
                    onChange={(evt) => setShowMain(evt.target.checked)}
                />
            </label>
            <label>
                Detect Overlaps
                <input
                    type="checkbox"
                    className="checkbox"
                    checked={detectOverlaps}
                    onChange={(evt) => setDetectOverlaps(evt.target.checked)}
                />
            </label>
            <div>{JSON.stringify(logSelection)}</div>
            <div className="overflow-auto" style={{maxHeight: 600}}>
                <ShowRenderLog
                    log={{type: 'group', title: 'Debug Log', children: log!}}
                    onSelect={setLogSelection}
                    path={[]}
                    selection={logSelection}
                />
            </div>
        </div>
    );
};
