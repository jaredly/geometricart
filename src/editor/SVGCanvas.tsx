import {jsx} from '@emotion/react';
import Prando from 'prando';
import React, {useMemo, useRef} from 'react';
// import {RoughGenerator} from 'roughjs/bin/generator';
import {Action} from '../state/Action';
import {useCurrent} from '../useCurrent';
import {PendingMirror, UIState} from '../useUIState';
import {findSelection, pathToPrimitives} from './findSelection';
import {angleTo, Matrix, scale} from '../rendering/getMirrorTransforms';
import {calculateBounds, Guides, handleDuplicationIntersection, PendingDuplication} from './Guides';
import {handleSelection} from './handleSelection';
import {Primitive} from '../rendering/intersect';
import {applyStyleHover, StyleHover} from './StyleHover';
import {Overlay} from '../editor/Overlay';
import {paletteColor, RenderPath, RoughGenerator} from './RenderPath';
import {showHover} from './showHover';
import {Hover} from './Sidebar';
import {InsetCache, sortedVisibleInsetPaths} from '../rendering/sortedVisibleInsetPaths';
import {Coord, State, Intersect, View, Segment, guideNeedsAngle, guidePoints} from '../types';
import {useDragSelect, useMouseDrag} from './useMouseDrag';
import {useScrollWheel} from './useScrollWheel';
import {EditorState, MenuItem, screenToWorld} from './Canvas';
import {coordsEqual} from '../rendering/pathsAreIdentical';
import {RenderIntersections} from './RenderIntersections';
import {PKInsetCache, getClips} from '../rendering/pkInsetPaths';
import {canFreeClick, handleClick, previewPos} from './compassAndRuler';
import {useCompassAndRulerHandlers} from './useCompassAndRulerHandlers';

export function SVGCanvas({
    state,
    view,
    width,
    height,
    setEditorState,
    editorState,
    dispatch,
    styleHover,
    ppi,
    innerRef,
    hover,
    showMenu,
    isTouchScreen,
    pendingDuplication,
    setPendingDuplication,
    allIntersections,
    guidePrimitives,
    pendingMirror,
    mirrorTransforms,
    setPendingMirror,
    uiState,
}: {
    state: State;
    uiState: UIState;
    dispatch: (action: Action) => unknown;
    view: State['view'];
    width: number;
    height: number;
    setEditorState: React.Dispatch<React.SetStateAction<EditorState>>;
    editorState: EditorState;
    styleHover: StyleHover | null;
    ppi: number | undefined;
    innerRef: ((node: SVGSVGElement | null) => unknown) | undefined;
    hover: Hover | null;
    showMenu: (evt: React.MouseEvent, items: MenuItem[]) => void;
    isTouchScreen: boolean;
    pendingDuplication: PendingDuplication | null;
    setPendingDuplication: (b: null | PendingDuplication) => void;
    allIntersections: Intersect[];
    guidePrimitives: {
        primitives: {
            prim: Primitive;
            guides: string[];
        }[];
        points: Coord[];
    };
    pendingMirror: PendingMirror | null;
    mirrorTransforms: {
        [key: string]: Matrix[][];
    };
    setPendingMirror: (
        mirror: PendingMirror | ((mirror: PendingMirror | null) => PendingMirror | null) | null,
    ) => void;
}) {
    const currentState = React.useRef(state);
    currentState.current = state;

    usePalettePreload(state);

    const {x, y} = viewPos(view, width, height);

    const ref = React.useRef(null as null | SVGSVGElement);

    useScrollWheel(ref, setEditorState, currentState, width, height);

    const generator = React.useMemo(() => new RoughGenerator(), []);

    const currentDrag = useCurrent({
        pos: editorState.pos,
        drag: editorState.dragSelectPos,
    });
    const multiRef = useCurrent(editorState.multiSelect);

    const finishDrag = React.useCallback(
        finishDragFn(setEditorState, currentDrag, currentState, multiRef, dispatch),
        [],
    );

    const dragSelectHandlers = useDragSelect(
        editorState.dragSelectPos,
        width,
        height,
        view,
        setEditorState,
        finishDrag,
    );
    const mouseDragHandlers = useMouseDrag(
        editorState.dragPos,
        setEditorState,
        width,
        height,
        view,
    );

    const {compassRulerHandlers, compassDragState} = useCompassAndRulerHandlers(
        ref,
        view,
        width,
        height,
        currentState,
        dispatch,
        setEditorState,
    );

    const mouseHandlers =
        state.pending?.type === 'compass&ruler'
            ? compassRulerHandlers
            : editorState.selectMode
              ? dragSelectHandlers
              : mouseDragHandlers;

    React.useEffect(() => {
        if (!state.selection && multiRef.current) {
            setEditorState((state) => ({...state, multiSelect: false}));
        }
    }, [!!state.selection]);

    const clickPath = React.useCallback((shiftKey: boolean, id: string) => {
        const path = currentState.current.paths[id];
        handleSelection(path, currentState.current, dispatch, shiftKey || multiRef.current);
    }, []);

    let {pathsToShow, selectedIds, clip, rand} = usePathsToShow(state);

    if (styleHover) {
        pathsToShow = pathsToShow.map((path) => {
            if (selectedIds[path.id]) {
                return {
                    ...path,
                    style: applyStyleHover(styleHover, path.style),
                };
            }
            return path;
        });
    }

    const clipPrimitives = React.useMemo(() => {
        if (clip.length) {
            const res = {prims: [] as Primitive[], segments: [] as Segment[]};
            clip.forEach((c) => {
                res.segments.push(...c.shape);
                res.prims.push(...pathToPrimitives(c.shape));
            });
            return res;
        } else {
            return null;
        }
        // clip
        //     ? { prims: pathToPrimitives(clip.shape), segments: clip.shape }
        //     : null,
    }, [state.clips]);

    const dragged = editorState.dragSelectPos
        ? findSelection(
              currentState.current.paths,
              currentState.current.pathGroups,
              rectForCorners(editorState.pos, editorState.dragSelectPos),
          )
        : null;

    const backgroundColor =
        view.background != null ? paletteColor(state.palette, view.background) : null;

    // Ok, so what I want is:
    // while dragging, freeze the bounds.
    const bounds = React.useMemo(
        () => calculateBounds(width, height, view),
        [width, height, editorState.dragPos ? null : view],
    );

    const svgContents = (
        <svg
            width={ppi != null ? calcPPI(ppi, width, view.zoom) : width}
            height={ppi != null ? calcPPI(ppi, height, view.zoom) : height}
            viewBox={`0 0 ${width} ${height}`}
            xmlns="http://www.w3.org/2000/svg"
            style={{border: '1px solid #333'}}
            ref={(node) => {
                if (innerRef) {
                    innerRef(node);
                }
                ref.current = node;
            }}
            {...mouseHandlers}
            onClick={(evt) => {
                const rect = evt.currentTarget.getBoundingClientRect();
                const coord = screenToWorld(
                    width,
                    height,
                    {
                        x: evt.clientX - rect.left,
                        y: evt.clientY - rect.top,
                    },
                    view,
                );
                if (
                    state.pending?.type === 'Guide' &&
                    guideNeedsAngle(state.pending.kind) &&
                    guidePoints[state.pending.kind] === state.pending.points.length
                ) {
                    dispatch({
                        type: 'pending:angle',
                        angle: angleTo(
                            state.pending.points[state.pending.points.length - 1],
                            coord,
                        ),
                    });
                }

                console.log('clickinggggg');
            }}
        >
            <defs>
                {state.palette.map((color, i) =>
                    color.startsWith('http') && imageCache[color] ? (
                        <pattern
                            key={`palette-${i}`}
                            id={`palette-${i}`}
                            x={-x}
                            y={-y}
                            width={width}
                            height={height}
                            patternUnits="userSpaceOnUse"
                            preserveAspectRatio="xMidYMid slice"
                        >
                            <image
                                width={width}
                                height={height}
                                preserveAspectRatio="xMidYMid slice"
                                href={imageCache[color] as string}
                            />
                        </pattern>
                    ) : null,
                )}
            </defs>
            <g transform={`translate(${x} ${y})`}>
                {backgroundColor != null && backgroundColor !== 'transparent' ? (
                    <rect
                        width={width}
                        height={height}
                        x={-x}
                        y={-y}
                        stroke="none"
                        fill={backgroundColor}
                    />
                ) : null}
                {Object.keys(state.overlays)
                    .filter(
                        (id) =>
                            maybeReverse(
                                !state.overlays[id].hide,
                                hover?.type === 'element' &&
                                    hover?.kind === 'Overlay' &&
                                    hover?.id === id,
                            ) && !state.overlays[id].over,
                    )
                    .map((id) => {
                        return (
                            <Overlay
                                state={state}
                                id={id}
                                view={view}
                                key={id}
                                width={width}
                                height={height}
                                onUpdate={(overlay) =>
                                    dispatch({
                                        type: 'overlay:update',
                                        overlay,
                                    })
                                }
                            />
                        );
                    })}

                {pathsToShow.map((path, i) => (
                    <RenderPath
                        key={path.id + '-' + i}
                        generator={generator}
                        origPath={state.paths[path.id]}
                        groups={state.pathGroups}
                        rand={rand.current}
                        clip={clipPrimitives}
                        path={path}
                        contextMenu={{showMenu, state, dispatch}}
                        zoom={view.zoom}
                        sketchiness={view.sketchiness}
                        palette={state.palette}
                        styleHover={selectedIds[path.id] ? styleHover : null}
                        onClick={
                            // TODO: Disable path clickies if we're doing guides, folks.
                            editorState.pending !== null ||
                            uiState.pendingDuplication ||
                            uiState.pendingMirror
                                ? undefined
                                : clickPath
                        }
                    />
                ))}

                {Object.keys(state.overlays)
                    .filter(
                        (id) =>
                            maybeReverse(
                                !state.overlays[id].hide,
                                hover?.type === 'element' &&
                                    hover?.kind === 'Overlay' &&
                                    hover?.id === id,
                            ) && state.overlays[id].over,
                    )
                    .map((id) => {
                        return (
                            <Overlay
                                state={state}
                                id={id}
                                view={view}
                                key={id}
                                width={width}
                                height={height}
                                onUpdate={(overlay) =>
                                    dispatch({
                                        type: 'overlay:update',
                                        overlay,
                                    })
                                }
                            />
                        );
                    })}

                {view.guides || hover?.type === 'guides' || editorState.pending ? (
                    <Guides
                        uiState={uiState}
                        compassDragState={compassDragState}
                        state={state}
                        bounds={bounds}
                        isTouchScreen={isTouchScreen}
                        pendingDuplication={pendingDuplication}
                        setPendingDuplication={setPendingDuplication}
                        dispatch={dispatch}
                        width={width}
                        height={height}
                        allIntersections={allIntersections}
                        guidePrimitives={guidePrimitives.primitives}
                        zooming={editorState.zooming}
                        view={view}
                        disableGuides={!!pendingMirror}
                        pos={isTouchScreen ? scale(view.center, -1) : editorState.pos}
                        editorState={editorState}
                        setEditorState={setEditorState}
                        mirrorTransforms={mirrorTransforms}
                        pendingMirror={pendingMirror}
                        setPendingMirror={setPendingMirror}
                        hover={hover}
                    />
                ) : uiState.pendingDuplication ? (
                    <RenderIntersections
                        zoom={view.zoom}
                        highlight={state.pending != null}
                        intersections={allIntersections}
                        onClick={(coord, shiftKey) => {
                            if (uiState.pendingDuplication) {
                                handleDuplicationIntersection(
                                    coord,
                                    currentState.current,
                                    uiState.pendingDuplication,
                                    setPendingDuplication,
                                    dispatch,
                                );
                            }
                        }}
                    />
                ) : null}
                {state.selection && !styleHover
                    ? state.selection.ids.map((id) =>
                          showHover(
                              id,
                              {
                                  kind: state.selection!.type,
                                  id,
                                  type: 'element',
                              },
                              state,
                              mirrorTransforms,
                              view.zoom,
                              bounds,
                              true,
                          ),
                      )
                    : null}
                {dragged
                    ? dragged.map((id) =>
                          showHover(
                              id,
                              {kind: 'Path', id, type: 'element'},
                              state,
                              mirrorTransforms,
                              view.zoom,
                              bounds,
                              false,
                          ),
                      )
                    : null}
                {hover ? (
                    <>
                        {showHover(
                            `hover`,
                            hover,
                            state,
                            mirrorTransforms,
                            view.zoom,
                            bounds,
                            false,
                        )}
                    </>
                ) : null}
                {editorState.dragSelectPos ? (
                    <rect
                        x={Math.min(editorState.dragSelectPos.x, editorState.pos.x) * view.zoom}
                        y={Math.min(editorState.dragSelectPos.y, editorState.pos.y) * view.zoom}
                        width={
                            Math.abs(editorState.dragSelectPos.x - editorState.pos.x) * view.zoom
                        }
                        height={
                            Math.abs(editorState.dragSelectPos.y - editorState.pos.y) * view.zoom
                        }
                        fill="rgba(255,255,255,0.2)"
                        stroke="red"
                        strokeWidth="2"
                    />
                ) : null}
            </g>
        </svg>
    );
    return svgContents;
}

export const calcPPI = (ppi: number, pixels: number, zoom: number) => {
    return `${(pixels / ppi).toFixed(3)}in`;
};

// base64
export const imageCache: {[href: string]: string | false} = {};

export function usePathsToShow(state: State) {
    const selectedIds = React.useMemo(() => {
        return getSelectedIds(state.paths, state.selection);
    }, [state.selection, state.paths]);

    const rand = React.useRef(new Prando('ok'));
    rand.current.reset();

    const insetCache = useRef({} as PKInsetCache);

    let {res: pathsToShow, clip} = React.useMemo(() => {
        const clip = getClips(state);
        const now = performance.now();
        const res = sortedVisibleInsetPaths(
            state.paths,
            state.pathGroups,
            rand.current,
            clip,
            state.view.hideDuplicatePaths,
            state.view.laserCutMode ? state.palette : undefined,
            undefined,
            selectedIds,
            insetCache.current,
        );
        return {res, clip};
    }, [
        state.paths,
        state.pathGroups,
        state.clips,
        state.view.hideDuplicatePaths,
        state.view.laserCutMode,
        selectedIds,
    ]);
    return {pathsToShow, selectedIds, clip, rand};
}

export function getSelectedIds(paths: State['paths'], selection: State['selection']) {
    const selectedIds: {[key: string]: boolean} = {};
    if (selection?.type === 'Path') {
        selection.ids.forEach((id) => (selectedIds[id] = true));
    } else if (selection?.type === 'PathGroup') {
        Object.keys(paths).forEach((id) => {
            if (selection!.ids.includes(paths[id].group!)) {
                selectedIds[id] = true;
            }
        });
    }
    return selectedIds;
}

const maybeReverse = (v: boolean, reverse: boolean) => (reverse ? !v : v);

function rectForCorners(pos: {x: number; y: number}, drag: Coord) {
    return {
        x1: Math.min(pos.x, drag.x),
        y1: Math.min(pos.y, drag.y),
        x2: Math.max(pos.x, drag.x),
        y2: Math.max(pos.y, drag.y),
    };
}

function finishDragFn(
    setEditorState: React.Dispatch<React.SetStateAction<EditorState>>,
    currentDrag: React.MutableRefObject<{pos: Coord; drag: Coord | null}>,
    currentState: React.MutableRefObject<State>,
    multiRef: React.MutableRefObject<boolean>,
    dispatch: (action: Action) => unknown,
): (shiftKey: boolean) => void {
    return (shiftKey: boolean) => {
        // setEditorState((state) => ({ ...state, selectMode: false }));
        // cancelDragSelect();
        const {pos, drag} = currentDrag.current;
        if (!drag || pos === drag || coordsEqual(pos, drag)) {
            return;
        }
        const rect = rectForCorners(pos, drag);
        const selected = findSelection(
            currentState.current.paths,
            currentState.current.pathGroups,
            rect,
        );
        if ((shiftKey || multiRef.current) && currentState.current.selection?.type === 'Path') {
            selected.push(
                ...currentState.current.selection.ids.filter((id) => !selected.includes(id)),
            );
        }
        console.log('ok selected', selected);
        dispatch({
            type: 'selection:set',
            selection: {type: 'Path', ids: selected},
        });
    };
}

export function viewPos(view: View, width: number, height: number) {
    const x = view.center.x * view.zoom + width / 2;
    const y = view.center.y * view.zoom + height / 2;
    return {x, y};
}

function usePalettePreload(state: State) {
    const [, setTick] = React.useState(0);

    React.useEffect(() => {
        state.palette.forEach((color) => {
            if (color.startsWith('http')) {
                if (imageCache[color] != null) {
                    return;
                }
                imageCache[color] = false;
                fetch(`https://get-page.jaredly.workers.dev/?url=${encodeURIComponent(color)}`)
                    .then((data) => data.blob())
                    .then((blob) => {
                        var reader = new FileReader();
                        reader.readAsDataURL(blob);
                        reader.onloadend = function () {
                            var base64data = reader.result;
                            imageCache[color] = base64data as string;
                            setTick((t) => t + 1);
                        };
                    });
            }
        });
    }, [state.palette]);
}
