/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { PendingMirror, useCurrent } from './App';
import {
    calcAllIntersections,
    coordKey,
    primitiveKey,
} from './calcAllIntersections';
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
import { lineToSlope, Primitive } from './intersect';
import { RenderIntersections } from './RenderIntersections';
import { RenderMirror } from './RenderMirror';
import { RenderPendingGuide } from './RenderPendingGuide';
import { Hover } from './Sidebar';
import {
    Action,
    Coord,
    GuideElement,
    Id,
    Intersect,
    Path,
    PathGroup,
    PendingSegment,
    State,
    View,
} from './types';
import { RenderPrimitive } from './RenderPrimitive';
import {
    calculateGuideElements,
    calculateInactiveGuideElements,
} from './calculateGuideElements';
import { geomToPrimitives } from './points';
import { simplifyPath } from './RenderPath';
import { ensureClockwise } from './CanvasRender';

// This /will/ contain duplicates!
// export const calculatePathElements = (
//     paths: { [key: string]: Path },
//     groups: { [key: string]: PathGroup },
// ): Array<GuideElement> => {
// 	const result: Array<GuideElement> = [];
// 	Object.keys(paths).forEach(key => {
// 		const path = paths[key]
// 		if (path.hidden || (path.group && groups[path.group].hide)) {
// 			return
// 		}
// 		path.segments.forEach((seg, i) => {
// 			const prev = i === 0 ? path.origin : path.segments[i - 1].to
// 			if (seg.type === 'Line') {
// 				result.push({
// 					geom: {
// 						type: 'Line',
// 						p1: prev,
// 						p2: seg.to,
// 						limit: true,
// 						extent: 1,
// 					},
// 					active: true,
// 					id: null,
// 					original: false,
// 				})
// 			} else {
// 				result.push({
// 					geom: {
// 						type: 'Circle',
// 					}
// 				})
// 			}
// 		})
// 	})
// };

export function primitivesForElementsAndPaths(
    guideElements: GuideElement[],
    paths: Array<Path>,
): Array<{ prim: Primitive; guides: Array<Id> }> {
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
        .concat(
            paths
                .map((path) => {
                    return path.segments.map(
                        (
                            seg,
                            i,
                        ): null | { prim: Primitive; guides: Array<Id> } => {
                            const prev =
                                i === 0 ? path.origin : path.segments[i - 1].to;
                            let prim: Primitive;
                            if (seg.type === 'Line') {
                                prim = lineToSlope(prev, seg.to, true);
                            } else {
                                const t0 = angleTo(seg.center, prev);
                                const t1 = angleTo(seg.center, seg.to);
                                prim = {
                                    type: 'circle',
                                    center: seg.center,
                                    radius: dist(seg.center, seg.to),
                                    limit: seg.clockwise ? [t0, t1] : [t1, t0],
                                };
                            }
                            const k = primitiveKey(prim);
                            if (seen[k]) {
                                return null;
                            }
                            seen[k] = [];
                            return { prim, guides: seen[k] };
                        },
                    );
                })
                .flat(),
        )
        .filter(Boolean) as Array<{ prim: Primitive; guides: Array<Id> }>;
}

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

    const inactiveGuidePrimitives = React.useMemo(() => {
        return primitivesForElementsAndPaths(
            calculateInactiveGuideElements(state.guides, mirrorTransforms),
            [],
        );
    }, [state.guides, mirrorTransforms]);

    const currentState = React.useRef(state);
    currentState.current = state;

    const [shiftKey, setShiftKey] = React.useState(false as false | Coord);

    const currentPos = useCurrent(pos);

    const [pathOrigin, setPathOrigin] = React.useState(
        null as null | { coord: Intersect; clip: boolean },
    );

    const currentPendingMirror = useCurrent(pendingMirror);

    const currentPathOrigin = useCurrent(pathOrigin);

    React.useEffect(() => {
        const fn = (evt: KeyboardEvent) => {
            const state = currentState.current;
            if (evt.target !== document.body || evt.metaKey || evt.ctrlKey) {
                return;
            }
            if (evt.key === 'C' && currentPathOrigin.current) {
                evt.stopPropagation();
                return setPathOrigin((path) =>
                    path ? { ...path, clip: !path.clip } : null,
                );
            }
            if (evt.key === 'ArrowUp' || evt.key === 'k') {
                if (state.pending?.type === 'Guide') {
                    dispatch({
                        type: 'pending:extent',
                        delta: 1,
                    });
                }
                if (
                    state.selection?.type === 'Guide' &&
                    state.selection.ids.length === 1
                ) {
                    const id = state.selection.ids[0];
                    const geom = state.guides[id].geom;
                    if (geom.type === 'Line') {
                        dispatch({
                            type: 'guide:update',
                            id,
                            guide: {
                                ...state.guides[id],
                                geom: {
                                    ...geom,
                                    extent:
                                        geom.extent != null
                                            ? geom.extent + 1
                                            : 2,
                                },
                            },
                        });
                    }
                }
            }
            if (evt.key === 'ArrowDown' || evt.key === 'j') {
                if (state.pending?.type === 'Guide') {
                    dispatch({
                        type: 'pending:extent',
                        delta: -1,
                    });
                }
                if (
                    state.selection?.type === 'Guide' &&
                    state.selection.ids.length === 1
                ) {
                    const id = state.selection.ids[0];
                    const geom = state.guides[id].geom;
                    if (geom.type === 'Line') {
                        dispatch({
                            type: 'guide:update',
                            id,
                            guide: {
                                ...state.guides[id],
                                geom: {
                                    ...geom,
                                    extent:
                                        geom.extent != null
                                            ? Math.max(0, geom.extent - 1)
                                            : 1,
                                },
                            },
                        });
                    }
                }
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
            if (evt.key === 'Escape' && currentPendingMirror.current) {
                setPendingMirror(null);
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
            if (pathOrigin.clip) {
                dispatch({
                    type: 'view:update',
                    view: {
                        ...currentState.current.view,
                        clip: simplifyPath(
                            ensureClockwise(parts.map((p) => p.segment)),
                        ),
                    },
                });
            } else {
                dispatch({
                    type: 'path:create',
                    segments: parts.map((s) => s.segment),
                    origin: pathOrigin.coord.coord,
                });
            }
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
                setPathOrigin({ coord, clip: false });
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

    const allIntersections = React.useMemo(() => {
        // hmm yeah that's not actually gonna be the best.
        // because if you have a point that's on another guide, you'd
        // expect it to be able to intersect that guide.
        const { coords: fromGuides, seenCoords } = calcAllIntersections(
            guidePrimitives.map((p) => p.prim),
        );
        // hmmm
        // will it be obnoxiously much
        // to just generate new primitives for all paths?
        // seems like a bit muchc
        // Object.keys(state.paths).forEach((key) => {
        //     const path = state.paths[key];
        //     if (
        //         path.hidden ||
        //         (path.group && state.pathGroups[path.group].hide)
        //     ) {
        //         return;
        //     }
        //     path.segments.forEach((seg) => {
        //         const k = coordKey(seg.to);
        //         if (!seenCoords[k]) {
        //             seenCoords[k] = { coord: seg.to, primitives: [] };
        //             fromGuides.push(seenCoords[k]);
        //         }
        //     });
        // });
        return fromGuides;
    }, [guidePrimitives, state.paths, state.pathGroups]);

    // When intersections change, cancel pending stuffs
    React.useEffect(() => {
        setPathOrigin(null);
    }, [allIntersections]);

    return (
        <>
            <RenderPrimitives
                primitives={inactiveGuidePrimitives}
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
                    mirror={
                        state.activeMirror
                            ? mirrorTransforms[state.activeMirror]
                            : null
                    }
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
                        state.activeMirror && !pathOrigin.clip
                            ? mirrorTransforms[state.activeMirror]
                            : null
                    }
                    zoom={view.zoom}
                    isClip={pathOrigin.clip}
                    origin={pathOrigin.coord}
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
                {primitives.map((prim, i) =>
                    prim.guides.length === 0 ? null : (
                        <RenderPrimitive
                            prim={prim.prim}
                            zoom={zoom}
                            height={height}
                            width={width}
                            inactive={inactive}
                            isImplied={!prim.guides.length}
                            onClick={
                                onClick && prim.guides.length
                                    ? (evt: React.MouseEvent) => {
                                          evt.stopPropagation();
                                          onClick(prim.guides, evt.shiftKey);
                                      }
                                    : undefined
                            }
                            key={i}
                        />
                    ),
                )}
            </>
        );
    },
);
