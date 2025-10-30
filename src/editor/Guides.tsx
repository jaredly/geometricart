/* @jsx jsx */
/* @jsxFrag React.Fragment */
import {jsx} from '@emotion/react';
import React, {useRef} from 'react';
import {useCurrent} from '../useCurrent';
import {PendingMirror, UIState} from '../useUIState';
import {Action, PathMultiply} from '../state/Action';
import {EditorState, screenToWorld} from './Canvas';
import {DrawPath, DrawPathState, initialState} from './DrawPath';
import {pathToPrimitives} from './findSelection';
import {Bounds} from './Bounds';
import {simplifyPath} from '../rendering/simplifyPath';
import {lineToSlope, Primitive} from '../rendering/intersect';
import {ensureClockwise} from '../rendering/pathToPoints';
import {geomToPrimitives} from '../rendering/points';
import {primitiveKey} from '../rendering/coordKey';
import {calculateInactiveGuideElements} from '../rendering/calculateGuideElements';
import {dedupString} from '../rendering/findNextSegments';
import {angleTo, dist, Matrix} from '../rendering/getMirrorTransforms';
import {RenderIntersections} from './RenderIntersections';
import {RenderMirror} from './RenderMirror';
import {RenderPendingGuide} from './RenderPendingGuide';
import {RenderPendingMirror} from './RenderPendingMirror';
import {RenderPrimitive} from './RenderPrimitive';
import {Hover} from './Sidebar';
import {Coord, GuideElement, Id, Intersect, Path, PendingSegment, State, View} from '../types';
import {getClips} from '../rendering/pkInsetPaths';
import {RenderCompassAndRuler} from './RenderCompassAndRuler';
import {handleClick, handleSpace, PendingMark, previewPos} from './compassAndRuler';

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
): Array<{prim: Primitive; guides: Array<Id>}> {
    const seen: {[key: string]: Array<Id>} = {};
    return ([] as Array<{prim: Primitive; guide: Id}>)
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
            return {prim: prim.prim, guides: seen[k]};
        })
        .concat(
            paths
                .map((path) => {
                    return path.segments.map(
                        (seg, i): null | {prim: Primitive; guides: Array<Id>} => {
                            const prev = i === 0 ? path.origin : path.segments[i - 1].to;
                            let prim: Primitive;
                            if (seg.type === 'Line') {
                                prim = lineToSlope(prev, seg.to, true);
                            } else if (seg.type === 'Quad') {
                                throw new Error('noa');
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
                            return {prim, guides: seen[k]};
                        },
                    );
                })
                .flat(),
        )
        .filter(Boolean) as Array<{prim: Primitive; guides: Array<Id>}>;
}

export type PendingPathPair = [
    EditorState['pending'],
    (
        fn: EditorState['pending'] | ((state: EditorState['pending']) => EditorState['pending']),
    ) => void,
];

export type PendingDuplication = {
    reflect: boolean;
    p0: Coord | null;
};

export const Guides = ({
    state,
    dispatch,
    width,
    height,
    view,
    pos,
    mirrorTransforms,
    hover,
    zooming,
    pendingDuplication,
    setPendingDuplication,
    pendingMirror,
    setPendingMirror,
    // pendingPath,
    guidePrimitives,
    allIntersections,
    isTouchScreen,
    disableGuides,
    bounds,
    editorState,
    uiState,
    setEditorState,
    compassDragState,
}: {
    uiState: UIState;
    compassDragState: PendingMark | undefined;
    bounds: Bounds;
    state: State;
    isTouchScreen: boolean;
    zooming: boolean;
    dispatch: (action: Action) => void;
    width: number;
    height: number;
    view: View;
    hover: Hover | null;
    pos: Coord;
    pendingDuplication: null | PendingDuplication;
    setPendingDuplication: (b: null | PendingDuplication) => void;
    // pendingPath: PendingPathPair;
    editorState: EditorState;
    setEditorState: React.Dispatch<React.SetStateAction<EditorState>>;
    mirrorTransforms: {[key: string]: Array<Array<Matrix>>};
    pendingMirror: PendingMirror | null;
    guidePrimitives: Array<{prim: Primitive; guides: Array<Id>}>;
    allIntersections: Array<Intersect>;
    setPendingMirror: (
        mirror: (PendingMirror | null) | ((mirror: PendingMirror | null) => PendingMirror | null),
    ) => void;
    disableGuides: boolean;
}) => {
    const pendingPath: PendingPathPair = [
        editorState.pending,
        (pp) =>
            setEditorState((s) => ({
                ...s,
                pending: typeof pp === 'function' ? pp(s.pending) : pp,
            })),
    ];
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

    // const [pathOrigin, setPathOrigin] = React.useState(
    //     null as null | { coord: Intersect; clip: boolean },
    // );

    const currentPendingMirror = useCurrent(pendingMirror);

    const currentPathOrigin = useCurrent(pendingPath);

    React.useEffect(() => {
        const fn = keyHandler(
            currentState,
            currentPathOrigin,
            dispatch,
            currentPendingMirror,
            setPendingMirror,
            setShiftKey,
            currentPos,
        );
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
    }, [!!pendingPath[0]]);

    const onCompletePath = React.useCallback(
        (parts: Array<PendingSegment>, open?: boolean) => {
            if (pendingPath[0]?.type !== 'path') {
                return;
            }
            if (pendingPath[0].isClip) {
                dispatch({
                    type: 'clip:add',
                    clip: simplifyPath(ensureClockwise(parts.map((p) => p.segment))),
                });
            } else {
                dispatch({
                    type: 'path:create:many',
                    paths: [
                        {
                            segments: parts.map((s) => s.segment),
                            origin: pendingPath[0].origin.coord,
                            open,
                        },
                    ],
                    withMirror: true,
                });
            }
            pendingPath[1]((_) => null);
        },
        [pendingPath[0]],
    );

    const primsAndStuff = useCurrent({guidePrimitives, allIntersections});

    const currentDuplication = useCurrent(pendingDuplication);
    const currentEditorState = useCurrent(editorState);

    const onClickIntersection = React.useCallback((coord: Intersect, shiftKey: boolean) => {
        console.log(`click intersection`, currentDuplication, coord);
        if (currentState.current.pending?.type === 'compass&ruler') {
            dispatch({
                type: 'pending:compass&ruler',
                state: handleClick(previewPos(currentState.current.compassState, coord.coord)),
            });
            return;
        }
        if (currentDuplication.current) {
            handleDuplicationIntersection(
                coord,
                currentState.current,
                currentDuplication.current,
                setPendingDuplication,
                dispatch,
            );
            return;
        }
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
                dispatch({type: 'mirror:active', id: nextId});
                return; // TODO
            } else {
                return setPendingMirror({
                    ...mirror,
                    center: coord.coord,
                });
            }
        }
        const editorState = currentEditorState.current;
        if (editorState.pending?.type === 'tiling') {
            return setEditorState((es) =>
                es.pending?.type === 'tiling'
                    ? {
                          ...es,
                          pending: {
                              ...es.pending,
                              points: es.pending.points.concat(coord.coord),
                          },
                      }
                    : es,
            );
        }
        const state = currentState.current;
        if (!state.pending) {
            const {guidePrimitives, allIntersections} = primsAndStuff.current;
            pendingPath[1](initialState(coord, guidePrimitives, allIntersections));
            // setPathOrigin({ coord, clip: false });
            // dispatch({ type: 'path:point', coord });
        } else if (state.pending.type === 'Guide') {
            dispatch({
                type: 'pending:point',
                coord: coord.coord,
                shiftKey,
            });
        }
    }, []);

    // When intersections change, cancel pending stuffs
    const first = useRef(true);
    React.useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        pendingPath[1](null);
    }, [allIntersections]);

    const clip = getClips(state);

    const clickInactive = React.useCallback((guides: string[], shift: boolean): void => {
        if (!shift) {
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
    }, []);

    const clickActive = React.useCallback((guides: string[], shift: boolean): void => {
        if (!shift) {
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
    }, []);
    return (
        <>
            <RenderPrimitives
                primitives={inactiveGuidePrimitives}
                zoom={view.zoom}
                bounds={bounds}
                inactive
                onClick={disableGuides || pendingPath[0] ? undefined : clickInactive}
            />
            <RenderPrimitives
                primitives={guidePrimitives}
                zoom={view.zoom}
                bounds={bounds}
                onClick={
                    disableGuides ||
                    pendingPath[0] ||
                    state.pending != null ||
                    editorState.pending ||
                    uiState.pendingDuplication
                        ? undefined
                        : clickActive
                }
            />
            {(editorState.pending?.type === 'waiting' ||
                editorState.pending?.type === 'tiling' ||
                state.pending != null ||
                uiState.pendingMirror ||
                uiState.pendingDuplication) &&
            !zooming ? (
                <RenderIntersections
                    zoom={view.zoom}
                    highlight={state.pending != null}
                    intersections={allIntersections}
                    onClick={onClickIntersection}
                    colored={
                        editorState.pending?.type === 'tiling'
                            ? editorState.pending.points
                            : undefined
                    }
                />
            ) : null}
            {state.pending && state.pending.type === 'Guide' ? (
                <RenderPendingGuide
                    bounds={bounds}
                    mirror={state.activeMirror ? mirrorTransforms[state.activeMirror] : null}
                    guide={state.pending}
                    pos={pos}
                    zoom={view.zoom}
                    shiftKey={!!shiftKey}
                />
            ) : null}
            {clip.map((clip, i) => (
                <React.Fragment key={i}>
                    {pathToPrimitives(clip.shape).map((prim, i) => (
                        <RenderPrimitive
                            bounds={bounds}
                            isImplied
                            prim={prim}
                            zoom={view.zoom}
                            color={'magenta'}
                            strokeWidth={4}
                            key={i}
                        />
                    ))}
                </React.Fragment>
            ))}
            {pendingPath[0]?.type === 'path' ? (
                <DrawPath
                    palette={state.palette}
                    mirror={
                        state.activeMirror && !pendingPath[0].isClip
                            ? mirrorTransforms[state.activeMirror]
                            : null
                    }
                    pendingPath={[pendingPath[0], pendingPath[1]]}
                    view={view}
                    isClip={pendingPath[0].isClip}
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
                        pendingMirror.parent ? mirrorTransforms[pendingMirror.parent] : null
                    }
                />
            ) : null}
            {Object.keys(state.mirrors).map((m) =>
                hover?.type === 'element' && hover?.kind === 'Mirror' && hover.id === m ? (
                    <RenderMirror
                        key={m}
                        mirror={state.mirrors[m]}
                        transforms={mirrorTransforms[m]}
                        zoom={view.zoom}
                    />
                ) : null,
            )}
            {state.pending?.type === 'compass&ruler' ? (
                <RenderCompassAndRuler
                    pendingMark={compassDragState}
                    editorState={editorState}
                    view={view}
                    bounds={bounds}
                    state={state.compassState}
                />
            ) : null}
        </>
    );
};

const RenderPrimitives = React.memo(
    ({
        primitives,
        zoom,
        onClick,
        bounds,
        inactive,
    }: {
        zoom: number;
        bounds: Bounds;
        primitives: Array<{prim: Primitive; guides: Array<Id>}>;
        onClick?: (guides: Array<Id>, shift: boolean) => unknown;
        inactive?: boolean;
    }) => {
        const isTouchScreen = 'ontouchstart' in window;
        return (
            <>
                {isTouchScreen
                    ? primitives.map((prim, i) =>
                          prim.guides.length === 0 ? null : (
                              <RenderPrimitive
                                  strokeWidth={1}
                                  bounds={bounds}
                                  prim={prim.prim}
                                  zoom={zoom}
                                  inactive={inactive}
                                  touchOnly
                                  isImplied={!prim.guides.length}
                                  onClick={
                                      onClick && prim.guides.length
                                          ? (shiftKey) => onClick(prim.guides, shiftKey)
                                          : undefined
                                  }
                                  key={i}
                              />
                          ),
                      )
                    : null}
                {primitives.map((prim, i) =>
                    prim.guides.length === 0 ? null : (
                        <RenderPrimitive
                            strokeWidth={1}
                            bounds={bounds}
                            prim={prim.prim}
                            zoom={zoom}
                            inactive={inactive}
                            isImplied={!prim.guides.length}
                            onClick={
                                onClick && prim.guides.length
                                    ? (shiftKey) => onClick(prim.guides, shiftKey)
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

function keyHandler(
    currentState: React.MutableRefObject<State>,
    currentPathOrigin: React.MutableRefObject<
        [
            EditorState['pending'],
            (
                v:
                    | EditorState['pending']
                    | ((state: EditorState['pending']) => EditorState['pending']),
            ) => void,
        ]
    >,
    // setPathOrigin: React.Dispatch<
    //     React.SetStateAction<{ coord: Intersect; clip: boolean } | null>
    // >,
    dispatch: (action: Action) => void,
    currentPendingMirror: React.MutableRefObject<PendingMirror | null>,
    setPendingMirror: (
        mirror: PendingMirror | ((mirror: PendingMirror | null) => PendingMirror | null) | null,
    ) => void,
    setShiftKey: React.Dispatch<React.SetStateAction<false | Coord>>,
    currentPos: React.MutableRefObject<Coord>,
    // pathOrigin: { coord: Intersect; clip: boolean } | null,
) {
    return (evt: KeyboardEvent) => {
        const state = currentState.current;
        if (evt.target !== document.body || evt.metaKey || evt.ctrlKey) {
            return;
        }
        if (evt.key === ' ' && state.pending?.type === 'compass&ruler') {
            return dispatch({
                type: 'pending:compass&ruler',
                state: handleSpace(state.compassState),
            });
        }
        if (evt.key === 'P') {
            // protractor
            return dispatch({type: 'pending:type', kind: 'compass&ruler'});
        }
        if (evt.key === 'C' && currentPathOrigin.current) {
            evt.stopPropagation();
            return currentPathOrigin.current[1]((path) =>
                path?.type === 'path' ? {...path, isClip: !path.isClip} : null,
            );
        }
        if (evt.key === ' ' && state.pending?.type === 'Guide') {
            dispatch({
                type: 'pending:toggle',
            });
            console.log('toggle');
            return;
        }
        if (evt.key === 'ArrowUp' || evt.key === 'k') {
            if (state.pending?.type === 'Guide') {
                dispatch({
                    type: 'pending:extent',
                    delta: 1,
                });
            }
            if (state.selection?.type === 'Guide' && state.selection.ids.length === 1) {
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
                                extent: geom.extent != null ? geom.extent + 1 : 2,
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
            if (state.selection?.type === 'Guide' && state.selection.ids.length === 1) {
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
                                extent: geom.extent != null ? Math.max(0, geom.extent - 1) : 1,
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
        if (currentPathOrigin.current[0] && evt.key === 'Escape') {
            currentPathOrigin.current[1](null);
            evt.stopPropagation();
        }
    };
}

export function calculateBounds(width: number, height: number, view: View) {
    const {x: x0, y: y0} = screenToWorld(width, height, {x: 0, y: 0}, view);
    const {x: x1, y: y1} = screenToWorld(width, height, {x: width, y: height}, view);

    return {x0, y0, x1, y1};
}

export const handleDuplicationIntersection = (
    coord: Intersect,
    state: State,
    duplication: PendingDuplication,
    setPendingDuplication: (pd: PendingDuplication | null) => void,
    dispatch: React.Dispatch<Action>,
) => {
    if (!['Path', 'PathGroup'].includes(state.selection?.type ?? '')) {
        console.log('um selection idk what', state.selection);
        return;
    }
    if (duplication.reflect && !duplication.p0) {
        console.log('got a p0', coord.coord);
        setPendingDuplication({
            reflect: true,
            p0: coord.coord,
        });
        return;
    }
    setPendingDuplication(null);
    dispatch({
        type: 'path:multiply',
        selection: state.selection as PathMultiply['selection'],
        mirror: {
            id: 'tmp',
            origin: coord.coord,
            parent: null,
            point: duplication.p0 ?? {
                x: 100,
                y: 0,
            },
            reflect: duplication.reflect,
            rotational: duplication.reflect ? [] : [true],
        },
    });
};
