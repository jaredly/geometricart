/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React, { useState } from 'react';
import { Action } from '../state/Action';
import { PendingMirror } from '../App';
import { calcAllIntersections } from '../rendering/calcAllIntersections';
import {
    calculateGuideElements,
    geomPoints,
} from '../rendering/calculateGuideElements';
import { DrawPathState } from './DrawPath';
import { findSelection } from './findSelection';
import { getMirrorTransforms, push } from '../rendering/getMirrorTransforms';
import {
    PendingDuplication,
    PendingPathPair,
    primitivesForElementsAndPaths,
} from './Guides';
import {
    CancelIcon,
    IconButton,
    MirrorIcon,
    ScissorsCuttingIcon,
} from '../icons/Icon';
import { epsilon } from '../rendering/intersect';
import {
    Bezier,
    createLookupTable,
    evaluateBezier,
    evaluateLookUpTable,
    LookUpTable,
} from '../lerp';
import { MirrorMenu } from './MirrorMenu';
import {
    mergeFills,
    mergeStyleLines,
    MultiStyleForm,
    StyleHover,
} from './MultiStyleForm';
import { OverlayMenu } from './OverlayMenu';
import { PendingPathControls } from './PendingPathControls';
import { RenderWebGL } from './RenderWebGL';
import { Hover } from './Sidebar';
import {
    GuideSection,
    selectedPathIds,
    mirrorControls,
    selectionSection,
} from './touchscreenControls';
import {
    Animations,
    Coord,
    FloatLerp,
    Path,
    Segment,
    State,
    Style,
    LerpPoint,
    View,
    TextureConfig,
    GuideGeom,
} from '../types';
import { functionWithBuiltins } from '../animation/getAnimatedPaths';
import { Menu } from 'primereact/menu';
import { SVGCanvas } from './SVGCanvas';
import { Button } from 'primereact/button';
import { toTypeRev } from '../handleKeyboard';

export type Props = {
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
        mirror:
            | (PendingMirror | null)
            | ((mirror: PendingMirror | null) => PendingMirror | null),
    ) => void;
    dispatch: (action: Action) => unknown;
    hover: Hover | null;
    setHover: (hover: Hover | null) => void;
    ppi?: number;
    styleHover: StyleHover | null;
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

export type TLSegment =
    | { type: 'straight'; y0: number; span: number; x0: number }
    | TLSegmentCurve;

export const evaluateSegment = (seg: TLSegment, percent: number) => {
    if (seg.type === 'straight') {
        return seg.y0 + seg.span * percent;
    }
    const t = evaluateLookUpTable(seg.lookUpTable, percent);
    return evaluateBezier(seg.bezier, t).y;
};

export const segmentForPoints = (
    left: LerpPoint,
    right: LerpPoint,
): TLSegment => {
    if (!left.rightCtrl && !right.leftCtrl) {
        return {
            type: 'straight',
            y0: left.pos.y,
            span: right.pos.y - left.pos.y,
            x0: left.pos.x,
        };
    }
    const dx = right.pos.x - left.pos.x;
    const c1 = left.rightCtrl
        ? { x: left.rightCtrl.x / dx, y: left.rightCtrl.y + left.pos.y }
        : { x: 0, y: left.pos.y };
    const c2 = right.leftCtrl
        ? { x: (dx + right.leftCtrl.x) / dx, y: right.leftCtrl.y + right.pos.y }
        : { x: 1, y: right.pos.y };
    const bezier: Bezier = { y0: left.pos.y, c1, c2, y1: right.pos.y };
    return {
        type: 'curve',
        bezier,
        lookUpTable: createLookupTable(bezier, 10),
        x0: left.pos.x,
    };
};

export const evaluateBetween = (
    left: LerpPoint,
    right: LerpPoint,
    position: number,
) => {
    const percent = (position - left.pos.x) / (right.pos.x - left.pos.x);
    return percent * (right.pos.y - left.pos.y) + left.pos.y;
};

export const timelineFunction = (timeline: FloatLerp) => {
    const segments: Array<TLSegment> = timelineSegments(timeline);
    // console.log(segments);
    return (x: number) => {
        for (let i = 0; i < segments.length; i++) {
            const x0 = segments[i].x0;
            const next = i === segments.length - 1 ? 1 : segments[i + 1].x0;
            if (x < next) {
                // const x1 = i === segments.length - 1 ? 1 : segments[i + 1].x0;
                const percent = (x - x0) / (next - x0);
                return evaluateSegment(segments[i], percent);
            }
        }
        const last = segments[segments.length - 1];
        if (last.type === 'straight') {
            return last.y0 + last.span;
        }
        return last.bezier.y1;
    };
};

export const evaluateTimeline = (timeline: FloatLerp, position: number) => {
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

export type AnimatedFunctions = {
    [key: string]:
        | ((n: number) => number)
        | ((n: Coord) => Coord)
        | ((n: number) => Coord);
};

export const getAnimatedFunctions = (
    animations: Animations,
): AnimatedFunctions => {
    const fn: AnimatedFunctions = {};
    Object.keys(animations.lerps).forEach((key) => {
        if (key === 't') {
            console.warn(`Can't have a custom vbl named t. Ignoring`);
            return;
        }
        const vbl = animations.lerps[key];
        if (vbl.type === 'float') {
            fn[key] = timelineFunction(vbl);
        } else {
            try {
                const k = functionWithBuiltins(vbl.code);
                fn[key] = k as (n: number) => number;
            } catch (err) {
                console.warn(
                    `Zeroing out ${key}, there was an error evaliation.`,
                );
                console.error(err);
                fn[key] = (n: number) => {
                    return 0;
                };
            }
        }
    });
    return fn;
};

export type MenuItem = {
    label: React.ReactNode;
    icon?: string;
    command?: (event: {
        originalEvent: React.MouseEvent;
        item: MenuItem;
    }) => void;
    items?: MenuItem[];
};

export const evaluateAnimatedValues = (
    animatedFunctions: AnimatedFunctions,
    position: number,
) => {
    return { ...animatedFunctions, t: position };
};

export type EditorState = {
    tmpView: null | View;
    items: Array<MenuItem>;
    pos: Coord;
    zooming: boolean;
    dragPos: null | { view: View; coord: Coord };

    dragSelectPos: null | Coord;
    isDragSelecting: boolean;
    multiSelect: boolean;
    pendingPath: null | DrawPathState;
};

const initialEditorState: EditorState = {
    tmpView: null,
    items: [],
    pos: { x: 0, y: 0 },
    zooming: false,
    dragPos: null,
    dragSelectPos: null,
    isDragSelecting: true,
    multiSelect: false,
    pendingPath: null,
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
}: Props) => {
    const mirrorTransforms = React.useMemo(
        () => getMirrorTransforms(state.mirrors),
        [state.mirrors],
    );

    const [editorState, setEditorState] = useState(initialEditorState);

    const menu = React.useRef<Menu>(null);

    const showMenu = React.useCallback(
        (evt: React.MouseEvent, items: MenuItem[]) => {
            evt.preventDefault();
            evt.stopPropagation();
            console.log('ok', menu, items);
            menu.current!.show(evt);
            setEditorState((state) => ({ ...state, items }));
            // setItems(items);
            const { clientX, clientY } = evt;
            setTimeout(() => {
                const el = menu.current!.getElement();
                el.style.top = clientY + 'px';
                el.style.left = clientX + 'px';
                console.log('ok', el);
            }, 10);
        },
        [],
    );

    let view = React.useMemo(() => {
        let view = editorState.tmpView ?? state.view;
        return { ...state.view, center: view.center, zoom: view.zoom };
    }, [state.view, editorState.tmpView]);

    const guidePrimitives = React.useMemo(() => {
        const elements = calculateGuideElements(state.guides, mirrorTransforms);
        const points = elements.flatMap((el) => geomPoints(el.geom));
        return {
            primitives: primitivesForElementsAndPaths(
                elements,
                Object.keys(state.paths)
                    .filter(
                        (k) =>
                            !state.paths[k].hidden &&
                            (!state.paths[k].group ||
                                !state.pathGroups[state.paths[k].group!].hide),
                    )
                    .map((k) => state.paths[k]),
            ),
            points,
        };
    }, [state.guides, state.paths, state.pathGroups, mirrorTransforms]);

    const allIntersections = React.useMemo(() => {
        const { coords: fromGuides, seenCoords } = calcAllIntersections(
            guidePrimitives.primitives.map((p) => p.prim),
            guidePrimitives.points,
        );
        return fromGuides;
    }, [guidePrimitives, state.paths, state.pathGroups]);

    const svgContents = SVGCanvas({
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
            {svgContents}
            {view.texture ? (
                <RenderWebGL
                    state={state}
                    texture={view.texture}
                    width={width}
                    height={height}
                />
            ) : null}
            {editorState.tmpView
                ? zoomPanControls(
                      setEditorState,
                      state,
                      editorState.tmpView,
                      dispatch,
                  )
                : null}
            <div
                css={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                }}
                className="p-2 flex flex-column"
            >
                <Button
                    className={
                        'pi p-button-icon-only ' +
                        (state.pending == null && editorState.isDragSelecting
                            ? 'p-button-outlined'
                            : '')
                    }
                    tooltip="Select"
                    onClick={() => {
                        if (state.pending != null) {
                            dispatch({ type: 'pending:type', kind: null });
                            setEditorState((es) => ({
                                ...es,
                                isDragSelecting: true,
                            }));
                        } else {
                            setEditorState((es) => ({
                                ...es,
                                isDragSelecting: !es.isDragSelecting,
                            }));
                        }
                    }}
                >
                    <ToolIcon
                        lines={[
                            [
                                { x: 2, y: 0 },
                                push({ x: 2, y: 0 }, Math.PI / 4, 10),
                                push({ x: 2, y: 0 }, Math.PI / 2, 10),
                                { x: 2, y: 0 },
                            ],
                        ]}
                    />
                </Button>
                <Button
                    tooltip="Pan (or shift+scroll)"
                    icon="pi pi-arrows-alt"
                    className={
                        'mt-2 ' +
                        (state.pending == null && !editorState.isDragSelecting
                            ? 'p-button-outlined'
                            : '')
                    }
                    onClick={() => {
                        if (state.pending != null) {
                            dispatch({ type: 'pending:type', kind: null });
                            setEditorState((es) => ({
                                ...es,
                                isDragSelecting: false,
                            }));
                        } else {
                            setEditorState((es) => ({
                                ...es,
                                isDragSelecting: !es.isDragSelecting,
                            }));
                        }
                    }}
                />
                {Object.entries({
                    Line: (
                        <ToolIcon
                            points={[
                                { x: 0, y: 0 },
                                { x: 10, y: 10 },
                            ]}
                            lines={[
                                [
                                    { x: 0, y: 0 },
                                    { x: 10, y: 10 },
                                ],
                            ]}
                        />
                    ),
                    Perpendicular: (
                        <ToolIcon
                            points={[
                                { x: 5, y: 2 },
                                { x: 5, y: 10 },
                            ]}
                            lines={[
                                [
                                    { x: -2, y: 2 },
                                    { x: 12, y: 2 },
                                ],
                            ]}
                        />
                    ),
                    PerpendicularBisector: (
                        <ToolIcon
                            points={[
                                { x: 0, y: 5 },
                                { x: 10, y: 5 },
                            ]}
                            lines={[
                                [
                                    { x: 5, y: -2 },
                                    { x: 5, y: 12 },
                                ],
                            ]}
                        />
                    ),
                    AngleBisector: (
                        <ToolIcon
                            points={[
                                { x: 0, y: 0 },
                                { x: 10, y: 10 },
                                { x: 0, y: 10 },
                            ]}
                            lines={[
                                [
                                    { x: 10, y: 0 },
                                    { x: 0, y: 10 },
                                ],
                            ]}
                        />
                    ),
                    Circle: (
                        <ToolIcon
                            circles={[[{ x: 5, y: 5 }, 5]]}
                            points={[
                                { x: 5, y: 0 },
                                { x: 5, y: 5 },
                            ]}
                        />
                    ),
                    CircumCircle: (
                        <ToolIcon
                            circles={[[{ x: 5, y: 5 }, 5]]}
                            points={[
                                push({ x: 5, y: 5 }, Math.PI / 4, 5),
                                push({ x: 5, y: 5 }, -Math.PI / 4, 5),
                                push({ x: 5, y: 5 }, Math.PI, 5),
                            ]}
                        />
                    ),
                    InCircle: (
                        <ToolIcon
                            circles={[[{ x: 3, y: 5 }, 3]]}
                            points={[
                                { x: 0, y: 0 },
                                { x: 0, y: 10 },
                                { x: 10, y: 5 },
                            ]}
                        />
                    ),
                }).map(([kind, icon]) => (
                    <Button
                        key={kind}
                        tooltip={kind + ` (${toTypeRev[kind]})`}
                        icon={
                            typeof icon === 'string' ? `pi ${icon}` : undefined
                        }
                        className={
                            'mt-2 p-button-icon-only ' +
                            (state.pending?.type === 'Guide' &&
                            state.pending.kind === kind
                                ? 'p-button-outlined'
                                : '')
                        }
                        onClick={() => {
                            state.pending?.type === 'Guide' &&
                            state.pending.kind === kind
                                ? dispatch({ type: 'pending:type', kind: null })
                                : dispatch({
                                      type: 'pending:type',
                                      kind: kind as GuideGeom['type'],
                                  });
                        }}
                        children={typeof icon === 'string' ? undefined : icon}
                    />
                ))}
            </div>
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
                {pendingMirror ? (
                    mirrorControls(setPendingMirror, pendingMirror)
                ) : pendingDuplication ? (
                    duplicationControls(
                        setPendingDuplication,
                        pendingDuplication,
                    )
                ) : state.selection ? (
                    selectionSection(
                        dispatch,
                        editorState.isDragSelecting,
                        setEditorState,
                        state,
                        editorState.multiSelect,
                        setPendingDuplication,
                    )
                ) : (
                    <GuideSection
                        state={state}
                        dispatch={dispatch}
                        setDragSelect={(fn) =>
                            setEditorState((state) => ({
                                ...state,
                                isDragSelecting: fn(state.isDragSelecting),
                            }))
                        }
                        dragSelect={editorState.isDragSelecting}
                        setHover={setHover}
                    />
                )}
                {editorState.pendingPath ? (
                    <PendingPathControls
                        editorState={editorState}
                        setEditorState={setEditorState}
                        allIntersections={allIntersections}
                        guidePrimitives={guidePrimitives.primitives}
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
            <Menu model={editorState.items as any} popup ref={menu} />
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
            <div css={{ display: 'flex' }}>
                <div
                    css={{
                        padding: 10,
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        cursor: 'pointer',
                        ':hover': {
                            backgroundColor: 'rgba(255,255,255,0.5)',
                        },
                    }}
                    onClick={() =>
                        setEditorState((state) => ({ ...state, tmpView: null }))
                    }
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
                    setEditorState((state) => ({ ...state, tmpView: null }));
                }}
            >
                Commit
            </div>
        </div>
    );
}

export function timelineSegments(timeline: FloatLerp) {
    const segments: Array<TLSegment> = [];
    const points = timeline.points.slice();
    if (!points.length || points[0].pos.x > 0) {
        points.unshift({ pos: { x: 0, y: 0 } });
    }
    if (points[points.length - 1].pos.x < 1 - epsilon) {
        points.push({ pos: { x: 1, y: 1 } });
    }
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const now = points[i];
        segments.push(segmentForPoints(prev, now));
    }
    return segments;
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
                <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    fill="none"
                    stroke="currentColor"
                />
            ))}
        </svg>
    );
};
