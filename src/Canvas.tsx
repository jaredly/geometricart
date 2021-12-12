/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import Prando from 'prando';
import React from 'react';
import { RoughGenerator } from 'roughjs/bin/generator';
import { PendingMirror, useCurrent } from './App';
import {
    findSelection,
    pathToPrimitives,
    segmentToPrimitive,
} from './findSelection';
// import { DrawPath } from './DrawPathOld';
import { getMirrorTransforms } from './getMirrorTransforms';
import {
    calculateBounds,
    Guides,
    PendingPathPair,
    primitivesForElementsAndPaths,
} from './Guides';
import { handleSelection } from './handleSelection';
import { mergeFills, mergeStyleLines } from './MultiStyleForm';
import { Overlay } from './Overlay';
import { paletteColor, RenderPath } from './RenderPath';
import { RenderPrimitive } from './RenderPrimitive';
import { RenderWebGL } from './RenderWebGL';
import { showHover } from './showHover';
import { Hover } from './Sidebar';
import {
    Action,
    ArcSegment,
    Coord,
    Id,
    Intersect,
    Segment,
    State,
    Style,
    View,
} from './types';
import { useDragSelect, useMouseDrag } from './useMouseDrag';
import { useScrollWheel } from './useScrollWheel';
import { sortedVisibleInsetPaths } from './sortedVisibleInsetPaths';
import {
    backUp,
    DrawPathState,
    goForward,
    goLeft,
    goRight,
    isComplete,
} from './DrawPath';
import { Primitive } from './intersect';
import { calculateGuideElements } from './calculateGuideElements';
import { calcAllIntersections } from './calcAllIntersections';
import { simplifyPath } from './insetPath';
import { ensureClockwise } from './CanvasRender';

export type Props = {
    state: State;
    dragSelect: boolean;
    cancelDragSelect: () => void;
    isTouchScreen: boolean;
    width: number;
    height: number;
    innerRef: (node: SVGSVGElement | null) => unknown;
    pendingMirror: PendingMirror | null;
    setPendingMirror: (
        mirror:
            | (PendingMirror | null)
            | ((mirror: PendingMirror | null) => PendingMirror | null),
    ) => void;
    dispatch: (action: Action) => unknown;
    hover: Hover | null;
};

export const worldToScreen = (
    width: number,
    height: number,
    pos: Coord,
    view: View,
) => ({
    x: width / 2 + (pos.x + view.center.x) * view.zoom,
    y: height / 2 + (pos.y + view.center.y) * view.zoom,
});
export const screenToWorld = (
    width: number,
    height: number,
    pos: Coord,
    view: View,
) => ({
    x: (pos.x - width / 2) / view.zoom - view.center.x,
    y: (pos.y - height / 2) / view.zoom - view.center.y,
});

// base64
export const imageCache: { [href: string]: string | false } = {};

/*

Kinds of state:

- transient state (tmpZoom, hover, )
- project state (guides, paths, mirrors)
- editor settings (palettes, shaders)
    - I /do/ want undo/redo for this, but ... it needs to live in a separate ... history list. and not be persisted along with the project.
        - although changes would get synced over? hmmm I don't know what I want here.
        - ok yes, changed do get synced over, but not in an undoable way, on the project side.
    - ermmmmmm
        - ok what about this plan
        - All fills have their colors denormalized.
        - when you switch palettes, the `palette:switch` includes the whole new palette, and the whole old palette.
        - it just goes through all paths, and swaps things out where it sees them.

*/

export const Canvas = ({
    state,
    width,
    height,
    dispatch,
    innerRef,
    hover,
    pendingMirror,
    setPendingMirror,
    dragSelect,
    isTouchScreen,
    cancelDragSelect,
}: Props) => {
    const mirrorTransforms = React.useMemo(
        () => getMirrorTransforms(state.mirrors),
        [state.mirrors],
    );

    const [pos, setPos] = React.useState({ x: 0, y: 0 });

    const currentState = React.useRef(state);
    currentState.current = state;

    usePalettePreload(state);

    const [tmpView, setTmpView] = React.useState(null as null | View);

    const [zooming, setZooming] = React.useState(false);

    let view = React.useMemo(() => {
        let view = tmpView ?? state.view;
        return { ...state.view, center: view.center, zoom: view.zoom };
    }, [state.view, tmpView]);

    const { x, y } = viewPos(view, width, height);

    const ref = React.useRef(null as null | SVGSVGElement);

    useScrollWheel(ref, setTmpView, setZooming, currentState, width, height);

    const generator = React.useMemo(() => new RoughGenerator(), []);

    const [dragPos, setDragPos] = React.useState(
        null as null | { view: View; coord: Coord },
    );

    const [dragSelectPos, setDragSelect] = React.useState(null as null | Coord);

    const currentDrag = useCurrent({ pos, drag: dragSelectPos });

    const finishDrag = React.useCallback((shiftKey: boolean) => {
        cancelDragSelect();
        const { pos, drag } = currentDrag.current;
        if (!drag) {
            return;
        }
        console.log(pos, drag);
        const rect = rectForCorners(pos, drag);
        const selected = findSelection(
            currentState.current.paths,
            currentState.current.pathGroups,
            rect,
        );
        if (shiftKey && currentState.current.selection?.type === 'Path') {
            selected.push(
                ...currentState.current.selection.ids.filter(
                    (id) => !selected.includes(id),
                ),
            );
        }
        dispatch({
            type: 'selection:set',
            selection: { type: 'Path', ids: selected },
        });
    }, []);

    const mouseHandlers = dragSelect
        ? useDragSelect(
              dragSelectPos,
              width,
              height,
              view,
              setPos,
              setDragSelect,
              finishDrag,
          )
        : useMouseDrag(
              dragPos,
              setTmpView,
              width,
              height,
              view,
              setPos,
              setDragPos,
          );

    const [multiSelect, setMultiSelect] = React.useState(false);
    const multiRef = useCurrent(multiSelect);

    const clickPath = React.useCallback((shiftKey, id) => {
        const path = currentState.current.paths[id];
        handleSelection(
            path,
            currentState.current,
            dispatch,
            shiftKey || multiRef.current,
        );
    }, []);

    const clip = state.view.activeClip
        ? state.clips[state.view.activeClip]
        : undefined;

    const pathsToShow = React.useMemo(
        () =>
            sortedVisibleInsetPaths(
                state.paths,
                state.pathGroups,
                clip,
                state.view.hideDuplicatePaths,
                state.view.laserCutMode
                    ? state.palettes[state.activePalette]
                    : undefined,
            ),
        [
            state.paths,
            state.pathGroups,
            clip,
            state.view.hideDuplicatePaths,
            state.view.laserCutMode,
        ],
    );

    const clipPrimitives = React.useMemo(
        () => (clip ? pathToPrimitives(clip) : null),
        [clip],
    );

    const dragged = dragSelectPos
        ? findSelection(
              currentState.current.paths,
              currentState.current.pathGroups,
              rectForCorners(pos, dragSelectPos),
          )
        : null;

    const backgroundColor =
        view.background != null
            ? paletteColor(state.palettes[state.activePalette], view.background)
            : null;

    const rand = React.useRef(new Prando('ok'));
    rand.current.reset();

    const bounds = React.useMemo(
        () => calculateBounds(width, height, view),
        [width, height, view],
    );

    const pendingPath = React.useState(null as null | DrawPathState);

    const guidePrimitives = React.useMemo(() => {
        return primitivesForElementsAndPaths(
            calculateGuideElements(state.guides, mirrorTransforms),
            Object.keys(state.paths)
                .filter(
                    (k) =>
                        !state.paths[k].hidden &&
                        (!state.paths[k].group ||
                            !state.pathGroups[state.paths[k].group!].hide),
                )
                .map((k) => state.paths[k]),
        );
    }, [state.guides, state.paths, state.pathGroups, mirrorTransforms]);

    const allIntersections = React.useMemo(() => {
        const { coords: fromGuides, seenCoords } = calcAllIntersections(
            guidePrimitives.map((p) => p.prim),
        );
        return fromGuides;
    }, [guidePrimitives, state.paths, state.pathGroups]);

    return (
        <div
            css={{
                position: 'relative',
            }}
            style={{ width, height }}
            onClick={(evt) => {
                // if (evt.target === evt.currentTarget) {
                if (state.selection && !evt.shiftKey) {
                    dispatch({
                        type: 'selection:set',
                        selection: null,
                    });
                }
                // }
            }}
        >
            <svg
                width={width}
                height={height}
                xmlns="http://www.w3.org/2000/svg"
                ref={(node) => {
                    innerRef(node);
                    ref.current = node;
                }}
                css={{
                    outline: '1px solid magenta',
                }}
                {...mouseHandlers}
            >
                <defs>
                    {state.palettes[state.activePalette].map((color, i) =>
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
                    {backgroundColor != null &&
                    backgroundColor !== 'transparent' ? (
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
                                !state.overlays[id].hide &&
                                !state.overlays[id].over,
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
                            zoom={view.zoom}
                            sketchiness={view.sketchiness}
                            palette={state.palettes[state.activePalette]}
                            onClick={
                                // TODO: Disable path clickies if we're doing guides, folks.
                                pendingPath[0]
                                    ? undefined
                                    : // pathOrigin
                                      //     ? undefined :
                                      clickPath
                            }
                        />
                    ))}

                    {Object.keys(state.overlays)
                        .filter(
                            (id) =>
                                !state.overlays[id].hide &&
                                state.overlays[id].over,
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

                    {view.guides ? (
                        <Guides
                            state={state}
                            dispatch={dispatch}
                            width={width}
                            height={height}
                            allIntersections={allIntersections}
                            guidePrimitives={guidePrimitives}
                            zooming={zooming}
                            view={view}
                            pos={pos}
                            pendingPath={pendingPath}
                            mirrorTransforms={mirrorTransforms}
                            pendingMirror={pendingMirror}
                            setPendingMirror={setPendingMirror}
                            hover={hover}
                        />
                    ) : null}
                    {state.selection
                        ? state.selection.ids.map((id) =>
                              showHover(
                                  id,
                                  { kind: state.selection!.type, id },
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
                                  { kind: 'Path', id },
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
                    {dragSelectPos ? (
                        <rect
                            x={Math.min(dragSelectPos.x, pos.x) * view.zoom}
                            y={Math.min(dragSelectPos.y, pos.y) * view.zoom}
                            width={
                                Math.abs(dragSelectPos.x - pos.x) * view.zoom
                            }
                            height={
                                Math.abs(dragSelectPos.y - pos.y) * view.zoom
                            }
                            fill="rgba(255,255,255,0.2)"
                            stroke="red"
                            strokeWidth="2"
                        />
                    ) : null}
                </g>
            </svg>
            {tmpView ? (
                <div
                    css={{
                        position: 'absolute',
                        padding: 20,
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        color: 'black',
                        top: 0,
                        left: 0,
                    }}
                    onClick={() => setTmpView(null)}
                >
                    Reset zoom
                    {` ${pos.x.toFixed(4)},${pos.y.toFixed(4)}`}
                </div>
            ) : null}
            {view.texture ? (
                <RenderWebGL
                    state={state}
                    texture={view.texture}
                    width={width}
                    height={height}
                />
            ) : null}
            {isTouchScreen ? (
                <div
                    css={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                    }}
                    onClick={(evt) => evt.stopPropagation()}
                >
                    {state.selection ? (
                        <div>
                            <button
                                onClick={() => {
                                    dispatch({
                                        type: 'selection:set',
                                        selection: null,
                                    });
                                }}
                            >
                                Clear selection
                            </button>
                            <button
                                onClick={() => {
                                    setMultiSelect((s) => !s);
                                }}
                                style={{
                                    fontWeight: multiSelect ? 'bold' : 'normal',
                                }}
                            >
                                Multi-select
                            </button>
                        </div>
                    ) : null}

                    {pendingPath[0] ? (
                        <PendingPathControls
                            pendingPath={pendingPath}
                            allIntersections={allIntersections}
                            guidePrimitives={guidePrimitives}
                            onComplete={(
                                isClip: boolean,
                                origin: Coord,
                                segments: Array<Segment>,
                            ) => {
                                if (isClip) {
                                    dispatch({
                                        type: 'clip:add',
                                        clip: segments,
                                    });
                                } else {
                                    dispatch({
                                        type: 'path:create',
                                        segments,
                                        origin,
                                    });
                                }
                            }}
                        />
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};

export const PendingPathControls = ({
    pendingPath: [state, setState],
    allIntersections,
    guidePrimitives,
    onComplete,
}: {
    pendingPath: PendingPathPair;
    allIntersections: Array<Intersect>;
    guidePrimitives: Array<{ prim: Primitive; guides: Array<Id> }>;
    onComplete: (
        isClip: boolean,
        origin: Coord,
        segments: Array<Segment>,
    ) => void;
}) => {
    if (!state) {
        return null;
    }
    return (
        <div css={{}}>
            {isComplete(state) ? (
                <>
                    <button
                        css={{ fontSize: 40 }}
                        onClick={() => {
                            onComplete(
                                state.isClip,
                                state.origin.coord,
                                simplifyPath(
                                    ensureClockwise(
                                        state.parts.map((p) => p.segment),
                                    ),
                                ),
                            );
                        }}
                    >
                        finish ✅
                    </button>
                    <button
                        css={{ fontSize: 40 }}
                        onClick={() => {
                            setState(
                                backUp(
                                    state.origin,
                                    guidePrimitives,
                                    allIntersections,
                                ),
                            );
                        }}
                    >
                        back ❌
                    </button>
                </>
            ) : (
                <>
                    <button
                        css={{ fontSize: 40 }}
                        onClick={() => {
                            setState(goLeft);
                        }}
                    >
                        👈
                    </button>
                    <button
                        css={{ fontSize: 40 }}
                        onClick={() => {
                            if (state && isComplete(state)) {
                                return onComplete(
                                    state.isClip,
                                    state.origin.coord,
                                    simplifyPath(
                                        ensureClockwise(
                                            state.parts.map((p) => p.segment),
                                        ),
                                    ),
                                );
                            }
                            setState(
                                goForward(guidePrimitives, allIntersections),
                            );
                        }}
                    >
                        ✅
                    </button>
                    <button
                        css={{ fontSize: 40 }}
                        onClick={() => {
                            setState(goRight);
                        }}
                    >
                        👉
                    </button>
                    <button
                        css={{ fontSize: 40 }}
                        onClick={() => {
                            setState(
                                backUp(
                                    state.origin,
                                    guidePrimitives,
                                    allIntersections,
                                ),
                            );
                        }}
                    >
                        ❌
                    </button>
                </>
            )}
        </div>
    );
};

export const combineStyles = (styles: Array<Style>): Style => {
    const result: Style = {
        fills: [],
        lines: [],
    };
    styles.forEach((style) => {
        style.fills.forEach((fill, i) => {
            if (fill != null) {
                result.fills[i] = result.fills[i]
                    ? mergeFills(result.fills[i]!, fill)
                    : fill;
            }
        });
        style.lines.forEach((line, i) => {
            if (line != null) {
                result.lines[i] = result.lines[i]
                    ? mergeStyleLines(result.lines[i]!, line)
                    : line;
            }
        });
    });

    return result;
};

export const dragView = (
    prev: View | null,
    dragPos: { view: View; coord: Coord },
    clientX: number,
    rect: DOMRect,
    clientY: number,
    width: number,
    height: number,
) => {
    let view = dragPos.view;

    const screenPos = {
        x: clientX - rect.left,
        y: clientY - rect.top,
    };

    const newPos = screenToWorld(width, height, screenPos, view);
    const offset = Math.max(
        Math.abs(newPos.x - dragPos.coord.x),
        Math.abs(newPos.y - dragPos.coord.y),
    );
    if (!prev && offset * view.zoom < 10) {
        return null;
    }

    const res = {
        ...view,
        center: {
            x: view.center.x + (newPos.x - dragPos.coord.x),
            y: view.center.y + (newPos.y - dragPos.coord.y),
        },
    };
    return res;
};

function rectForCorners(pos: { x: number; y: number }, drag: Coord) {
    return {
        x1: Math.min(pos.x, drag.x),
        y1: Math.min(pos.y, drag.y),
        x2: Math.max(pos.x, drag.x),
        y2: Math.max(pos.y, drag.y),
    };
}

export function viewPos(view: View, width: number, height: number) {
    const x = view.center.x * view.zoom + width / 2;
    const y = view.center.y * view.zoom + height / 2;
    return { x, y };
}

export function usePalettePreload(state: State) {
    const [, setTick] = React.useState(0);

    React.useEffect(() => {
        state.palettes[state.activePalette].forEach((color) => {
            if (color.startsWith('http')) {
                if (imageCache[color] != null) {
                    return;
                }
                imageCache[color] = false;
                fetch(
                    `https://get-page.jaredly.workers.dev/?url=${encodeURIComponent(
                        color,
                    )}`,
                )
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
    }, [state.palettes[state.activePalette]]);
}
