/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import Prando from 'prando';
import React from 'react';
import { RoughGenerator } from 'roughjs/bin/generator';
import { PendingMirror, useCurrent } from './App';
import { ensureClockwise } from './CanvasRender';
import { clipPath, closeEnough } from './clipPath';
import {
    findSelection,
    pathToPrimitives,
    segmentToPrimitive,
} from './findSelection';
// import { DrawPath } from './DrawPathOld';
import { angleTo, dist, getMirrorTransforms } from './getMirrorTransforms';
import { calculateBounds, Guides } from './Guides';
import { handleSelection } from './handleSelection';
import { mergeFills, mergeStyleLines } from './MultiStyleForm';
import { Overlay } from './Overlay';
import {
    pathsAreIdentical,
    pathToReversedSegmentKeys,
    pathToSegmentKeys,
} from './pathsAreIdentical';
import { paletteColor, RenderPath } from './RenderPath';
import { insetPath, pruneInsetPath, simplifyPath } from './insetPath';
import { RenderPrimitive } from './RenderPrimitive';
import { RenderWebGL } from './RenderWebGL';
import { showHover } from './showHover';
import { Hover } from './Sidebar';
import {
    Action,
    ArcSegment,
    Coord,
    Path,
    PathGroup,
    Segment,
    State,
    Style,
    View,
} from './types';
import { useDragSelect, useMouseDrag } from './useMouseDrag';
import { useScrollWheel } from './useScrollWheel';
import { segmentKey, segmentKeyReverse } from './DrawPath';
import { coordKey, numKey } from './calcAllIntersections';
import { isAngleBetween } from './findNextSegments';

export type Props = {
    state: State;
    dragSelect: boolean;
    cancelDragSelect: () => void;
    width: number;
    height: number;
    innerRef: (node: SVGSVGElement | null) => unknown;
    pendingMirror: PendingMirror | null;
    setPendingMirror: (
        mirror:
            | (PendingMirror | null)
            | ((mirror: PendingMirror | null) => PendingMirror | null),
    ) => void;
    dispatch: (action: Action) => unknown;
    hover: Hover | null;
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

// base64
export const imageCache: { [href: string]: string | false } = {};

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

export const Canvas = ({
    state,
    width,
    height,
    dispatch,
    innerRef,
    hover,
    pendingMirror,
    setPendingMirror,
    dragSelect,
    cancelDragSelect,
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

    const [zooming, setZooming] = React.useState(false);

    let view = React.useMemo(() => {
        let view = tmpView ?? state.view;
        return { ...state.view, center: view.center, zoom: view.zoom };
    }, [state.view, tmpView]);

    const { x, y } = viewPos(view, width, height);

    const ref = React.useRef(null as null | SVGSVGElement);

    useScrollWheel(ref, setTmpView, setZooming, currentState, width, height);

    const generator = React.useMemo(() => new RoughGenerator(), []);

    const [dragPos, setDragPos] = React.useState(
        null as null | { view: View; coord: Coord },
    );

    const [dragSelectPos, setDragSelect] = React.useState(null as null | Coord);

    const currentDrag = useCurrent({ pos, drag: dragSelectPos });

    const finishDrag = React.useCallback((shiftKey: boolean) => {
        cancelDragSelect();
        const { pos, drag } = currentDrag.current;
        if (!drag) {
            return;
        }
        console.log(pos, drag);
        const rect = rectForCorners(pos, drag);
        const selected = findSelection(
            currentState.current.paths,
            currentState.current.pathGroups,
            rect,
        );
        if (shiftKey && currentState.current.selection?.type === 'Path') {
            selected.push(
                ...currentState.current.selection.ids.filter(
                    (id) => !selected.includes(id),
                ),
            );
        }
        dispatch({
            type: 'selection:set',
            selection: { type: 'Path', ids: selected },
        });
    }, []);

    const mouseHandlers = dragSelect
        ? useDragSelect(
              dragSelectPos,
              width,
              height,
              view,
              setPos,
              setDragSelect,
              finishDrag,
          )
        : useMouseDrag(
              dragPos,
              setTmpView,
              width,
              height,
              view,
              setPos,
              setDragPos,
          );

    const clickPath = React.useCallback((evt, id) => {
        evt.stopPropagation();
        evt.preventDefault();
        const path = currentState.current.paths[id];
        handleSelection(path, currentState.current, dispatch, evt.shiftKey);
    }, []);

    const clip = state.view.activeClip
        ? state.clips[state.view.activeClip]
        : undefined;

    const pathsToShow = React.useMemo(
        () =>
            sortedVisibleInsetPaths(
                state.paths,
                state.pathGroups,
                clip,
                state.view.hideDuplicatePaths,
                state.view.laserCutMode
                    ? state.palettes[state.activePalette]
                    : undefined,
            ),
        [
            state.paths,
            state.pathGroups,
            clip,
            state.view.hideDuplicatePaths,
            state.view.laserCutMode,
        ],
    );

    const clipPrimitives = React.useMemo(
        () => (clip ? pathToPrimitives(clip) : null),
        [clip],
    );

    const dragged = dragSelectPos
        ? findSelection(
              currentState.current.paths,
              currentState.current.pathGroups,
              rectForCorners(pos, dragSelectPos),
          )
        : null;

    const backgroundColor =
        view.background != null
            ? paletteColor(state.palettes[state.activePalette], view.background)
            : null;

    const rand = React.useRef(new Prando('ok'));
    rand.current.reset();

    const bounds = React.useMemo(
        () => calculateBounds(width, height, view),
        [width, height, view],
    );

    return (
        <div
            css={{
                position: 'relative',
            }}
            // style={{ width, height }}
            onClick={(evt) => {
                // if (evt.target === evt.currentTarget) {
                if (state.selection && !evt.shiftKey) {
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
                <g transform={`translate(${x} ${y})`}>
                    {backgroundColor != null &&
                    backgroundColor !== 'transparent' ? (
                        <rect
                            width={width}
                            height={height}
                            x={-x}
                            y={-y}
                            stroke="none"
                            fill={backgroundColor}
                        />
                    ) : null}
                    {Object.keys(state.overlays)
                        .filter(
                            (id) =>
                                !state.overlays[id].hide &&
                                !state.overlays[id].over,
                        )
                        .map((id) => {
                            return (
                                <Overlay
                                    state={state}
                                    id={id}
                                    view={view}
                                    key={id}
                                    width={width}
                                    height={height}
                                    onUpdate={(overlay) =>
                                        dispatch({
                                            type: 'overlay:update',
                                            overlay,
                                        })
                                    }
                                />
                            );
                        })}

                    {pathsToShow.map((path, i) => (
                        <RenderPath
                            key={path.id + '-' + i}
                            generator={generator}
                            origPath={state.paths[path.id]}
                            groups={state.pathGroups}
                            rand={rand.current}
                            clip={clipPrimitives}
                            path={path}
                            zoom={view.zoom}
                            sketchiness={view.sketchiness}
                            palette={state.palettes[state.activePalette]}
                            onClick={
                                // TODO: Disable path clickies if we're doing guides, folks.
                                // pathOrigin
                                //     ? undefined :
                                clickPath
                            }
                        />
                    ))}

                    {Object.keys(state.overlays)
                        .filter(
                            (id) =>
                                !state.overlays[id].hide &&
                                state.overlays[id].over,
                        )
                        .map((id) => {
                            return (
                                <Overlay
                                    state={state}
                                    id={id}
                                    view={view}
                                    key={id}
                                    width={width}
                                    height={height}
                                    onUpdate={(overlay) =>
                                        dispatch({
                                            type: 'overlay:update',
                                            overlay,
                                        })
                                    }
                                />
                            );
                        })}

                    {view.guides ? (
                        <Guides
                            state={state}
                            dispatch={dispatch}
                            width={width}
                            height={height}
                            zooming={zooming}
                            view={view}
                            pos={pos}
                            mirrorTransforms={mirrorTransforms}
                            pendingMirror={pendingMirror}
                            setPendingMirror={setPendingMirror}
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
                                  view.zoom,
                                  bounds,
                                  true,
                              ),
                          )
                        : null}
                    {dragged
                        ? dragged.map((id) =>
                              showHover(
                                  id,
                                  { kind: 'Path', id },
                                  state,
                                  mirrorTransforms,
                                  width,
                                  height,
                                  view.zoom,
                                  bounds,
                                  false,
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
                                view.zoom,
                                bounds,
                                false,
                            )}
                        </>
                    ) : null}
                    {dragSelectPos ? (
                        <rect
                            x={Math.min(dragSelectPos.x, pos.x) * view.zoom}
                            y={Math.min(dragSelectPos.y, pos.y) * view.zoom}
                            width={
                                Math.abs(dragSelectPos.x - pos.x) * view.zoom
                            }
                            height={
                                Math.abs(dragSelectPos.y - pos.y) * view.zoom
                            }
                            fill="rgba(255,255,255,0.2)"
                            stroke="red"
                            strokeWidth="2"
                        />
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
                    {` ${pos.x.toFixed(4)},${pos.y.toFixed(4)}`}
                </div>
            ) : null}
            {view.texture ? (
                <RenderWebGL state={state} texture={view.texture} />
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

function rectForCorners(pos: { x: number; y: number }, drag: Coord) {
    return {
        x1: Math.min(pos.x, drag.x),
        y1: Math.min(pos.y, drag.y),
        x2: Math.max(pos.x, drag.x),
        y2: Math.max(pos.y, drag.y),
    };
}

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

// This should produce:
// a list of lines
// and a list of fills
// lines come after fills? maybe? idk, that would make some things harder.
export function sortedVisibleInsetPaths(
    paths: { [key: string]: Path },
    pathGroups: { [key: string]: PathGroup },
    clip?: Array<Segment>,
    hideDuplicatePaths?: boolean,
    laserCutPalette?: Array<string>,
): Array<Path> {
    let visible = Object.keys(paths)
        .filter(
            (k) =>
                !paths[k].hidden &&
                (!paths[k].group || !pathGroups[paths[k].group!].hide),
        )
        .sort((a, b) => {
            const oa = paths[a].group
                ? pathGroups[paths[a].group!].ordering
                : paths[a].ordering;
            const ob = paths[b].group
                ? pathGroups[paths[b].group!].ordering
                : paths[b].ordering;
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

    if (hideDuplicatePaths) {
        const usedPaths: Array<Array<string>> = [];
        visible = visible.filter((k) => {
            const path = paths[k];
            const segments = simplifyPath(ensureClockwise(path.segments));
            const forward = pathToSegmentKeys(path.origin, segments);
            const backward = pathToReversedSegmentKeys(path.origin, segments);
            if (
                usedPaths.some(
                    (path) =>
                        pathsAreIdentical(path, backward) ||
                        pathsAreIdentical(path, forward),
                )
            ) {
                return false;
            }
            usedPaths.push(forward);
            return true;
        });
    }

    /*
    If it's clip first, go through and clip the paths, leaving the styles.
    if it's inset first, go through and inset the paths, ... ok yeah that's fine.
    */

    let clipPrims = clip ? pathToPrimitives(clip) : null;

    let processed: Array<Path> = visible
        .map((k) => paths[k])
        .map((path) => {
            const group = path.group ? pathGroups[path.group] : null;
            if (group?.insetBeforeClip) {
                return pathToInsetPaths(path)
                    .map((insetPath) => {
                        return clip
                            ? clipPath(
                                  insetPath,
                                  clip,
                                  clipPrims!,
                                  group?.clipMode,
                              )
                            : insetPath;
                    })
                    .flat();
            } else if (clip) {
                return clipPath(path, clip, clipPrims!, group?.clipMode)
                    .map((clipped) => pathToInsetPaths(clipped))
                    .flat();
            } else {
                return pathToInsetPaths(path);
            }
        })
        .flat();

    if (laserCutPalette) {
        // processed paths are singles at this point
        let red = processed.filter((path) => {
            if (path.style.lines.length !== 1) {
                return;
            }
            const color = paletteColor(
                laserCutPalette,
                path.style.lines[0]?.color,
            );
            return color === 'red';
        });
        let blue = processed.filter((path) => {
            if (path.style.lines.length !== 1) {
                return;
            }
            const color = paletteColor(
                laserCutPalette,
                path.style.lines[0]?.color,
            );
            return color === 'blue';
        });
        let others = processed.filter((path) => {
            if (path.style.lines.length !== 1) {
                return true;
            }
            const color = paletteColor(
                laserCutPalette,
                path.style.lines[0]?.color,
            );
            return color !== 'red' && color !== 'blue';
        });
        type Used = { [centerRad: string]: Array<[number, number, number]> };
        const used: { red: Used; blue: Used } = { red: {}, blue: {} };

        // let usedSegments: { red: Array<string>; blue: Array<string> } = {
        //     red: [],
        //     blue: [],
        // };
        // ughhhhh ok this is a lot harder because i've simplified paths ....
        const addToUsed = (path: Path, used: Used, pi: number) => {
            path.segments.forEach((seg, i) => {
                const prev = i === 0 ? path.origin : path.segments[i - 1].to;
                if (seg.type === 'Arc') {
                    let t0 = angleTo(seg.center, prev);
                    let t1 = angleTo(seg.center, seg.to);
                    const key = `${coordKey(seg.center)}:${numKey(
                        dist(seg.center, seg.to),
                    )}`;
                    if (!used[key]) {
                        used[key] = [];
                    }
                    used[key].push(seg.clockwise ? [t0, t1, pi] : [t1, t0, pi]);
                }
            });
        };

        // Register all arc segments.
        red.forEach((path, pi) => addToUsed(path, used.red, pi));
        blue.forEach((path, pi) => addToUsed(path, used.blue, pi));

        const isEntirelyWithin = (
            prev: Coord,
            seg: Segment,
            pi: number,
            used: Used,
            otherWins: boolean,
        ) => {
            if (seg.type === 'Line') {
                // TODO:
                return false;
            }
            const key = `${coordKey(seg.center)}:${numKey(
                dist(seg.center, seg.to),
            )}`;
            let t0 = angleTo(seg.center, prev);
            let t1 = angleTo(seg.center, seg.to);
            if (!seg.clockwise) {
                [t0, t1] = [t1, t0];
            }
            if (
                used[key] &&
                used[key].find(([ot0, ot1, opi]) => {
                    if (opi === pi) {
                        return false;
                    }
                    // If exactly equal, the "lower id" number wins, I don't make the rules.
                    if (closeEnough(ot0, t0) && closeEnough(ot1, t1)) {
                        return otherWins || pi < opi;
                    }
                    return (
                        pi !== opi &&
                        isAngleBetween(ot0, t0, ot1, true) &&
                        isAngleBetween(ot0, t1, ot1, true)
                    );
                })
            ) {
                return true;
            }
            return false;
        };

        const removeOverlays = (
            path: Path,
            pi: number,
            used: Used,
            other?: Used,
        ) => {
            const finished: Array<Path> = [];
            let current: Path = { ...path, segments: [], open: true };
            // const used = usedSegments.red;
            path.segments.forEach((seg, i) => {
                const prev = i === 0 ? path.origin : path.segments[i - 1].to;
                const key = segmentKey(prev, seg);
                const keyRev = segmentKeyReverse(prev, seg);
                const shouldDrop =
                    isEntirelyWithin(prev, seg, pi, used, false) ||
                    (other && isEntirelyWithin(prev, seg, pi, other, true));
                if (shouldDrop) {
                    // console.log(`used!`, key);
                    // finish off the current one
                    if (current.segments.length) {
                        finished.push(current);
                    }
                    // start a new one at this one's end
                    current = {
                        ...path,
                        open: true,
                        segments: [],
                        origin: seg.to,
                    };
                    return;
                }
                current.segments.push(seg);
            });
            if (finished.length) {
                return current.segments.length
                    ? finished.concat([current])
                    : finished;
            } else {
                return [path];
            }
        };

        red = red.map((path, pi) => removeOverlays(path, pi, used.red)).flat();
        blue = blue
            .map((path, pi) => removeOverlays(path, pi, used.blue, used.red))
            .flat();
        // return others.concat()
        return others.concat(blue).concat(red);
    }

    return processed;
}

export const pathToInsetPaths = (path: Path) => {
    const singles: Array<[Path, number | undefined]> = [];
    path.style.fills.forEach((fill) => {
        if (!fill) {
            return;
        }
        singles.push([
            {
                ...path,
                style: {
                    fills: [{ ...fill, inset: undefined }],
                    lines: [],
                },
            },
            fill.inset,
        ]);
    });
    path.style.lines.forEach((line) => {
        if (!line) {
            return;
        }
        singles.push([
            {
                ...path,
                style: {
                    lines: [{ ...line, inset: undefined }],
                    fills: [],
                },
            },
            line.inset,
        ]);
    });
    // const result = insetPath(path)
    return singles
        .map(([path, inset]) => {
            if (!inset) {
                return [path];
            }
            const result = insetPath(path, inset / 100);
            return pruneInsetPath(result.segments)
                .filter((s) => s.length)
                .map((segments) => ({
                    ...result,
                    segments,
                    origin: segments[segments.length - 1].to,
                }));
            // return [result];
        })
        .flat();
};
