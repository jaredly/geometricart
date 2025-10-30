import * as React from 'react';
import {angleBetween} from '../rendering/isAngleBetween';
import {angleTo, dist, push} from '../rendering/getMirrorTransforms';
import {Coord, Path, Segment, State} from '../types';
// import { DebugOrigPath } from './DebugOrigPath';
import {MenuItem} from './Canvas.MenuItem.related';
import {Action} from '../state/Action';
import {normalizedPath} from '../rendering/sortedVisibleInsetPaths';
import {pathToSegmentKeys} from '../rendering/pathsAreIdentical';
import {segmentsCenter} from './Bounds';
import {calcPathD} from './calcPathD';
import {paletteColor} from './RenderPath.lightenedColor.related';
import {colorSquare} from './colorSquare';

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

export const itemsForPath = (path: Path, state: State, dispatch: (action: Action) => void) => {
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

function segmentArrow(prev: Coord, i: number, seg: Segment, zoom = 1, size = 2) {
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
