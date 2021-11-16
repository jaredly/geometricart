/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { PendingMirror, useCurrent } from './App';
import { calcAllIntersections } from './calcAllIntersections';
import { DrawPath } from './DrawPath';
import { dedupString } from './findNextSegments';
import {
    angleTo,
    applyMatrices,
    dist,
    Matrix,
    mirrorTransforms,
    push,
    transformsToMatrices,
} from './getMirrorTransforms';
import { Primitive } from './intersect';
import { RenderIntersections } from './RenderIntersections';
import { RenderMirror } from './RenderMirror';
import { RenderPendingGuide } from './RenderPendingGuide';
import { Hover } from './Sidebar';
import {
    Action,
    Coord,
    Id,
    Intersect,
    PendingSegment,
    State,
    View,
} from './types';
import { RenderPrimitive } from './RenderPrimitive';
import { primitivesForElements } from './Canvas';
import {
    calculateGuideElements,
    calculateInactiveGuideElements,
} from './calculateGuideElements';

export const Guides = ({
    state,
    dispatch,
    width,
    height,
    view,
    pos,
    mirrorTransforms,
    hover,
    pendingMirror,
    setPendingMirror,
}: {
    state: State;
    dispatch: (action: Action) => void;
    width: number;
    height: number;
    view: View;
    hover: Hover | null;
    pos: Coord;
    mirrorTransforms: { [key: string]: Array<Array<Matrix>> };
    pendingMirror: PendingMirror | null;
    setPendingMirror: (
        mirror:
            | (PendingMirror | null)
            | ((mirror: PendingMirror | null) => PendingMirror | null),
    ) => void;
}) => {
    const guideElements = React.useMemo(
        () => calculateGuideElements(state.guides, mirrorTransforms),
        [state.guides, mirrorTransforms],
    );
    // console.log(guideElements);

    const guidePrimitives = React.useMemo(() => {
        return primitivesForElements(guideElements);
    }, [guideElements]);

    const inativeGuideElements = React.useMemo(
        () => calculateInactiveGuideElements(state.guides, mirrorTransforms),
        [state.guides, mirrorTransforms],
    );

    const inativeGuidePrimitives = React.useMemo(() => {
        return primitivesForElements(inativeGuideElements);
    }, [inativeGuideElements]);

    const currentState = React.useRef(state);
    currentState.current = state;

    const [shiftKey, setShiftKey] = React.useState(false as false | Coord);

    const currentPos = useCurrent(pos);

    const [pathOrigin, setPathOrigin] = React.useState(
        null as null | Intersect,
    );

    const currentPendingMirror = useCurrent(pendingMirror);

    React.useEffect(() => {
        const fn = (evt: KeyboardEvent) => {
            if (evt.target !== document.body || evt.metaKey || evt.ctrlKey) {
                return;
            }
            if (evt.key === 'ArrowUp' && currentPendingMirror.current) {
                setPendingMirror((mirror) =>
                    mirror
                        ? {
                              ...mirror,
                              rotations: mirror.rotations + 1,
                          }
                        : null,
                );
                evt.preventDefault();
                evt.stopPropagation();
                return;
            }
            if (evt.key === 'ArrowDown' && currentPendingMirror.current) {
                setPendingMirror((mirror) =>
                    mirror
                        ? {
                              ...mirror,
                              rotations: Math.max(1, mirror.rotations - 1),
                          }
                        : null,
                );
                evt.preventDefault();
                evt.stopPropagation();
                return;
            }
            if (evt.key === 'r' && currentPendingMirror.current) {
                setPendingMirror((mirror) =>
                    mirror
                        ? {
                              ...mirror,
                              reflect: !mirror.reflect,
                          }
                        : null,
                );
                evt.preventDefault();
                evt.stopPropagation();
                return;
            }
            if (evt.key === 'Shift') {
                setShiftKey(currentPos.current);
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

    const onClickIntersection = React.useCallback(
        (coord: Intersect, shiftKey: boolean) => {
            if (currentPendingMirror.current) {
                const mirror = currentPendingMirror.current;
                if (mirror.center) {
                    const nextId = `id-${currentState.current.nextId}`;
                    const rotational: Array<boolean> = [];
                    for (let i = 0; i < mirror.rotations - 1; i++) {
                        rotational.push(true);
                    }
                    // we're done folks
                    dispatch({
                        type: 'mirror:add',
                        mirror: {
                            id: '',
                            origin: mirror.center,
                            parent: mirror.parent,
                            point: coord.coord,
                            reflect: mirror.reflect,
                            rotational,
                        },
                    });
                    dispatch({ type: 'mirror:active', id: nextId });
                    return; // TODO
                } else {
                    return setPendingMirror({
                        ...mirror,
                        center: coord.coord,
                    });
                }
            }
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

    const allIntersections = React.useMemo(
        () => calcAllIntersections(guidePrimitives.map((p) => p.prim)),
        [guidePrimitives],
    );

    // When intersections change, cancel pending stuffs
    React.useEffect(() => {
        setPathOrigin(null);
    }, [allIntersections]);

    return (
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
                                          ids: dedupString(guides),
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
                                          ids: dedupString(guides),
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
                    palette={state.palettes[state.activePalette]}
                    mirror={
                        state.activeMirror
                            ? mirrorTransforms[state.activeMirror]
                            : null
                    }
                    zoom={view.zoom}
                    origin={pathOrigin}
                    primitives={guidePrimitives}
                    intersections={allIntersections}
                    onComplete={onCompletePath}
                />
            ) : null}
            {pendingMirror ? (
                <RenderPendingMirror
                    mirror={pendingMirror}
                    zoom={view.zoom}
                    mouse={pos}
                    transforms={
                        pendingMirror.parent
                            ? mirrorTransforms[pendingMirror.parent]
                            : null
                    }
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
    );
};

export const RenderPendingMirror = ({
    mirror,
    zoom,
    transforms,
    mouse,
}: {
    mirror: PendingMirror;
    zoom: number;
    transforms: null | Array<Array<Matrix>>;
    mouse: Coord;
}) => {
    let center = mirror.center ?? mouse;
    let radial = mirror.center ? mouse : push(center, 0, 100 / zoom);
    let line = {
        p1: radial,
        p2: push(
            radial,
            angleTo(radial, center) + (mirror.reflect ? Math.PI / 8 : 0),
            dist(center, radial) / 2,
        ),
    };
    const rotational: Array<boolean> = [];
    for (let i = 0; i < mirror.rotations - 1; i++) {
        rotational.push(true);
    }
    const mine = mirrorTransforms({
        id: '',
        origin: center,
        point: radial,
        rotational,
        reflect: mirror.reflect,
        parent: mirror.parent,
    }).map(transformsToMatrices);
    const alls: Array<Array<Matrix>> = mine.slice();
    transforms?.forEach((outer) => {
        alls.push(outer);
        mine.forEach((inner) => {
            alls.push(inner.concat(outer));
        });
    });
    // let transformed =
    return (
        <>
            <line
                x1={line.p1.x * zoom}
                y1={line.p1.y * zoom}
                x2={line.p2.x * zoom}
                y2={line.p2.y * zoom}
                stroke="blue"
                strokeWidth="2"
                pointerEvents="none"
            />
            {alls.map((transforms, i) => {
                const p1 = applyMatrices(line.p1, transforms);
                const p2 = applyMatrices(line.p2, transforms);
                return (
                    <line
                        pointerEvents="none"
                        key={i}
                        x1={p1.x * zoom}
                        y1={p1.y * zoom}
                        x2={p2.x * zoom}
                        y2={p2.y * zoom}
                        stroke="red"
                        strokeWidth="2"
                    />
                );
            })}
        </>
    );
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
