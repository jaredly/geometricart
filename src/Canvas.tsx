/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { useCurrent } from './App';
import { primitiveKey, calcAllIntersections } from './calcAllIntersections';
import {
    calculateGuideElements,
    calculateInactiveGuideElements,
    geomsForGiude,
} from './calculateGuideElements';
import { DrawPath } from './DrawPath';
// import { DrawPath } from './DrawPathOld';
import { dedupString } from './findNextSegments';
import { getMirrorTransforms, Matrix } from './getMirrorTransforms';
import { Primitive } from './intersect';
import { geomToPrimitives } from './points';
import { RenderIntersections } from './RenderIntersections';
import { RenderMirror } from './RenderMirror';
import { RenderPath, UnderlinePath } from './RenderPath';
import { RenderPendingGuide } from './RenderPendingGuide';
import { RenderPrimitive } from './RenderPrimitive';
import { Hover } from './Sidebar';
import {
    Action,
    Coord,
    GuideElement,
    Id,
    Intersect,
    Line,
    Path,
    Pending,
    PendingSegment,
    State,
    Style,
    View,
} from './types';

export type Props = {
    state: State;
    width: number;
    height: number;
    innerRef: (node: SVGSVGElement | null) => unknown;
    dispatch: (action: Action) => unknown;
    hover: Hover | null;
};

export const worldToScreen = (
    width: number,
    height: number,
    pos: Coord,
    view: View,
) => ({
    x: width / 2 + (pos.x - view.center.x) * view.zoom,
    y: height / 2 + (pos.y - view.center.y) * view.zoom,
});
export const screenToWorld = (
    width: number,
    height: number,
    pos: Coord,
    view: View,
) => ({
    x: (pos.x - width / 2) / view.zoom + view.center.x,
    y: (pos.y - height / 2) / view.zoom + view.center.y,
});

// base64
export const imageCache: { [href: string]: string | false } = {};

export const Canvas = ({
    state,
    width,
    height,
    dispatch,
    innerRef,
    hover,
}: Props) => {
    const mirrorTransforms = React.useMemo(
        () => getMirrorTransforms(state.mirrors),
        [state.mirrors],
    );
    const guideElements = React.useMemo(
        () => calculateGuideElements(state.guides, mirrorTransforms),
        [state.guides, mirrorTransforms],
    );
    const inativeGuideElements = React.useMemo(
        () => calculateInactiveGuideElements(state.guides, mirrorTransforms),
        [state.guides, mirrorTransforms],
    );
    // console.log(guideElements);

    const guidePrimitives = React.useMemo(() => {
        return primitivesForElements(guideElements);
    }, [guideElements]);

    const inativeGuidePrimitives = React.useMemo(() => {
        return primitivesForElements(inativeGuideElements);
    }, [inativeGuideElements]);

    const allIntersections = React.useMemo(
        () => calcAllIntersections(guidePrimitives.map((p) => p.prim)),
        [guidePrimitives],
    );

    const [pos, setPos] = React.useState({ x: 0, y: 0 });

    const currentState = React.useRef(state);
    currentState.current = state;

    const currentPos = useCurrent(pos);

    const [pathOrigin, setPathOrigin] = React.useState(
        null as null | Intersect,
    );

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

    // const [zoomKey, setZoomKey] = React.useState(
    //     null as null | { pos: Coord; level: number },
    // );

    const [shiftKey, setShiftKey] = React.useState(false as false | Coord);

    const [altKey, setAltKey] = React.useState(false);

    // const currentZoom = useCurrent(zoomKey);

    React.useEffect(() => {
        const fn = (evt: KeyboardEvent) => {
            if (evt.target !== document.body || evt.metaKey || evt.ctrlKey) {
                return;
            }
            if (evt.key === 'Alt') {
                setAltKey(true);
            }
            // if (evt.key === 'z' && currentZoom.current == null) {
            //     setZoomKey({ level: 1, pos: currentPos.current });
            // }
            // if (evt.key === 'Z' && currentZoom.current == null) {
            //     setZoomKey({ level: 2, pos: currentPos.current });
            // }
            // console.l;
            if (evt.key === 'Shift') {
                // if (currentZoom.current != null) {
                //     setZoomKey({ level: 2, pos: currentZoom.current.pos });
                // }
                setShiftKey(currentPos.current);
            }
            if (pathOrigin && evt.key === 'Escape') {
                setPathOrigin(null);
                evt.stopPropagation();
            }
        };
        const up = (evt: KeyboardEvent) => {
            if (evt.key === 'Alt') {
                setAltKey(false);
            }
            if (evt.key === 'Shift') {
                // if (currentZoom.current != null) {
                //     setZoomKey({ level: 1, pos: currentZoom.current.pos });
                // }
                setShiftKey(false);
                // TODO folks
            }
            // if (evt.key === 'z' || evt.key === 'Z') {
            //     setZoomKey(null);
            // }
        };
        document.addEventListener('keydown', fn);
        document.addEventListener('keyup', up);
        return () => {
            document.removeEventListener('keydown', fn);
            document.removeEventListener('keyup', up);
        };
    }, [!!pathOrigin]);

    const onClickIntersection = React.useCallback(
        (coord: Intersect, shiftKey: boolean) => {
            const state = currentState.current;
            if (!state.pending) {
                setPathOrigin(coord);
                // dispatch({ type: 'path:point', coord });
            }
            if (state.pending && state.pending.type === 'Guide') {
                dispatch({
                    type: 'pending:point',
                    coord: coord.coord,
                    shiftKey,
                });
            }
        },
        [],
    );

    const [tmpView, setTmpView] = React.useState(null as null | View);

    let view = tmpView ?? state.view;
    view = { ...state.view, center: view.center, zoom: view.zoom };

    // if (zoomKey) {

    //     const screenPos = worldToScreen(width, height, zoomKey.pos, view);
    //     const amount = zoomKey.level === 2 ? 12 : 4;
    //     const newZoom = view.zoom * amount;
    //     const newPos = screenToWorld(width, height, screenPos, { ...view, zoom: newZoom });
    //     view = {
    //         ...view,
    //         zoom: newZoom,
    //         center: {
    //             x: view.center.x + (newPos.x - zoomKey.pos.x),
    //             y: view.center.y + (newPos.y - zoomKey.pos.y),
    //         },
    //     };
    // }

    const x = view.center.x * view.zoom + width / 2;
    const y = view.center.y * view.zoom + height / 2;

    const onCompletePath = React.useCallback(
        (parts: Array<PendingSegment>) => {
            if (!pathOrigin) {
                return;
            }
            // TODO:
            dispatch({
                type: 'path:create',
                segments: parts.map((s) => s.segment),
                origin: pathOrigin.coord,
            });
            setPathOrigin(null);
        },
        [pathOrigin],
    );

    // When intersections change, cancel pending stuffs
    React.useEffect(() => {
        setPathOrigin(null);
    }, [allIntersections]);

    const ref = React.useRef(null as null | SVGSVGElement);

    React.useEffect(() => {
        if (!ref.current) {
            return console.warn('NO REF');
        }
        const fn = (evt: WheelEvent) => {
            const rect = ref.current!.getBoundingClientRect();
            const clientX = evt.clientX;
            const clientY = evt.clientY;
            const dy = -evt.deltaY;
            evt.preventDefault();

            setTmpView((past) => {
                let view = past || currentState.current.view;

                const screenPos = {
                    x: clientX - rect.left,
                    y: clientY - rect.top,
                };

                const pos = screenToWorld(width, height, screenPos, view);

                const amount = dy / 100 + 1.0;
                const newZoom = Math.min(
                    Math.max(view.zoom * amount, 10),
                    10000,
                );
                const newPos = screenToWorld(width, height, screenPos, {
                    ...view,
                    zoom: newZoom,
                });
                return {
                    ...view,
                    zoom: newZoom,
                    center: {
                        x: view.center.x + (newPos.x - pos.x),
                        y: view.center.y + (newPos.y - pos.y),
                    },
                };
            });
        };
        ref.current!.addEventListener('wheel', fn, { passive: false });
        return () => ref.current!.removeEventListener('wheel', fn);
    }, []);

    const [dragPos, setDragPos] = React.useState(
        null as null | { view: View; coord: Coord },
    );

    return (
        <div
            css={{
                position: 'relative',
            }}
            // style={{ width, height }}
            onClick={(evt) => {
                // if (evt.target === evt.currentTarget) {
                if (state.selection) {
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
                onMouseMove={(evt) => {
                    if (dragPos) {
                        const rect = evt.currentTarget.getBoundingClientRect();
                        const clientX = evt.clientX;
                        const clientY = evt.clientY;
                        evt.preventDefault();

                        setTmpView((prev) => {
                            return dragView(
                                prev,
                                dragPos,
                                clientX,
                                rect,
                                clientY,
                                width,
                                height,
                            );
                        });
                    } else {
                        const rect = evt.currentTarget.getBoundingClientRect();
                        const pos = {
                            x: (evt.clientX - rect.left - x) / view.zoom,
                            y: (evt.clientY - rect.top - y) / view.zoom,
                        };
                        setPos(pos);
                    }
                }}
                onMouseUpCapture={(evt) => {
                    if (dragPos) {
                        setDragPos(null);
                        evt.preventDefault();
                    }
                }}
                onMouseDown={(evt) => {
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
                    setDragPos({
                        coord: coord,
                        view,
                    });
                }}
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
                                // viewBox="0 0 1000 1000"
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
                {view.background ? (
                    <rect
                        width={width}
                        height={height}
                        x={0}
                        y={0}
                        stroke="none"
                        fill={view.background}
                        // fill="url(#leaves)"
                    />
                ) : null}
                <g transform={`translate(${x} ${y})`}>
                    {sortedVisiblePaths(state).map((k) => (
                        <RenderPath
                            key={k}
                            groups={state.pathGroups}
                            path={state.paths[k]}
                            zoom={view.zoom}
                            palette={state.palettes[state.activePalette]}
                            onClick={
                                pathOrigin
                                    ? undefined
                                    : (evt) => {
                                          evt.stopPropagation();
                                          const path = state.paths[k];
                                          handleSelection(
                                              path,
                                              state,
                                              dispatch,
                                              evt.shiftKey,
                                          );
                                      }
                            }
                        />
                    ))}
                    {view.guides ? (
                        <>
                            <RenderPrimitives
                                primitives={inativeGuidePrimitives}
                                zoom={view.zoom}
                                width={width}
                                height={height}
                                inactive
                                onClick={
                                    pathOrigin
                                        ? undefined
                                        : (guides, shift) => {
                                              if (!shift) {
                                                  dispatch({
                                                      type: 'tab:set',
                                                      tab: 'Guides',
                                                  });
                                                  dispatch({
                                                      type: 'selection:set',
                                                      selection: {
                                                          type: 'Guide',
                                                          ids: dedupString(
                                                              guides,
                                                          ),
                                                      },
                                                  });
                                                  return;
                                              }
                                              console.log(guides, 'click');
                                              const seen: {
                                                  [key: string]: true;
                                              } = {};
                                              // ok
                                              guides.forEach((guide) => {
                                                  if (seen[guide]) {
                                                      return;
                                                  }
                                                  seen[guide] = true;
                                                  dispatch({
                                                      type: 'guide:toggle',
                                                      id: guide,
                                                  });
                                              });
                                          }
                                }
                            />
                            <RenderPrimitives
                                primitives={guidePrimitives}
                                zoom={view.zoom}
                                width={width}
                                height={height}
                                onClick={
                                    pathOrigin
                                        ? undefined
                                        : (guides, shift) => {
                                              if (!shift) {
                                                  dispatch({
                                                      type: 'tab:set',
                                                      tab: 'Guides',
                                                  });
                                                  dispatch({
                                                      type: 'selection:set',
                                                      selection: {
                                                          type: 'Guide',
                                                          ids: dedupString(
                                                              guides,
                                                          ),
                                                      },
                                                  });
                                                  return;
                                              }
                                              console.log(guides, 'click');
                                              const seen: {
                                                  [key: string]: true;
                                              } = {};
                                              // ok
                                              guides.forEach((guide) => {
                                                  if (seen[guide]) {
                                                      return;
                                                  }
                                                  seen[guide] = true;
                                                  dispatch({
                                                      type: 'guide:toggle',
                                                      id: guide,
                                                  });
                                              });
                                          }
                                }
                            />
                            {!pathOrigin ? (
                                <RenderIntersections
                                    zoom={view.zoom}
                                    intersections={allIntersections}
                                    onClick={onClickIntersection}
                                />
                            ) : null}
                            {state.pending && state.pending.type === 'Guide' ? (
                                <RenderPendingGuide
                                    guide={state.pending}
                                    pos={pos}
                                    zoom={view.zoom}
                                    shiftKey={!!shiftKey}
                                />
                            ) : null}
                            {pathOrigin ? (
                                <DrawPath
                                    palette={
                                        state.palettes[state.activePalette]
                                    }
                                    mirror={
                                        state.activeMirror
                                            ? mirrorTransforms[
                                                  state.activeMirror
                                              ]
                                            : null
                                    }
                                    zoom={view.zoom}
                                    origin={pathOrigin}
                                    primitives={guidePrimitives}
                                    intersections={allIntersections}
                                    onComplete={onCompletePath}
                                />
                            ) : null}
                            {Object.keys(state.mirrors).map((m) =>
                                hover?.kind === 'Mirror' && hover.id === m ? (
                                    <RenderMirror
                                        key={m}
                                        mirror={state.mirrors[m]}
                                        transforms={mirrorTransforms[m]}
                                        zoom={view.zoom}
                                    />
                                ) : null,
                            )}
                        </>
                    ) : null}
                    {state.selection
                        ? state.selection.ids.map((id) =>
                              showHover(
                                  id,
                                  { kind: state.selection!.type, id },
                                  state,
                                  mirrorTransforms,
                                  width,
                                  height,
                                  state.palettes[state.activePalette],
                                  view.zoom,
                                  true,
                              ),
                          )
                        : null}
                    {hover ? (
                        <>
                            {/* {hover.kind !== 'Path' &&
                            hover.kind !== 'Guide'
                            hover.kind !== 'PathGroup' ? (
                                <rect
                                    x={-width}
                                    y={-height}
                                    width={width * 2}
                                    height={height * 2}
                                    fill="rgba(0,0,0,0.4)"
                                />
                            ) : null} */}
                            {showHover(
                                `hover`,
                                hover,
                                state,
                                mirrorTransforms,
                                width,
                                height,
                                state.palettes[state.activePalette],
                                view.zoom,
                                false,
                            )}
                        </>
                    ) : null}
                </g>
            </svg>
            <div>
                Guides: {guideElements.length}, Points:{' '}
                {allIntersections.length}
            </div>
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
                </div>
            ) : null}
        </div>
    );
};

export const showHover = (
    key: string,
    hover: Hover,
    state: State,
    mirrorTransforms: { [key: string]: Array<Array<Matrix>> },
    height: number,
    width: number,
    palette: Array<string>,
    zoom: number,
    selection: boolean,
) => {
    const color = selection ? 'blue' : 'magenta';
    switch (hover.kind) {
        case 'Path': {
            return (
                <UnderlinePath
                    path={state.paths[hover.id]}
                    zoom={zoom}
                    color={color}
                    key={key}
                />
            );
        }
        case 'PathGroup': {
            return (
                <>
                    {Object.keys(state.paths)
                        .filter((k) => state.paths[k].group === hover.id)
                        .map((k, i) => (
                            <UnderlinePath
                                key={key + ':' + k}
                                path={state.paths[k]}
                                zoom={zoom}
                                color={color}
                            />
                        ))}
                    {/* {Object.keys(state.paths)
                        .filter((k) => state.paths[k].group === hover.id)
                        .map((k) => (
                            <RenderPath
                                key={k}
                                groups={state.pathGroups}
                                path={state.paths[k]}
                                zoom={state.view.zoom}
                                palette={palette}
                            />
                        ))} */}
                </>
            );
        }
        case 'Guide': {
            return geomsForGiude(
                state.guides[hover.id],
                state.guides[hover.id].mirror
                    ? mirrorTransforms[state.guides[hover.id].mirror!]
                    : null,
            ).map((geom, j) =>
                geomToPrimitives(geom.geom).map((prim, i) => (
                    <RenderPrimitive
                        prim={prim}
                        strokeWidth={4}
                        color={
                            state.guides[hover.id].active
                                ? '#ccc'
                                : 'rgba(102,102,102,0.5)'
                        }
                        zoom={zoom}
                        height={height}
                        width={width}
                        key={`${key}:${j}:${i}`}
                    />
                )),
            );
        }
    }
};

export const combineStyles = (styles: Array<Style>): Style => {
    const result: Style = {
        fills: [],
        lines: [],
    };
    styles.forEach((style) => {
        style.fills.forEach((fill, i) => {
            if (fill != null) {
                result.fills[i] =
                    fill === false
                        ? fill
                        : {
                              ...result.fills[i],
                              ...fill,
                          };
            }
        });
        style.lines.forEach((line, i) => {
            if (line != null) {
                result.lines[i] =
                    line === false
                        ? line
                        : {
                              ...result.lines[i],
                              ...line,
                          };
            }
        });
    });

    return result;
};

export const RenderPrimitives = React.memo(
    ({
        primitives,
        zoom,
        height,
        width,
        onClick,
        inactive,
    }: {
        zoom: number;
        height: number;
        width: number;
        primitives: Array<{ prim: Primitive; guides: Array<Id> }>;
        onClick?: (guides: Array<Id>, shift: boolean) => unknown;
        inactive?: boolean;
    }) => {
        // console.log(primitives);
        return (
            <>
                {primitives.map((prim, i) => (
                    <RenderPrimitive
                        prim={prim.prim}
                        zoom={zoom}
                        height={height}
                        width={width}
                        inactive={inactive}
                        onClick={
                            onClick
                                ? (evt: React.MouseEvent) => {
                                      evt.stopPropagation();
                                      onClick(prim.guides, evt.shiftKey);
                                  }
                                : undefined
                        }
                        key={i}
                    />
                ))}
            </>
        );
    },
);

const dragView = (
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

export function sortedVisiblePaths(state: State) {
    return Object.keys(state.paths)
        .filter(
            (k) =>
                !state.paths[k].hidden &&
                (!state.paths[k].group ||
                    !state.pathGroups[state.paths[k].group!].hide),
        )
        .sort((a, b) => {
            const oa = state.paths[a].group
                ? state.pathGroups[state.paths[a].group!].ordering
                : state.paths[a].ordering;
            const ob = state.paths[b].group
                ? state.pathGroups[state.paths[b].group!].ordering
                : state.paths[b].ordering;
            if (oa === ob) {
                return 0;
            }
            if (oa == null) {
                return 1;
            }
            if (ob == null) {
                return -1;
            }
            return ob - oa;
        });
}

export function primitivesForElements(guideElements: GuideElement[]) {
    const seen: { [key: string]: Array<Id> } = {};
    return ([] as Array<{ prim: Primitive; guide: Id }>)
        .concat(
            ...guideElements.map((el: GuideElement) =>
                geomToPrimitives(el.geom).map((prim) => ({
                    prim,
                    guide: el.id,
                })),
            ),
        )
        .map((prim) => {
            const k = primitiveKey(prim.prim);
            if (seen[k]) {
                seen[k].push(prim.guide);
                return null;
            }
            seen[k] = [prim.guide];
            return { prim: prim.prim, guides: seen[k] };
        })
        .filter(Boolean) as Array<{ prim: Primitive; guides: Array<Id> }>;
}

export const handleSelection = (
    path: Path,
    state: State,
    dispatch: (a: Action) => void,
    shiftKey: boolean,
) => {
    if (shiftKey && state.selection) {
        // ugh
        // I'll want to be able to select both paths
        // and pathgroups.
        // because what if this thing doesn't have a group
        // we're out of luck
        if (state.selection.type === 'PathGroup') {
            if (!path.group) {
                return; // ugh
            }
            if (state.selection.ids.includes(path.group)) {
                dispatch({
                    type: 'selection:set',
                    selection: {
                        type: 'PathGroup',
                        ids: state.selection.ids.filter(
                            (id) => id !== path.group,
                        ),
                    },
                });
            } else {
                dispatch({
                    type: 'selection:set',
                    selection: {
                        type: 'PathGroup',
                        ids: state.selection.ids.concat([path.group]),
                    },
                });
            }
        }
        if (state.selection.type === 'Path') {
            if (state.selection.ids.includes(path.id)) {
                dispatch({
                    type: 'selection:set',
                    selection: {
                        type: 'Path',
                        ids: state.selection.ids.filter((id) => id !== path.id),
                    },
                });
            } else {
                dispatch({
                    type: 'selection:set',
                    selection: {
                        type: 'Path',
                        ids: state.selection.ids.concat([path.id]),
                    },
                });
            }
        }
        return;
    }
    if (
        path.group &&
        !(
            state.selection?.type === 'PathGroup' &&
            state.selection.ids.includes(path.group)
        )
    ) {
        dispatch({
            type: 'tab:set',
            tab: 'PathGroups',
        });
        dispatch({
            type: 'selection:set',
            selection: {
                type: 'PathGroup',
                ids: [path.group],
            },
        });
    } else {
        dispatch({
            type: 'tab:set',
            tab: 'Paths',
        });
        dispatch({
            type: 'selection:set',
            selection: {
                type: 'Path',
                ids: [path.id],
            },
        });
    }
};
