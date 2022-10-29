import Prando from 'prando';
import * as React from 'react';
import { RoughGenerator } from 'roughjs/bin/generator';
import { rgbToHsl } from '../rendering/colorConvert';
import { angleBetween } from '../rendering/findNextSegments';
import { angleTo, dist, push } from '../rendering/getMirrorTransforms';
import { Primitive } from '../rendering/intersect';
import { Coord, Path, PathGroup, Segment } from '../types';
import { StyleHover } from './MultiStyleForm';
import { useTouchClick } from './RenderIntersections';
import { arcPath } from './RenderPendingPath';
import { DebugOrigPath } from './DebugOrigPath';

export const UnderlinePath = ({
    path,
    zoom,
    color,
}: {
    path: Path;
    zoom: number;
    color: string;
}) => {
    const d = calcPathD(path, zoom);

    return (
        <path
            d={d}
            strokeWidth={4}
            stroke={color}
            style={{ pointerEvents: 'none' }}
            fill="none"
            strokeDasharray="5 10"
            strokeLinecap="square"
            strokeLinejoin="round"
        />
    );
};

export const calcPathD = (path: Path, zoom: number): string => {
    return calcSegmentsD(path.segments, path.origin, path.open, zoom);
};

export const calcSegmentsD = (
    segments: Array<Segment>,
    origin: Coord,
    open: boolean | undefined,
    zoom: number,
): string => {
    let d = `M ${origin.x * zoom} ${origin.y * zoom}`;
    if (segments.length === 1 && segments[0].type === 'Arc') {
        const arc = segments[0];
        const { center, to } = arc;
        const r = dist(center, to);
        const theta = angleTo(to, center);
        const opposite = push(center, theta, r);
        return calcSegmentsD(
            [{ ...arc, to: opposite }, arc],
            origin,
            open,
            zoom,
        );
        // this can only happen if we're a pure cicle
    }
    segments.forEach((seg, i) => {
        if (seg.type === 'Line') {
            d += ` L ${seg.to.x * zoom} ${seg.to.y * zoom}`;
        } else {
            const prev = i === 0 ? origin : segments[i - 1].to;
            d += arcPath(seg, prev, zoom);
        }
    });

    return d + (open ? '' : ' Z');
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
}: {
    rand?: Prando;
    generator?: RoughGenerator;
    path: Path;
    styleHover: StyleHover | null;
    origPath?: Path;
    clip?: { prims: Array<Primitive>; segments: Array<Segment> } | null;
    zoom: number;
    sketchiness: number | undefined;
    groups: { [key: string]: PathGroup };
    onClick?: (shiftKey: boolean, id: string) => void;
    palette: Array<string>;
}) => {
    const d = calcPathD(path, zoom);
    const style = path.style;
    const handlers = useTouchClick<null>(() =>
        onClick ? onClick(false, path.id) : null,
    );

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
            onMouseDown: onClick
                ? (evt: React.MouseEvent) => evt.preventDefault()
                : undefined,
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

        let pathInfos = [{ path, raw }];

        return pathInfos.map(({ path: newPath, raw }, k) => {
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
                        fill={info.fill != 'none' ? info.fill : common.fill}
                        strokeWidth={info.strokeWidth}
                        // onClick={common.onClick}
                        // onMouseDown={common.onMouseDown}
                        style={common.style}
                    />
                ));
            }

            return (
                <React.Fragment key={`info-${i}-${k}`}>
                    <path
                        data-id={path.id}
                        d={raw}
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
            strokeDasharray: line.dash
                ? line.dash.map((d) => ((d / 100) * zoom).toFixed(2)).join(' ')
                : undefined,
            fill: 'none',
            strokeLinejoin: 'round' as 'round',
            onClick: onClick
                ? (evt: React.MouseEvent) => {
                      evt.stopPropagation();
                      evt.preventDefault();
                      onClick(evt.shiftKey, path.id);
                  }
                : undefined,
            style: onClick
                ? {
                      cursor: 'pointer',
                  }
                : {},
            ...handlers(null),
            strokeWidth: line.width ? (line.width / 100) * zoom : 0,
            onMouseDown: onClick
                ? (evt: React.MouseEvent) => evt.preventDefault()
                : undefined,
        };
        if (
            path.segments.length === 1 &&
            path.segments[0].type === 'Arc' &&
            !path.open
        ) {
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

        let pathInfos = [{ path, raw: d }];

        return pathInfos.map(({ raw }, k) => {
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
                        style={common.style}
                    />
                ));
            }

            return (
                <path
                    d={raw}
                    data-id={path.id}
                    {...common}
                    key={`line-info-${i}-${k}`}
                />
            );
        });
    });
    return (
        <>
            {fills}
            {lines}
            {path.debug && origPath ? (
                <DebugOrigPath
                    path={path}
                    origPath={origPath}
                    zoom={zoom}
                    clip={clip}
                />
            ) : null}
        </>
    );
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
    origin: { x: 0, y: 0 },
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
                return `hsl(${h * 360}, ${s * 100}%, ${
                    (l + lighten * 0.1) * 100
                }%)`;
            }
        }
    }
    return raw ?? '#aaa';
};

export const paletteColor = (
    palette: Array<string>,
    color: string | number | undefined,
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

export function segmentArrow(
    prev: Coord,
    i: number,
    seg: Segment,
    zoom = 1,
    size = 2,
) {
    let mid;
    if (seg.type === 'Line') {
        mid = {
            x: (seg.to.x + prev.x) / 2,
            y: (seg.to.y + prev.y) / 2,
        };
    } else {
        const t0 = angleTo(seg.center, prev);
        const tb = angleBetween(t0, angleTo(seg.center, seg.to), seg.clockwise);
        mid = push(
            seg.center,
            t0 + (tb / 2) * (seg.clockwise ? 1 : -1),
            dist(seg.center, seg.to),
        );
    }
    mid = { x: mid.x * zoom, y: mid.y * zoom };
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
