import React, {useEffect, useState} from 'react';
import {Action, PathCreateMany} from '../state/Action';
import {PendingMirror, UIState} from '../useUIState';
import {calcAllIntersections} from '../rendering/calcAllIntersections';
import {
    calculateGuideElements,
    geomPoints,
    geomsForGiude,
} from '../rendering/calculateGuideElements';
import {DrawPathState} from './DrawPath';
import {
    angleTo,
    getMirrorTransforms,
    getTransformsForNewMirror,
} from '../rendering/getMirrorTransforms';
import {primitivesForElementsAndPaths} from './primitivesForElementsAndPaths';
import {PendingPathPair} from './PendingPathPair';
import {PendingDuplication} from './Guides.PendingDuplication.related';
import {CancelIcon, IconButton, MirrorIcon, ScissorsCuttingIcon} from '../icons/Icon';
import {epsilon} from '../rendering/epsilonToZero';
import {Bezier, createLookupTable, evaluateBezier, evaluateLookUpTable, LookUpTable} from '../lerp';
import {mergeStyleLines} from './mergeStyleLines';
import {mergeFills} from './mergeFills';
import {StyleHover} from './StyleHover';
import {PendingPathControls} from './PendingPathControls';
import {RenderWebGL} from './RenderWebGL';
import {Hover} from './Hover';
import {RadiusSelector} from './touchscreenControls';
import {mirrorControls} from './mirrorControls';
import {selectionSection} from './selectionSection';
import {
    Animations,
    Coord,
    FloatLerp,
    Segment,
    State,
    Style,
    LerpPoint,
    View,
    Mirror,
    Tiling,
} from '../types';
import {functionWithBuiltins} from '../animation/getAnimatedPaths';
import {Menu} from 'primereact/menu';
import {SVGCanvas} from './SVGCanvas';
import {useCurrent} from '../useCurrent';
import {ToolIcons} from './ToolIcons';
import {findAdjacentPaths, produceJointPaths} from '../animation/getBuiltins';
import {coordsEqual} from '../rendering/pathsAreIdentical';
import {angleBetween} from '../rendering/isAngleBetween';
import {negPiToPi} from '../rendering/epsilonToZero';
import {closeEnough} from '../rendering/epsilonToZero';
import {simpleExport} from './handleTiling';
import {angleDifferences, isClockwisePoints, pointsAngles} from '../rendering/pathToPoints';
import {MenuItem, EditorState} from './Canvas.MenuItem.related';

type Props = {
    state: State;
    // dragSelect: boolean;
    // cancelDragSelect: () => void;
    isTouchScreen: boolean;
    width: number;
    height: number;
    innerRef?: (node: SVGSVGElement | null) => unknown;
    pendingMirror: PendingMirror | null;
    pendingDuplication: null | PendingDuplication;
    setPendingDuplication: (b: null | PendingDuplication) => void;
    setPendingMirror: (
        mirror: (PendingMirror | null) | ((mirror: PendingMirror | null) => PendingMirror | null),
    ) => void;
    dispatch: (action: Action) => unknown;
    hover: Hover | null;
    setHover: (hover: Hover | null) => void;
    ppi?: number;
    styleHover: StyleHover | null;
    uiState: UIState;
};


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

export type TLSegmentCurve = {
    type: 'curve';
    // normalized! x0 = 0, x1 = 1
    bezier: Bezier;
    lookUpTable: LookUpTable;
    x0: number;
};




const evaluateBetween = (left: LerpPoint, right: LerpPoint, position: number) => {
    const percent = (position - left.pos.x) / (right.pos.x - left.pos.x);
    return percent * (right.pos.y - left.pos.y) + left.pos.y;
};


const evaluateTimeline = (timeline: FloatLerp, position: number) => {
    if (!timeline.points.length) {
        return (timeline.range[1] - timeline.range[0]) * position + timeline.range[0];
    }
    let y = null;
    for (let i = 0; i < timeline.points.length; i++) {
        if (position < timeline.points[i].pos.x) {
            y = evaluateBetween(
                i === 0 ? {pos: {x: 0, y: 0}} : timeline.points[i - 1],
                timeline.points[i],
                position,
            );
            break;
        }
    }
    if (y == null) {
        y = evaluateBetween(
            timeline.points[timeline.points.length - 1],
            {pos: {x: 1, y: 1}},
            position,
        );
    }
    return y * (timeline.range[1] - timeline.range[0]) + timeline.range[0];
};






/**
 * This is the newfangled version of DrawPathState... probably
 */


const initialEditorState: EditorState = {
    tmpView: null,
    items: [],
    pos: {x: 0, y: 0},
    zooming: false,
    dragPos: null,
    dragSelectPos: null,
    selectMode: true,
    multiSelect: false,
    pending: null,
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
    pendingDuplication,
    setPendingDuplication,
    isTouchScreen,
    ppi,
    styleHover,
    uiState,
}: Props) => {
    const mirrorTransforms = React.useMemo(
        () => getMirrorTransforms(state.mirrors),
        [state.mirrors],
    );

    const [editorState, setEditorState] = useState(initialEditorState);

    const menu = React.useRef<Menu>(null);
    const currentState = useCurrent(state);
    const ces = useCurrent(editorState);

    React.useEffect(() => {
        const fn = (evt: KeyboardEvent) => {
            if (evt.key === 't') {
                setEditorState((es) => ({
                    ...es,
                    pending: {type: 'tiling', points: []},
                }));
                evt.preventDefault();
                evt.stopImmediatePropagation();
                return;
            }
            if (evt.key === 'Enter' && ces.current.pending?.type === 'tiling') {
                const shape = determineTilingShape(ces.current.pending.points);
                if (!shape) {
                    return;
                }
                simpleExport(currentState.current, shape).then((cache) =>
                    cache ? dispatch({type: 'tiling:add', shape, cache}) : null,
                );
                setEditorState((es) => ({...es, pending: null}));
            }
        };
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, []);

    const startPath = () => {
        const state = currentState.current;
        if (state.selection?.type === 'Guide') {
            const ids = state.selection.ids;
            const create = ids
                .flatMap((id): PathCreateMany['paths'] => {
                    const guide = state.guides[id];
                    const geoms = geomsForGiude(
                        guide,
                        typeof guide.mirror === 'string'
                            ? mirrorTransforms[guide.mirror as string]
                            : guide.mirror
                              ? getTransformsForNewMirror(guide.mirror as Mirror)
                              : null,
                    );
                    return geoms
                        .map(({geom}): PathCreateMany['paths'][0] | null =>
                            geom.type === 'Circle'
                                ? {
                                      origin: geom.radius,
                                      segments: [
                                          {
                                              type: 'Arc',
                                              center: geom.center,
                                              to: geom.radius,
                                              clockwise: true,
                                          },
                                      ],
                                  }
                                : geom.type === 'Line'
                                  ? {
                                        origin: geom.p1,
                                        segments: [{type: 'Line', to: geom.p2}],
                                        open: true,
                                    }
                                  : null,
                        )
                        .filter(Boolean) as PathCreateMany['paths'];
                })
                .filter(Boolean);
            console.log(create);
            dispatch({
                type: 'path:create:many',
                paths: create as PathCreateMany['paths'],
                withMirror: false,
                trace: true,
            });
            return;
        }
        console.log('startpath');
        setEditorState((es) => ({
            ...es,
            pending: es.pending === null ? {type: 'waiting'} : null,
        }));
        if (state.selection) {
            dispatch({type: 'selection:set', selection: null});
        }
    };

    useEffect(() => {
        const fn = (evt: KeyboardEvent) => {
            if (
                evt.target !== document.body &&
                (evt.target instanceof HTMLInputElement ||
                    evt.target instanceof HTMLTextAreaElement)
            ) {
                return;
            }

            if (evt.key === 'x') {
                const state = currentState.current;
                if (state.selection?.type === 'Path') {
                    evt.preventDefault();
                    evt.stopPropagation();
                    const more = findAdjacentPaths(state.selection.ids, state.paths);
                    dispatch({
                        type: 'selection:set',
                        selection: {
                            type: 'Path',
                            ids: state.selection.ids.concat(more),
                        },
                    });
                }
            }

            if (evt.key === 'n') {
                evt.preventDefault();
                evt.stopPropagation();

                if (currentState.current.selection?.type === 'Path') {
                    const ids = currentState.current.selection.ids;
                    const joinedSegments = produceJointPaths(ids, currentState.current.paths);
                    dispatch({
                        type: 'path:create:many',
                        paths: joinedSegments
                            // .filter(s => coordsEqual(s[0].prev, s[s.length - 1].segment.to))
                            .map((segs) => ({
                                origin: segs[0].prev,
                                segments: segs.map((s) => s.segment),
                                open: !coordsEqual(segs[0].prev, segs[segs.length - 1].segment.to),
                            })),
                        withMirror: false,
                        trace: true,
                    });
                    dispatch({
                        type: 'selection:set',
                        selection: currentState.current.selection,
                    });
                    // console.log('ok', ok)
                    return;
                }

                startPath();
            }
            if (evt.key === 'Escape') {
                console.log('no pending path now');
                setEditorState((es) => ({...es, pending: null}));
            }
        };
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, []);

    const showMenu = React.useCallback((evt: React.MouseEvent, items: MenuItem[]) => {
        evt.preventDefault();
        evt.stopPropagation();
        console.log('ok', menu, items);
        menu.current!.show(evt);
        setEditorState((state) => ({...state, items}));
        // setItems(items);
        const {clientX, clientY} = evt;
        setTimeout(() => {
            const el = menu.current!.getElement();
            el.style.top = clientY + 'px';
            el.style.left = clientX + 'px';
            console.log('ok', el);
        }, 10);
    }, []);

    let view = React.useMemo(() => {
        let view = editorState.tmpView ?? state.view;
        return {...state.view, center: view.center, zoom: view.zoom};
    }, [state.view, editorState.tmpView]);

    const guidePrimitives = React.useMemo(() => {
        const elements = state.view.guides
            ? calculateGuideElements(state.guides, mirrorTransforms)
            : [];
        const points = elements.flatMap((el) => geomPoints(el.geom));
        return {
            primitives: primitivesForElementsAndPaths(
                elements,
                Object.keys(state.paths)
                    .filter(
                        (k) =>
                            !state.paths[k].hidden &&
                            (!state.paths[k].group ||
                                !state.pathGroups[state.paths[k].group!]?.hide),
                    )
                    .map((k) => state.paths[k]),
            ),
            points,
        };
    }, [state.guides, state.paths, state.pathGroups, mirrorTransforms, state.view.guides]);

    const allIntersections = React.useMemo(() => {
        const {coords: fromGuides, seenCoords} = calcAllIntersections(
            guidePrimitives.primitives.map((p) => p.prim),
            guidePrimitives.points,
        );
        return fromGuides;
    }, [guidePrimitives, state.paths, state.pathGroups]);

    const svgContents = SVGCanvas({
        uiState,
        state,
        view,
        width,
        height,
        setEditorState,
        editorState,
        dispatch,
        styleHover,
        ppi,
        innerRef,
        hover,
        showMenu,
        isTouchScreen,
        pendingDuplication,
        setPendingDuplication,
        allIntersections,
        guidePrimitives,
        pendingMirror,
        mirrorTransforms,
        setPendingMirror,
    });

    // This is for rendering only, not interacting.
    if (ppi != null) {
        return svgContents;
    }

    return (
        <div
            css={{
                position: 'relative',
            }}
            style={{width, height}}
            onTouchEnd={(evt) => {
                if (state.selection && !evt.shiftKey && evt.target instanceof SVGElement) {
                    evt.preventDefault();
                }
            }}
            onClick={(evt) => {
                if (state.selection && !evt.shiftKey && evt.target instanceof SVGElement) {
                    dispatch({
                        type: 'selection:set',
                        selection: null,
                    });
                }
            }}
        >
            {svgContents}
            {view.texture ? (
                <RenderWebGL state={state} texture={view.texture} width={width} height={height} />
            ) : null}
            {editorState.tmpView
                ? zoomPanControls(setEditorState, state, editorState.tmpView, dispatch)
                : null}
            <ToolIcons
                state={state}
                editorState={editorState}
                dispatch={dispatch}
                setEditorState={setEditorState}
                startPath={startPath}
            />
            <div
                css={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: editorState.pending ? 0 : undefined,
                    overflow: 'auto',
                }}
                onClick={(evt) => evt.stopPropagation()}
            >
                {pendingMirror ? (
                    mirrorControls(setPendingMirror, pendingMirror)
                ) : pendingDuplication ? (
                    duplicationControls(setPendingDuplication, pendingDuplication)
                ) : state.selection ? (
                    selectionSection(
                        dispatch,
                        editorState.selectMode,
                        setEditorState,
                        state,
                        editorState.multiSelect,
                        setPendingDuplication,
                    )
                ) : state.pending ? (
                    <button
                        css={{
                            fontSize: 30,
                        }}
                        onClick={() => dispatch({type: 'pending:type', kind: null})}
                    >
                        Cancel guide
                    </button>
                ) : null}
                {editorState.pending ? (
                    <PendingPathControls
                        editorState={editorState}
                        setEditorState={setEditorState}
                        allIntersections={allIntersections}
                        guidePrimitives={guidePrimitives.primitives}
                        onComplete={(isClip: boolean, origin: Coord, segments: Array<Segment>) => {
                            if (isClip) {
                                dispatch({
                                    type: 'clip:add',
                                    clip: segments,
                                });
                            } else {
                                dispatch({
                                    type: 'path:create:many',
                                    paths: [{segments, origin}],
                                    withMirror: true,
                                });
                            }
                        }}
                    />
                ) : null}
                <div>
                    {editorState.selectMode === 'radius' ? (
                        <RadiusSelector state={state} dispatch={dispatch} />
                    ) : null}
                </div>
            </div>
            <Menu model={editorState.items as any} popup ref={menu} />
        </div>
    );
};



function duplicationControls(
    setPendingDuplication: (b: null | PendingDuplication) => void,
    pendingDuplication: PendingDuplication,
): React.ReactNode {
    return (
        <div>
            <IconButton
                onClick={() => {
                    setPendingDuplication(null);
                }}
            >
                <CancelIcon />
            </IconButton>
            <IconButton
                selected={pendingDuplication.reflect}
                onClick={() => {
                    pendingDuplication.reflect
                        ? setPendingDuplication({
                              reflect: false,
                              p0: null,
                          })
                        : setPendingDuplication({
                              reflect: true,
                              p0: null,
                          });
                }}
            >
                <MirrorIcon />
            </IconButton>
            {pendingDuplication.reflect
                ? 'Click two points to reflect across'
                : `Click a point to duplicate around`}
        </div>
    );
}

function zoomPanControls(
    setEditorState: React.Dispatch<React.SetStateAction<EditorState>>,
    state: State,
    tmpView: View,
    dispatch: (action: Action) => unknown,
): React.ReactNode {
    return (
        <div
            css={{
                position: 'absolute',
                color: 'black',
                top: 0,
                right: 0,
            }}
        >
            <div css={{display: 'flex'}}>
                <div
                    css={{
                        padding: 10,
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        cursor: 'pointer',
                        ':hover': {
                            backgroundColor: 'rgba(255,255,255,0.5)',
                        },
                    }}
                    onClick={() => setEditorState((state) => ({...state, tmpView: null}))}
                >
                    Reset z/p
                </div>
                <div
                    css={{
                        padding: 10,
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        cursor: 'pointer',
                        ':hover': {
                            backgroundColor: 'rgba(255,255,255,0.5)',
                        },
                    }}
                    onClick={() => {
                        setEditorState((estate) => ({
                            ...estate,
                            tmpView: {
                                ...state.view,
                                zoom: tmpView.zoom,
                            },
                        }));
                    }}
                >
                    Just pan
                </div>
            </div>
            <div
                css={{
                    padding: 10,
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    cursor: 'pointer',
                    ':hover': {
                        backgroundColor: 'rgba(255,255,255,0.5)',
                    },
                }}
                onClick={() => {
                    dispatch({
                        type: 'view:update',
                        view: {
                            ...state.view,
                            center: tmpView.center,
                            zoom: tmpView.zoom,
                        },
                    });
                    setEditorState((state) => ({...state, tmpView: null}));
                }}
            >
                Commit
            </div>
        </div>
    );
}


const ClipMenu = ({
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
                selected={pendingPath?.type === 'path' ? pendingPath.isClip : false}
                onClick={() =>
                    setPendingPath((p) => (p?.type === 'path' ? {...p, isClip: !p.isClip} : p))
                }
            >
                <ScissorsCuttingIcon />
            </IconButton>
        </div>
    );
};

export const ToolIcon = ({
    points,
    lines,
    circles,
}: {
    points?: Coord[];
    lines?: Coord[][];
    circles?: [Coord, number][];
}) => {
    return (
        <svg width={16} height={16} viewBox="-2 -2 14 14">
            {points?.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={1.5} fill="currentColor" />
            ))}
            {lines?.map((points, i) => (
                <polyline
                    key={i}
                    points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                    stroke="currentColor"
                    fill="none"
                />
            ))}
            {circles?.map(([p, r], i) => (
                <circle key={i} cx={p.x} cy={p.y} r={r} fill="none" stroke="currentColor" />
            ))}
        </svg>
    );
};

function determineTilingShape(points: Coord[]): Tiling['shape'] | void {
    if (points.length === 4) {
        let [a, b, c, d] = points;
        if (!isClockwisePoints(points)) {
            [b, c, d] = [d, c, b];
        }
        const angles = angleDifferences(pointsAngles([a, b, c, d]));
        if (!closeEnough(angles[0], angles[2]) || !closeEnough(angles[1], angles[3])) {
            return;
        }
        return {
            type: 'parallellogram',
            points: [a, b, c, d],
        };
    }
    if (points.length === 3) {
        const [a, b, c] = points;
        const ab = angleTo(a, b);
        const ac = angleTo(a, c);
        const bc = angleTo(b, c);
        let abc = angleBetween(negPiToPi(ab + Math.PI), bc, true);
        let bca = angleBetween(negPiToPi(bc + Math.PI), negPiToPi(ac + Math.PI), true);
        let cab = angleBetween(ac, ab, true);

        // If one is > π, they all will be.
        // I've made my measurements assuming they are arranged in anti-clockwise order.
        let rev = abc > Math.PI;
        if (rev) {
            abc -= Math.PI;
            bca -= Math.PI;
            cab -= Math.PI;
        }
        if (closeEnough(abc, Math.PI / 2)) {
            // B is our right angle!
            return {
                type: 'right-triangle',
                start: a,
                corner: b,
                end: c,
                rotateHypotenuse: false,
            };
        }
        if (closeEnough(bca, Math.PI / 2)) {
            return {
                type: 'right-triangle',
                start: a,
                corner: c,
                end: b,
                rotateHypotenuse: false,
            };
        }
        if (closeEnough(cab, Math.PI / 2)) {
            return {
                type: 'right-triangle',
                start: c,
                corner: a,
                end: b,
                rotateHypotenuse: false,
            };
        }
        if (closeEnough(abc, bca)) {
            return {
                type: 'isocelese',
                first: a,
                second: b,
                third: c,
            };
        }
        if (closeEnough(abc, cab)) {
            return {
                type: 'isocelese',
                first: c,
                second: b,
                third: a,
            };
        }
        if (closeEnough(bca, cab)) {
            return {
                type: 'isocelese',
                first: b,
                second: c,
                third: a,
            };
        }
    }
    return;
}
