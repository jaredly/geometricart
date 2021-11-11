/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { primitiveKey, calcAllIntersections } from './calcAllIntersections';
import {
    calculateGuideElements,
    calculateInactiveGuideElements,
    geomsForGiude,
} from './calculateGuideElements';
import { DrawPath } from './DrawPath';
import { dedupString, findNextSegments } from './findNextSegments';
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
    GuideElement,
    Id,
    Intersect,
    Line,
    Pending,
    State,
    Style,
    View,
} from './types';

export type Props = {
    state: State;
    width: number;
    height: number;
    innerRef: (node: SVGSVGElement) => unknown;
    dispatch: (action: Action) => unknown;
    hover: Hover | null;
};

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

    const [pathOrigin, setPathOrigin] = React.useState(
        null as null | Intersect,
    );

    const [shiftKey, setShiftKey] = React.useState(false);

    React.useEffect(() => {
        // if (!pathOrigin) {
        //     return;
        // }
        const fn = (evt: KeyboardEvent) => {
            if (evt.key === 'Shift') {
                setShiftKey(true);
            }
            if (pathOrigin && evt.key === 'Escape') {
                setPathOrigin(null);
                evt.stopPropagation();
            }
        };
        const up = (evt: KeyboardEvent) => {
            if (evt.key === 'Shift') {
                setShiftKey(false);
            }
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

    // const nextSegments = React.useMemo(() => {
    //     if (state.pending && state.pending.type === 'Path') {
    //         return findNextSegments(
    //             state.pending as PendingPath,
    //             guidePrimitives,
    //             allIntersections,
    //         );
    //     }
    //     return null;
    // }, [
    //     state.pending && state.pending.type === 'Path' ? state.pending : null,
    //     allIntersections,
    //     guidePrimitives,
    // ]);
    // const onAdd = React.useCallback((segment: PendingSegment) => {
    //     dispatch({ type: 'path:add', segment });
    // }, []);

    const x = state.view.center.x * state.view.zoom + width / 2;
    const y = state.view.center.y * state.view.zoom + height / 2;

    return (
        <div
            css={{}}
            // style={{ width, height }}
        >
            <svg
                width={width}
                height={height}
                xmlns="http://www.w3.org/2000/svg"
                ref={innerRef}
                css={{
                    outline: '1px solid magenta',
                }}
                onMouseMove={(evt) => {
                    const rect = evt.currentTarget.getBoundingClientRect();
                    setPos({
                        x: (evt.clientX - rect.left - x) / state.view.zoom,
                        y: (evt.clientY - rect.top - y) / state.view.zoom,
                    });
                }}
            >
                <g transform={`translate(${x} ${y})`}>
                    {Object.keys(state.paths)
                        .filter((k) => !state.paths[k].hidden)
                        .map((k) => (
                            <RenderPath
                                key={k}
                                groups={state.pathGroups}
                                path={state.paths[k]}
                                zoom={state.view.zoom}
                                palette={state.palettes[state.activePalette]}
                                onClick={
                                    pathOrigin
                                        ? undefined
                                        : () => {
                                              const path = state.paths[k];
                                              if (
                                                  path.group &&
                                                  !(
                                                      state.selection?.type ===
                                                          'PathGroup' &&
                                                      state.selection.ids.includes(
                                                          path.group,
                                                      )
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
                                                          ids: [k],
                                                      },
                                                  });
                                              }
                                          }
                                }
                            />
                        ))}
                    {state.view.guides ? (
                        <>
                            <RenderPrimitives
                                primitives={inativeGuidePrimitives}
                                zoom={state.view.zoom}
                                width={width}
                                height={height}
                                inactive
                                onClick={
                                    pathOrigin
                                        ? undefined
                                        : (guides, shift) => {
                                              if (shift) {
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
                                zoom={state.view.zoom}
                                width={width}
                                height={height}
                                onClick={
                                    pathOrigin
                                        ? undefined
                                        : (guides, shift) => {
                                              if (shift) {
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
                                    zoom={state.view.zoom}
                                    intersections={allIntersections}
                                    onClick={onClickIntersection}
                                />
                            ) : null}
                            {state.pending && state.pending.type === 'Guide' ? (
                                <RenderPendingGuide
                                    guide={state.pending}
                                    pos={pos}
                                    zoom={state.view.zoom}
                                    shiftKey={shiftKey}
                                />
                            ) : null}
                            {pathOrigin ? (
                                <DrawPath
                                    palette={
                                        state.palettes[state.activePalette]
                                    }
                                    zoom={state.view.zoom}
                                    origin={pathOrigin}
                                    primitives={guidePrimitives}
                                    intersections={allIntersections}
                                    onComplete={(parts) => {
                                        // TODO:
                                        dispatch({
                                            type: 'path:create',
                                            segments: parts.map(
                                                (s) => s.segment,
                                            ),
                                            origin: pathOrigin.coord,
                                        });
                                        setPathOrigin(null);
                                    }}
                                />
                            ) : null}
                            {Object.keys(state.mirrors).map((m) =>
                                m === state.activeMirror ? (
                                    <RenderMirror
                                        key={m}
                                        mirror={state.mirrors[m]}
                                        transforms={mirrorTransforms[m]}
                                        zoom={state.view.zoom}
                                    />
                                ) : null,
                            )}
                        </>
                    ) : null}
                    {hover ? (
                        <>
                            {hover.kind !== 'Path' &&
                            hover.kind !== 'PathGroup' ? (
                                <rect
                                    x={-width}
                                    y={-height}
                                    width={width * 2}
                                    height={height * 2}
                                    fill="rgba(0,0,0,0.4)"
                                />
                            ) : null}
                            {showHover(
                                hover,
                                state,
                                mirrorTransforms,
                                width,
                                height,
                                state.palettes[state.activePalette],
                            )}
                        </>
                    ) : null}
                </g>
            </svg>
            <div>
                Guides: {guideElements.length}, Points:{' '}
                {allIntersections.length}
            </div>
        </div>
    );
};

export const showHover = (
    hover: Hover,
    state: State,
    mirrorTransforms: { [key: string]: Array<Array<Matrix>> },
    height: number,
    width: number,
    palette: Array<string>,
) => {
    switch (hover.kind) {
        case 'PathGroup': {
            return (
                <>
                    {Object.keys(state.paths)
                        .filter((k) => state.paths[k].group === hover.id)
                        .map((k) => (
                            <UnderlinePath
                                key={k}
                                path={state.paths[k]}
                                zoom={state.view.zoom}
                                color="rgba(255,255,255,0.5)"
                            />
                        ))}
                    {Object.keys(state.paths)
                        .filter((k) => state.paths[k].group === hover.id)
                        .map((k) => (
                            <RenderPath
                                key={k}
                                groups={state.pathGroups}
                                path={state.paths[k]}
                                zoom={state.view.zoom}
                                palette={palette}
                            />
                        ))}
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
                        zoom={state.view.zoom}
                        height={height}
                        width={width}
                        key={`${j}:${i}`}
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
function primitivesForElements(
    guideElements: import('/Users/jared/clone/art/geometricart/src/calculateGuideElements').GuideElement[],
) {
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
