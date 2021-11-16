/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { primitiveKey } from './calcAllIntersections';
import {
    calculateGuideElements,
    calculateInactiveGuideElements,
} from './calculateGuideElements';
// import { DrawPath } from './DrawPathOld';
import { getMirrorTransforms } from './getMirrorTransforms';
import { Guides } from './Guides';
import { handleSelection } from './handleSelection';
import { Primitive } from './intersect';
import { geomToPrimitives } from './points';
import { RenderPath } from './RenderPath';
import { showHover } from './showHover';
import { Hover } from './Sidebar';
import { Action, Coord, GuideElement, Id, State, Style, View } from './types';

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

    const [pos, setPos] = React.useState({ x: 0, y: 0 });

    const currentState = React.useRef(state);
    currentState.current = state;

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

    // const currentZoom = useCurrent(zoomKey);

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

    // const [altKey, setAltKey] = React.useState(false);

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
                                // TODO: Disable path clickies if we're doing guides, folks.
                                // pathOrigin
                                //     ? undefined :
                                (evt) => {
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
                        <Guides
                            state={state}
                            dispatch={dispatch}
                            width={width}
                            height={height}
                            view={view}
                            inativeGuidePrimitives={inativeGuidePrimitives}
                            guidePrimitives={guidePrimitives}
                            pos={pos}
                            mirrorTransforms={mirrorTransforms}
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
            {/* <div>
                Guides: {guideElements.length}, Points:{' '}
                {allIntersections.length}
            </div> */}
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
