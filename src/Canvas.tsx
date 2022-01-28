/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import Prando from 'prando';
import React from 'react';
import { RoughGenerator } from 'roughjs/bin/generator';
import { PendingMirror, useCurrent } from './App';
import { calcAllIntersections } from './calcAllIntersections';
import { calculateGuideElements } from './calculateGuideElements';
import { DrawPathState } from './DrawPath';
import { findSelection, pathToPrimitives } from './findSelection';
import { BlurInt, Float, Text } from './Forms';
// import { DrawPath } from './DrawPathOld';
import { dist, getMirrorTransforms, scale } from './getMirrorTransforms';
import {
    calculateBounds,
    Guides,
    PendingPathPair,
    primitivesForElementsAndPaths,
} from './Guides';
import { handleSelection } from './handleSelection';
import { IconButton, ScissorsCuttingIcon } from './icons/Icon';
import { MirrorMenu } from './MirrorMenu';
import {
    applyStyleHover,
    mergeFills,
    mergeStyleLines,
    MultiStyleForm,
    StyleHover,
} from './MultiStyleForm';
import { Overlay } from './Overlay';
import { OverlayMenu } from './OverlayMenu';
import { PendingPathControls } from './PendingPathControls';
import { paletteColor, RenderPath } from './RenderPath';
import { RenderWebGL } from './RenderWebGL';
import { showHover } from './showHover';
import { Hover } from './Sidebar';
import { sortedVisibleInsetPaths } from './sortedVisibleInsetPaths';
import {
    idsToStyle,
    mirrorControls,
    selectionSection,
    GuideSection,
} from './touchscreenControls';
import {
    Animations,
    Coord,
    FloatTimeline,
    Path,
    Segment,
    State,
    Style,
    TimelinePoint,
    View,
} from './types';
import { Action } from './Action';
import { useDragSelect, useMouseDrag } from './useMouseDrag';
import { useScrollWheel } from './useScrollWheel';
import { segmentsBounds } from './Export';
import prettier from 'prettier';
import babel from 'prettier/parser-babel';

export type Props = {
    state: State;
    // dragSelect: boolean;
    // cancelDragSelect: () => void;
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
    setHover: (hover: Hover | null) => void;
    ppi?: number;
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

export const calcPPI = (ppi: number, pixels: number, zoom: number) => {
    return `${(pixels / ppi).toFixed(3)}in`;
};

export const evaluateBetween = (
    left: TimelinePoint,
    right: TimelinePoint,
    position: number,
) => {
    const percent = (position - left.pos.x) / (right.pos.x - left.pos.x);
    // TODO splines
    return percent * (right.pos.y - left.pos.y) + left.pos.y;
};

export const evaluateTimeline = (timeline: FloatTimeline, position: number) => {
    if (!timeline.points.length) {
        return (
            (timeline.range[1] - timeline.range[0]) * position +
            timeline.range[0]
        );
    }
    let y = null;
    for (let i = 0; i < timeline.points.length; i++) {
        if (position < timeline.points[i].pos.x) {
            y = evaluateBetween(
                i === 0 ? { pos: { x: 0, y: 0 } } : timeline.points[i - 1],
                timeline.points[i],
                position,
            );
            break;
        }
    }
    if (y == null) {
        y = evaluateBetween(
            timeline.points[timeline.points.length - 1],
            { pos: { x: 1, y: 1 } },
            position,
        );
    }
    return y * (timeline.range[1] - timeline.range[0]) + timeline.range[0];
};

export const evaluateAnimatedValues = (
    animations: Animations,
    position: number,
) => {
    const values: { [key: string]: number } = {};
    Object.keys(animations.timeline).forEach((vbl) => {
        const t = animations.timeline[vbl];
        if (t.type === 'float') {
            values[vbl] = evaluateTimeline(t, position);
        } else {
            values[vbl] = 0;
        }
    });
    return values;
};

export const Canvas = ({
    state,
    width,
    height,
    dispatch,
    innerRef,
    hover,
    setHover,
    pendingMirror,
    setPendingMirror,
    // dragSelect,
    isTouchScreen,
    // cancelDragSelect,
    ppi,
}: Props) => {
    const mirrorTransforms = React.useMemo(
        () => getMirrorTransforms(state.mirrors),
        [state.mirrors],
    );
    const [tmpView, setTmpView] = React.useState(null as null | View);

    const [animationPosition, setAnimationPosition] = React.useState(0);

    const currentAnimatedValues = evaluateAnimatedValues(
        state.animations,
        animationPosition,
    );

    const [pos, setPos] = React.useState({ x: 0, y: 0 });

    const currentState = React.useRef(state);
    currentState.current = state;

    usePalettePreload(state);

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

    const [styleOpen, setStyleOpen] = React.useState(false);
    React.useEffect(() => {
        setStyleOpen(false);
    }, [state.selection != null]);

    const finishDrag = React.useCallback((shiftKey: boolean) => {
        setDragSelecting(false);
        // cancelDragSelect();
        const { pos, drag } = currentDrag.current;
        if (!drag) {
            return;
        }
        const rect = rectForCorners(pos, drag);
        const selected = findSelection(
            currentState.current.paths,
            currentState.current.pathGroups,
            rect,
        );
        if (
            (shiftKey || multiRef.current) &&
            currentState.current.selection?.type === 'Path'
        ) {
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

    const dragSelectHandlers = useDragSelect(
        dragSelectPos,
        width,
        height,
        view,
        setPos,
        setDragSelect,
        finishDrag,
    );
    const mouseDragHandlers = useMouseDrag(
        dragPos,
        setTmpView,
        width,
        height,
        view,
        setPos,
        setDragPos,
    );

    const [isDragSelecting, setDragSelecting] = React.useState(false);

    const mouseHandlers = isDragSelecting
        ? dragSelectHandlers
        : mouseDragHandlers;

    const [multiSelect, setMultiSelect] = React.useState(false);
    const multiRef = useCurrent(multiSelect);

    React.useEffect(() => {
        if (!state.selection && multiRef.current) {
            setMultiSelect(false);
        }
    }, [!!state.selection]);

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

    const [styleHover, setStyleHover] = React.useState(
        null as null | StyleHover,
    );

    const selectedIds = React.useMemo(() => {
        const selectedIds: { [key: string]: boolean } = {};
        if (state.selection?.type === 'Path') {
            state.selection.ids.forEach((id) => (selectedIds[id] = true));
        } else if (state.selection?.type === 'PathGroup') {
            Object.keys(state.paths).forEach((id) => {
                if (state.selection!.ids.includes(state.paths[id].group!)) {
                    selectedIds[id] = true;
                }
            });
        }
        return selectedIds;
    }, [state.selection, state.paths]);

    const scripts = React.useMemo(() => {
        return Object.keys(state.animations.scripts)
            .filter((k) => state.animations.scripts[k].enabled)
            .map((key) => {
                const script = state.animations.scripts[key];
                const line = script.code.match(
                    /\s*\(((\s*\w+\s*,)+(\s*\w+)?\s*)\)\s*=>/,
                );
                console.log(line);
                if (!line) {
                    console.log(`No match`);
                    return null;
                }
                const args = line![1]
                    .split(',')
                    .map((m) => m.trim())
                    .filter(Boolean);
                if (args[0] !== 'paths') {
                    console.log('bad args', args);
                    return null;
                }
                const builtins: any = { dist: dist, segmentsBounds };
                try {
                    const fn = new Function(
                        Object.keys(builtins).join(','),
                        'return ' + script.code,
                    )(...Object.keys(builtins).map((k) => builtins[k]));
                    return {
                        key,
                        fn,
                        args: args.slice(1),
                        phase: script.phase,
                    };
                } catch (err) {
                    console.log('Bad fn');
                    console.error(err);
                    return null;
                }
            })
            .filter(Boolean);
    }, [state.animations]);
    // console.log('ok scripts', scripts, state.animations.scripts);

    const animatedPaths = React.useMemo(() => {
        if (!scripts.length) {
            return state.paths;
        }
        const paths = { ...state.paths };
        scripts.forEach((script) => {
            const args = [
                paths,
                ...script!.args.map((arg) => currentAnimatedValues[arg] || 0),
            ];
            // console.log(
            //     'scripts!',
            //     script!.key,
            //     args,
            //     currentAnimatedValues,
            //     script!.args,
            // );
            try {
                script!.fn.apply(null, args);
            } catch (err) {
                console.error(err);
                console.log(`Bad fn invocation`, script!.key);
            }
        });
        // console.log('pathd', paths);
        return paths;
    }, [state.paths, state.pathGroups, scripts, currentAnimatedValues]);

    let pathsToShow = React.useMemo(
        () =>
            sortedVisibleInsetPaths(
                animatedPaths,
                state.pathGroups,
                clip,
                state.view.hideDuplicatePaths,
                state.view.laserCutMode
                    ? state.palettes[state.activePalette]
                    : undefined,
                // styleHover ?? undefined,
                undefined,
                selectedIds,
            ),
        [
            animatedPaths,
            state.pathGroups,
            clip,
            state.view.hideDuplicatePaths,
            state.view.laserCutMode,
            // styleHover,
            selectedIds,
        ],
    );
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

    // Ok, so what I want is:
    // while dragging, freeze the bounds.
    const bounds = React.useMemo(
        () => calculateBounds(width, height, view),
        [width, height, dragPos ? null : view],
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

    const inner = (
        <svg
            width={ppi != null ? calcPPI(ppi, width, view.zoom) : width}
            height={ppi != null ? calcPPI(ppi, height, view.zoom) : height}
            viewBox={`0 0 ${width} ${height}`}
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
                        zoom={view.zoom}
                        sketchiness={view.sketchiness}
                        palette={state.palettes[state.activePalette]}
                        styleHover={selectedIds[path.id] ? styleHover : null}
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

                {maybeReverse(view.guides, hover?.type === 'guides') ? (
                    <Guides
                        state={state}
                        bounds={bounds}
                        isTouchScreen={isTouchScreen}
                        dispatch={dispatch}
                        width={width}
                        height={height}
                        allIntersections={allIntersections}
                        guidePrimitives={guidePrimitives}
                        zooming={zooming}
                        view={view}
                        disableGuides={!!pendingMirror}
                        pos={isTouchScreen ? scale(view.center, -1) : pos}
                        pendingPath={pendingPath}
                        mirrorTransforms={mirrorTransforms}
                        pendingMirror={pendingMirror}
                        setPendingMirror={setPendingMirror}
                        hover={hover}
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
                              { kind: 'Path', id, type: 'element' },
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
                        width={Math.abs(dragSelectPos.x - pos.x) * view.zoom}
                        height={Math.abs(dragSelectPos.y - pos.y) * view.zoom}
                        fill="rgba(255,255,255,0.2)"
                        stroke="red"
                        strokeWidth="2"
                    />
                ) : null}
            </g>
        </svg>
    );

    const mirrorHover = React.useCallback(
        (k) =>
            k
                ? setHover({ kind: 'Mirror', id: k, type: 'element' })
                : setHover(null),
        [],
    );
    const mirrorAdd = React.useCallback(
        () =>
            setPendingMirror({
                parent: state.activeMirror,
                rotations: 3,
                reflect: true,
                center: null,
            }),
        [state.activeMirror],
    );

    // This is for rendering only, not interacting.
    if (ppi != null) {
        return inner;
    }

    const styleIds = idsToStyle(state);

    return (
        <div
            css={{
                position: 'relative',
            }}
            style={{ width, height }}
            onTouchEnd={(evt) => {
                if (
                    state.selection &&
                    !evt.shiftKey &&
                    evt.target instanceof SVGElement
                ) {
                    evt.preventDefault();
                }
            }}
            onClick={(evt) => {
                if (
                    state.selection &&
                    !evt.shiftKey &&
                    evt.target instanceof SVGElement
                ) {
                    dispatch({
                        type: 'selection:set',
                        selection: null,
                    });
                }
            }}
        >
            {inner}
            {view.texture ? (
                <RenderWebGL
                    state={state}
                    texture={view.texture}
                    width={width}
                    height={height}
                />
            ) : null}
            {tmpView ? (
                <div
                    css={{
                        position: 'absolute',
                        padding: 20,
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        color: 'black',
                        top: 58,
                        left: 0,
                    }}
                    onClick={() => setTmpView(null)}
                >
                    Reset zoom
                    {` ${pos.x.toFixed(4)},${pos.y.toFixed(4)}`}
                </div>
            ) : null}
            <MirrorMenu
                onHover={mirrorHover}
                onAdd={mirrorAdd}
                state={state}
                dispatch={dispatch}
                transforms={mirrorTransforms}
            />
            <OverlayMenu
                state={state}
                dispatch={dispatch}
                setHover={setHover}
            />
            <ClipMenu
                state={state}
                pendingPath={pendingPath}
                dispatch={dispatch}
                // setHover={setHover}
            />

            <div
                css={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    overflow: 'auto',
                }}
                onClick={(evt) => evt.stopPropagation()}
            >
                {styleIds.length && styleOpen ? (
                    <div
                        css={{
                            backgroundColor: 'rgba(0,0,0,0.8)',
                        }}
                    >
                        <MultiStyleForm
                            palette={state.palettes[state.activePalette]}
                            styles={styleIds.map((k) => state.paths[k].style)}
                            onHover={(hover) => {
                                setStyleHover(hover);
                            }}
                            onChange={(styles) => {
                                const changed: {
                                    [key: string]: Path;
                                } = {};
                                styles.forEach((style, i) => {
                                    if (style != null) {
                                        const id = styleIds[i];
                                        changed[id] = {
                                            ...state.paths[id],
                                            style,
                                        };
                                    }
                                });
                                dispatch({
                                    type: 'path:update:many',
                                    changed,
                                });
                            }}
                        />
                    </div>
                ) : null}
                {pendingMirror ? (
                    mirrorControls(setPendingMirror, pendingMirror)
                ) : state.selection ? (
                    selectionSection(
                        dispatch,
                        isDragSelecting,
                        setDragSelecting,
                        styleIds,
                        setStyleOpen,
                        styleOpen,
                        state,
                        setMultiSelect,
                        multiSelect,
                    )
                ) : (
                    <GuideSection
                        state={state}
                        dispatch={dispatch}
                        setDragSelect={setDragSelecting}
                        dragSelect={isDragSelecting}
                        setHover={setHover}
                    />
                )}
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
            <div
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 400,
                }}
            >
                {Object.keys(state.animations.scripts).map((key) => {
                    return (
                        <div>
                            {key}

                            <Text
                                key={key}
                                multiline
                                value={state.animations.scripts[key].code}
                                onChange={(code) => {
                                    const formatted = prettier.format(code, {
                                        plugins: [babel],
                                    });
                                    dispatch({
                                        type: 'script:update',
                                        key,
                                        script: {
                                            ...state.animations.scripts[key],
                                            code: formatted,
                                        },
                                    });
                                }}
                            />
                        </div>
                    );
                })}
                <button
                    onClick={() => {
                        let i = 0;
                        while (state.animations.scripts[`script-${i}`]) {
                            i++;
                        }
                        const newKey = `script-${i}`;
                        dispatch({
                            type: 'script:update',
                            key: newKey,
                            script: {
                                code: `(paths) => {\n    // do stuff\n}`,
                                enabled: true,
                                phase: 'pre-inset',
                            },
                        });
                    }}
                >
                    Add script
                </button>
                <TickTock t={animationPosition} set={setAnimationPosition} />
            </div>
        </div>
    );
};

export const TickTock = ({
    t,
    set,
}: {
    t: number;
    set: (t: number) => void;
}) => {
    const [tick, setTick] = React.useState(null as number | null);
    React.useEffect(() => {
        if (!tick) {
            return;
        }
        let at = t;
        const id = setInterval(() => {
            at = (at + 0.05) % 1;
            set(at);
        }, tick);
        return () => clearInterval(id);
    }, [tick]);
    return (
        <div>
            {t.toFixed(2)}
            <BlurInt value={t} onChange={(t) => (t ? set(t) : null)} />
            <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={t + ''}
                onChange={(evt) => set(+evt.target.value)}
            />
            <button onClick={() => setTick(100)}>100ms</button>
            <button onClick={() => setTick(20)}>20ms</button>
            <button onClick={() => setTick(null)}>Clear tick</button>
        </div>
    );
};

export const maybeReverse = (v: boolean, reverse: boolean) =>
    reverse ? !v : v;

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

export const ClipMenu = ({
    state,
    dispatch,
    pendingPath: [pendingPath, setPendingPath],
}: {
    state: State;
    dispatch: (action: Action) => void;
    pendingPath: PendingPathPair;
}) => {
    return (
        <div
            css={{
                position: 'absolute',
                left: 58 * 2,
                top: 0,
            }}
        >
            <IconButton
                selected={pendingPath?.isClip}
                onClick={() =>
                    setPendingPath((p) => (p ? { ...p, isClip: !p.isClip } : p))
                }
            >
                <ScissorsCuttingIcon />
            </IconButton>
        </div>
    );
};
