/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { useCurrent } from './App';
import { calcAllIntersections } from './calcAllIntersections';
import { DrawPath } from './DrawPath';
import { dedupString } from './findNextSegments';
import { Matrix } from './getMirrorTransforms';
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

export const Guides = ({
    state,
    dispatch,
    width,
    height,
    view,
    inativeGuidePrimitives,
    guidePrimitives,
    pos,
    mirrorTransforms,
    hover,
}: {
    state: State;
    dispatch: (action: Action) => void;
    width: number;
    height: number;
    view: View;
    hover: Hover | null;
    inativeGuidePrimitives: Array<{ prim: Primitive; guides: Array<Id> }>;
    guidePrimitives: Array<{ prim: Primitive; guides: Array<Id> }>;
    // pathOrigin: null | Intersect ,
    // setPathOrigin: (coord: null | Intersect) => void,
    pos: Coord;
    mirrorTransforms: { [key: string]: Array<Array<Matrix>> };
}) => {
    const currentState = React.useRef(state);
    currentState.current = state;

    const [shiftKey, setShiftKey] = React.useState(false as false | Coord);

    const currentPos = useCurrent(pos);

    const [pathOrigin, setPathOrigin] = React.useState(
        null as null | Intersect,
    );

    React.useEffect(() => {
        const fn = (evt: KeyboardEvent) => {
            if (evt.target !== document.body || evt.metaKey || evt.ctrlKey) {
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
