import Prando from 'prando';
import * as React from 'react';
// import {RoughGenerator} from 'roughjs/bin/generator';
import {rgbToHsl} from '../rendering/colorConvert';
import {angleBetween} from '../rendering/isAngleBetween';
import {angleTo, dist, push} from '../rendering/getMirrorTransforms';
import {Primitive} from '../rendering/intersect';
import {Coord, Path, PathGroup, Segment, State} from '../types';
import {StyleHover} from './StyleHover';
import {useTouchClick} from './RenderIntersections';
// import { DebugOrigPath } from './DebugOrigPath';
import {MenuItem} from './Canvas';
import {Action} from '../state/Action';
import {normalizedPath} from '../rendering/sortedVisibleInsetPaths';
import {pathToSegmentKeys} from '../rendering/pathsAreIdentical';
import {segmentsCenter} from './Bounds';
import {calcPathD} from './calcPathD';

export class RoughGenerator {
    // biome-ignore lint: nope
    path(raw: string, options: any): 'path' {
        return 'path';
    }
    toPaths(paths: 'path'): {stroke: string; d: string; fill: string; strokeWidth: string}[] {
        return [];
    }
}

export class RoughCanvas extends RoughGenerator {
    generator: RoughGenerator;
    // biome-ignore lint: nope
    constructor(canvas: any) {
        super();
        // biome-ignore lint: nope
        this.generator = null as any;
    }
}

// export type RoughGenerator = {
//     path: (raw: string, options: any) => 'path';
//     toPaths: (paths: 'path') => {stroke: string; d: string; fill: string; strokeWidth: string}[];
// };

export const UnderlinePath = ({path, zoom, color}: {path: Path; zoom: number; color: string}) => {
    const d = calcPathD(path, zoom);

    return (
        <path
            d={d}
            // strokeWidth={2}
            strokeWidth={4}
            stroke={color}
            style={{pointerEvents: 'none'}}
            // fill="white"
            fill="none"
            strokeDasharray="5 10"
            strokeLinecap="square"
            strokeLinejoin="round"
        />
    );
};

const RenderPathMemo = ({
    path,
    origPath,
    zoom,
    sketchiness,
    groups,
    onClick,
    palette,
    generator,
    rand,
    clip,
    styleHover,
    contextMenu,
}: {
    contextMenu?: {
        state: State;
        dispatch: (action: Action) => void;
        showMenu: (evt: React.MouseEvent, items: MenuItem[]) => void;
    };
    path: Path;
    rand?: Prando;
    origPath?: Path;
    generator?: RoughGenerator;
    styleHover: StyleHover | null;
    clip?: {prims: Array<Primitive>; segments: Array<Segment>} | null;
    zoom: number;
    sketchiness: number | undefined;
    groups: {[key: string]: PathGroup};
    onClick?: (shiftKey: boolean, id: string) => void;
    palette: Array<string>;
}) => {
    const d = calcPathD(path, zoom);
    if (path.debug) {
        // console.log('DEBUG', path, d);
    }
    const style = path.style;
    const handlers = useTouchClick<null>(() => (onClick ? onClick(false, path.id) : null));

    // const insetPaths =
    //
    const fills = style.fills.map((fill, i) => {
        if (!fill) {
            return null;
        }
        const color = paletteColor(palette, fill.color, fill.lighten);
        if (color === 'transparent') {
            return null;
        }

        const common = {
            key: `fill-${i}`,
            fillOpacity: fill.opacity,
            stroke: 'none',
            style: onClick
                ? {
                      cursor: 'pointer',
                  }
                : {},
            onMouseDown: onClick ? (evt: React.MouseEvent) => evt.preventDefault() : undefined,
            fill: color,
            onClick: onClick
                ? (evt: React.MouseEvent) => {
                      evt.stopPropagation();
                      evt.preventDefault();
                      onClick(evt.shiftKey, path.id);
                  }
                : undefined,
            ...handlers(null),
        };
        if (path.segments.length === 1 && path.segments[0].type === 'Arc') {
            let r = dist(path.segments[0].center, path.segments[0].to);
            if (fill.inset) {
                r -= fill.inset / 100;
            }
            // it's full circle
            return (
                <circle
                    cx={path.segments[0].center.x * zoom}
                    cy={path.segments[0].center.y * zoom}
                    r={r * zoom}
                    {...common}
                />
            );
        }

        let raw = d;
        // let newPath = path;

        let pathInfos = [{path, raw}];

        return pathInfos.map(({path: newPath, raw}, k) => {
            if (generator && sketchiness && sketchiness > 0) {
                const p = generator.path(raw, {
                    fill: common.fill,
                    fillStyle: 'solid',
                    seed: idSeed(path.id),
                    roughness: sketchiness,
                    stroke: 'none',
                });
                const info = generator.toPaths(p);
                return info.map((info, i) => (
                    <path
                        key={`${k}:${i}`}
                        d={info.d}
                        stroke={info.stroke}
                        fill={info.fill !== 'none' ? info.fill : common.fill}
                        strokeWidth={info.strokeWidth}
                        onContextMenu={
                            contextMenu
                                ? (evt) => {
                                      evt.preventDefault();
                                      const {state, dispatch, showMenu} = contextMenu;
                                      showMenu(
                                          evt,
                                          itemsForPath(origPath ?? path, state, dispatch),
                                      );
                                  }
                                : undefined
                        }
                        style={common.style}
                    />
                ));
            }

            return (
                <React.Fragment key={`info-${i}-${k}`}>
                    <path
                        d={raw}
                        data-id={path.id}
                        onContextMenu={
                            contextMenu
                                ? (evt) => {
                                      evt.preventDefault();
                                      const {state, dispatch, showMenu} = contextMenu;
                                      showMenu(
                                          evt,
                                          itemsForPath(origPath ?? path, state, dispatch),
                                      );
                                  }
                                : undefined
                        }
                        {...common}
                        key={`info-${i}-${k}`}
                    />
                </React.Fragment>
            );
        });
    });
    const lines = style.lines.map((line, i) => {
        if (!line) {
            return null;
        }
        const color = paletteColor(palette, line.color, line.lighten);
        if (color === 'transparent') {
            return null;
        }

        const common = {
            key: `line-${i}`,
            stroke: color,
            opacity: line.opacity,
            strokeDasharray: line.dash
                ? line.dash.map((d) => ((d / 100) * zoom).toFixed(2)).join(' ')
                : undefined,
            fill: 'none',
            // roundedCorners ?
            // strokeLinejoin: 'round' as 'round',
            onClick: onClick
                ? (evt: React.MouseEvent) => {
                      evt.stopPropagation();
                      evt.preventDefault();
                      onClick(evt.shiftKey, path.id);
                  }
                : undefined,
            onContextMenu: contextMenu
                ? (evt: React.MouseEvent) => {
                      evt.preventDefault();
                      const {state, dispatch, showMenu} = contextMenu;
                      showMenu(evt, itemsForPath(origPath ?? path, state, dispatch));
                  }
                : undefined,
            style: onClick
                ? {
                      cursor: 'pointer',
                  }
                : {},
            ...handlers(null),
            strokeWidth: line.width ? (line.width / 100) * zoom : 2,
            onMouseDown: onClick ? (evt: React.MouseEvent) => evt.preventDefault() : undefined,
        };
        if (path.segments.length === 1 && path.segments[0].type === 'Arc' && !path.open) {
            let r = dist(path.segments[0].center, path.segments[0].to);
            if (line.inset) {
                r -= line.inset / 100;
            }
            // it's full circle
            return (
                <circle
                    cx={path.segments[0].center.x * zoom}
                    cy={path.segments[0].center.y * zoom}
                    r={r * zoom}
                    {...common}
                />
            );
        }

        let pathInfos = [{path, raw: d}];

        return pathInfos.map(({raw}, k) => {
            if (generator && sketchiness && sketchiness > 0) {
                const p = generator.path(raw, {
                    fill: 'none',
                    seed: idSeed(path.id),
                    roughness: sketchiness,
                    stroke: common.stroke,
                    strokeWidth: common.strokeWidth,
                });
                const info = generator.toPaths(p);
                return info.map((info, i) => (
                    <path
                        key={`line-info-${i}:${k}`}
                        d={info.d}
                        stroke={info.stroke}
                        fill={info.fill}
                        strokeWidth={info.strokeWidth}
                        onClick={common.onClick}
                        onMouseDown={common.onMouseDown}
                        onContextMenu={common.onContextMenu}
                        style={common.style}
                    />
                ));
            }

            return <path d={raw} data-id={path.id} {...common} key={`line-info-${i}-${k}`} />;
        });
    });
    return (
        <>
            {fills}
            {lines}
            {/* {path.debug && origPath ? (
                <DebugOrigPath
                    path={path}
                    origPath={origPath}
                    zoom={zoom}
                    clip={clip}
                />
            ) : null} */}
        </>
    );
};

const normalizedKey = (path: Path) => {
    const norm = normalizedPath(path.segments);
    if (!norm) {
        console.warn('unable to normalize?');
        return null;
    }
    return pathToSegmentKeys(norm[0][norm[0].length - 1].to, norm[0]).join(':');
};

const selectPathIds = (state: State, event: React.MouseEvent, ids: string[]): Action => {
    return {
        type: 'selection:set',
        selection: {
            type: 'Path',
            ids:
                event.shiftKey && state.selection?.type === 'Path'
                    ? [...state.selection.ids, ...ids]
                    : ids,
        },
    };
};

const itemsForPath = (path: Path, state: State, dispatch: (action: Action) => void) => {
    console.log('ok', path);
    const select: MenuItem[] = [];

    const key = normalizedKey(path);
    if (key) {
        select.push({
            label: 'By shape',
            command({originalEvent}) {
                const ids = Object.keys(state.paths).filter(
                    (k) => normalizedKey(state.paths[k]) === key,
                );
                dispatch(selectPathIds(state, originalEvent, ids));
            },
        });
    }

    select.push({
        label: 'Clip to shape',
        command(event) {
            dispatch({
                type: 'clip:add',
                clip: path.segments,
            });
        },
    });

    select.push({
        label: 'Debug Path',
        command(event) {
            dispatch({
                type: 'path:update',
                id: path.id,
                path: {...path, debug: !path.debug},
            });
        },
    });

    path.style.fills.forEach((fill) => {
        if (fill) {
            const color = fill.color;
            const full = paletteColor(state.palette, fill.color, fill.lighten);
            select.push({
                label: (
                    <span>
                        {colorSquare(full, 0)}
                        by fill
                    </span>
                ),
                command({originalEvent}) {
                    const ids = Object.keys(state.paths).filter((id) =>
                        state.paths[id].style.fills.find((fill) => fill && fill.color === color),
                    );
                    dispatch(selectPathIds(state, originalEvent, ids));
                },
            });
        }
    });

    path.style.lines.forEach((line) => {
        if (line) {
            const color = line.color;
            const full = paletteColor(state.palette, line.color, line.lighten);
            select.push({
                label: (
                    <span>
                        {colorSquare(full, 0)}
                        by line
                    </span>
                ),
                command({originalEvent}) {
                    const ids = Object.keys(state.paths).filter((id) =>
                        state.paths[id].style.lines.find((line) => line && line.color === color),
                    );
                    dispatch(selectPathIds(state, originalEvent, ids));
                },
            });
        }
    });

    const items: MenuItem[] = [];
    items.push({
        label: 'Center on this shape',
        command({originalEvent}) {
            const center = segmentsCenter(path.segments);
            dispatch({
                type: 'view:update',
                view: {...state.view, center: {x: -center.x, y: -center.y}},
            });
        },
    });
    items.push({
        label: 'Select',
        items: select,
    });
    return items;
};

export const emptyPath: Path = {
    created: 0,
    group: null,
    hidden: false,
    open: false,
    id: '',
    ordering: 0,
    style: {
        lines: [],
        fills: [],
    },
    clipMode: 'normal',
    segments: [],
    origin: {x: 0, y: 0},
};

export const pathSegs = (segments: Array<Segment>): Path => ({
    created: 0,
    group: null,
    hidden: false,
    open: false,
    id: '',
    ordering: 0,
    style: {
        lines: [],
        fills: [],
    },
    clipMode: 'normal',

    segments,
    origin: segments[segments.length - 1].to,
});

export const RenderPath = React.memo(RenderPathMemo);

export const lightenedColor = (
    palette: Array<string>,
    color: string | number | undefined,
    lighten?: number,
) => {
    if (color == null) {
        return undefined;
    }
    const raw = typeof color === 'number' ? palette[color] : color;
    if (raw?.startsWith('http')) {
        return raw;
    }
    if (raw && lighten != null && lighten !== 0) {
        if (raw.startsWith('#')) {
            if (raw.length === 7) {
                const r = parseInt(raw.slice(1, 3), 16);
                const g = parseInt(raw.slice(3, 5), 16);
                const b = parseInt(raw.slice(5), 16);
                let [h, s, l] = rgbToHsl(r, g, b);
                return `hsl(${(h * 360).toFixed(3)}, ${(s * 100).toFixed(3)}%, ${(
                    (l + lighten * 0.1) * 100
                ).toFixed(3)}%)`;
            }
        }
    }
    return raw ?? '#aaa';
};

export const paletteColor = (
    palette: Array<string>,
    color: string | number | undefined | null,
    lighten?: number,
) => {
    if (color == null) {
        return undefined;
    }
    const raw = lightenedColor(palette, color, lighten);
    return raw?.startsWith('http') ? `url(#palette-${color})` : raw;
};

export const idSeed = (id: string) => {
    if (id.startsWith('id-')) {
        return parseInt(id.slice('id-'.length));
    }
    let num = 0;
    for (let i = 0; i < id.length; i++) {
        num += id.charCodeAt(i);
    }
    return num;
};

export function colorSquare(full: string | undefined, i: number) {
    return (
        <div
            key={i}
            style={{
                width: '1em',
                height: '1em',
                marginBottom: -2,
                backgroundColor: full,
                border: '1px solid white',
                display: 'inline-block',
                marginRight: 8,
            }}
        />
    );
}

function segmentArrow(prev: Coord, i: number, seg: Segment, zoom = 1, size = 2) {
    // biome-ignore lint: this one is fine
    let mid;
    if (seg.type === 'Line') {
        mid = {
            x: (seg.to.x + prev.x) / 2,
            y: (seg.to.y + prev.y) / 2,
        };
    } else if (seg.type === 'Quad') {
        throw new Error('noa');
    } else {
        const t0 = angleTo(seg.center, prev);
        const tb = angleBetween(t0, angleTo(seg.center, seg.to), seg.clockwise);
        mid = push(seg.center, t0 + (tb / 2) * (seg.clockwise ? 1 : -1), dist(seg.center, seg.to));
    }
    mid = {x: mid.x * zoom, y: mid.y * zoom};
    const theta = angleTo(prev, seg.to);
    const show = (p: Coord) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    return (
        <polygon
            points={[
                push(mid, theta, size * 2),
                push(mid, theta + (Math.PI * 2) / 3, size),
                push(mid, theta + (Math.PI * 4) / 3, size),
            ]
                .map(show)
                .join(' ')}
            fill="purple"
            stroke="white"
            strokeWidth={0.5}
            key={i}
        />
    );
}
