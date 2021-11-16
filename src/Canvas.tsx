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
import { useMouseDrag } from './useMouseDrag';
import { useScrollWheel } from './useScrollWheel';

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

    const [pos, setPos] = React.useState({ x: 0, y: 0 });

    const currentState = React.useRef(state);
    currentState.current = state;

    usePalettePreload(state);

    const [tmpView, setTmpView] = React.useState(null as null | View);

    let view = tmpView ?? state.view;
    view = { ...state.view, center: view.center, zoom: view.zoom };

    const { x, y } = viewPos(view, width, height);

    const ref = React.useRef(null as null | SVGSVGElement);

    useScrollWheel(ref, setTmpView, currentState, width, height);

    const [dragPos, setDragPos] = React.useState(
        null as null | { view: View; coord: Coord },
    );

    const mouseHandlers = useMouseDrag(
        dragPos,
        setTmpView,
        width,
        height,
        view,
        setPos,
        setDragPos,
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
