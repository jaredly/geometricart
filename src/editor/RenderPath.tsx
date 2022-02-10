import Prando from 'prando';
import * as React from 'react';
import { RoughGenerator } from 'roughjs/bin/generator';
import { insidePath, windingNumber } from '../rendering/clipPath';
import { rgbToHsl } from '../rendering/colorConvert';
import {
    findInsidePoint,
    findRegions,
    segmentsToNonIntersectingSegments,
} from '../rendering/findInternalRegions';
import { angleBetween } from '../rendering/findNextSegments';
import { angleTo, dist, push } from '../rendering/getMirrorTransforms';
import { insetSegmentsBeta } from '../rendering/insetPath';
import { Primitive } from '../rendering/intersect';
import { isClockwise } from '../rendering/pathToPoints';
import { Coord, Path, PathGroup, Segment } from '../types';
import { pathToPrimitives } from './findSelection';
import { StyleHover } from './MultiStyleForm';
import { useTouchClick } from './RenderIntersections';
import { arcPath } from './RenderPendingPath';
import { RenderSegmentBasic } from './RenderSegment';

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

export const calcPathD = (path: Path, zoom: number) => {
    let d = `M ${path.origin.x * zoom} ${path.origin.y * zoom}`;
    if (path.segments.length === 1) {
        // this can only happen if we're a pure cicle
    }
    path.segments.forEach((seg, i) => {
        if (seg.type === 'Line') {
            d += ` L ${seg.to.x * zoom} ${seg.to.y * zoom}`;
        } else {
            const prev = i === 0 ? path.origin : path.segments[i - 1].to;
            d += arcPath(seg, prev, zoom);
        }
    });

    return d + (path.open ? '' : ' Z');
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
    clip?: Array<Primitive> | null;
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
        let lighten = fill.lighten;
        // if (fill.colorVariation && rand) {
        //     const off = rand.next(-1.0, 1.0) * fill.colorVariation;
        //     lighten = lighten != null ? lighten + off : off;
        // }
        const color = paletteColor(palette, fill.color, lighten);
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
        const color = paletteColor(palette, line.color);
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

        return pathInfos.map(({ path: newPath, raw }, k) => {
            // let raw = d;
            // let newPath = path;
            // if (line.inset) {
            //     const inset = insetPath(path, line.inset / 100);
            //     if (!inset) {
            //         return null;
            //     }
            //     newPath = inset;
            //     raw = calcPathD(newPath, zoom);
            // }

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
    clipMode: 'none',

    segments,
    origin: segments[segments.length - 1].to,
});

export const DebugOrigPath = ({
    origPath,
    zoom,
    clip,
    path,
}: {
    origPath: Path;
    path: Path;
    zoom: number;
    clip?: Array<Primitive> | null;
}) => {
    let inset: number | null = null;
    if (
        path.style.lines.length &&
        origPath.style.lines[path.style.lines[0]?.originalIdx!]?.inset
    ) {
        inset =
            origPath.style.lines[path.style.lines[0]!.originalIdx!]!.inset ??
            null;
    } else if (path.style.fills.length) {
        inset =
            origPath.style.fills[path.style.fills[0]!.originalIdx!]!.inset ??
            null;
    }
    let insetEls = null;
    if (inset != null) {
        const insetSegments = insetSegmentsBeta(origPath.segments, inset / 100);
        const primitives = pathToPrimitives(insetSegments);
        const parts = segmentsToNonIntersectingSegments(insetSegments);
        const regions = findRegions(parts.result, parts.froms); //.filter(isClockwise);
        console.log(parts);
        const colors = ['#0f0', '#00f', '#ff0', '#f0f', '#0ff', '#aaa', '#555'];
        let mode = 0;
        if (mode === 0) {
            insetEls = (
                <>
                    <path
                        d={calcPathD(origPath, zoom)}
                        fill="none"
                        stroke="white"
                        strokeWidth={1}
                    />
                    <path
                        d={calcPathD(pathSegs(insetSegments), zoom)}
                        fill="none"
                        stroke="red"
                        strokeWidth={1}
                    />
                    {parts.result.map((part, i) => (
                        <RenderSegmentBasic
                            zoom={zoom}
                            segment={part.segment}
                            prev={part.prev}
                            key={i}
                            inner={{
                                stroke: 'red',
                                strokeDasharray: '5 5',
                            }}
                        />
                    ))}
                    {/* {regions.map((region, i) => (
                        <path
                            d={calcPathD(pathSegs(region), zoom)}
                            fill={colors[i % colors.length]}
                            key={i}
                            stroke="white"
                            strokeWidth={1}
                        />
                    ))} */}
                    {parts.result.map((part, i) =>
                        segmentArrow(
                            part.prev,
                            i,
                            part.segment,
                            zoom,
                            Math.max(5, Math.min(10, (1 / 100) * zoom)),
                        ),
                    )}
                    {regions.map((region, ri) => {
                        return region.map((seg, i) => {
                            const prev =
                                region[i === 0 ? region.length - 1 : i - 1].to;
                            const next = region[(i + 1) % region.length];
                            const res = findInsidePoint(
                                prev,
                                seg,
                                next,
                                25 / zoom,
                            );
                            if (!res) {
                                return;
                            }
                            let [t0, t1, pos, p0] = res;

                            const wind = windingNumber(
                                pos,
                                primitives,
                                insetSegments,
                                false,
                            );
                            const wcount = wind.reduce(
                                (c, w) => (w.up ? 1 : -1) + c,
                                0,
                            );
                            const scalePos = (p: Coord) => ({
                                x: p.x * zoom,
                                y: p.y * zoom,
                            });

                            pos = scalePos(pos);
                            p0 = scalePos(p0);
                            const pa = push(p0, t0, 35);
                            const pb = push(p0, t1, 30);

                            return (
                                <g key={`${ri}-${i}`}>
                                    <line
                                        x1={p0.x}
                                        y1={p0.y}
                                        x2={pa.x}
                                        y2={pa.y}
                                        stroke="white"
                                        strokeWidth={3}
                                    />
                                    <line
                                        x1={p0.x}
                                        y1={p0.y}
                                        x2={pb.x}
                                        y2={pb.y}
                                        stroke="black"
                                        strokeWidth={3}
                                    />
                                    <line
                                        x1={p0.x}
                                        y1={p0.y}
                                        x2={pos.x}
                                        y2={pos.y}
                                        stroke={wcount === 0 ? 'red' : '#af0'}
                                        strokeWidth={3}
                                    />
                                </g>
                            );
                        });
                    })}
                </>
            );
        } else {
            insetEls = (
                <>
                    <path
                        d={calcPathD(origPath, zoom)}
                        fill="none"
                        stroke="white"
                        strokeWidth={1}
                    />
                    <path
                        d={calcPathD(pathSegs(insetSegments), zoom)}
                        fill="none"
                        stroke="yellow"
                        strokeWidth={3}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                            console.log(
                                insetSegments,
                                origPath.segments,
                                inset,
                            );
                            console.log(regions.filter(isClockwise));
                        }}
                    />
                    {insetSegments.map((seg, i) =>
                        segmentArrow(
                            insetSegments[
                                i === 0 ? insetSegments.length - 1 : i - 1
                            ].to,
                            i,
                            seg,
                            zoom,
                            10,
                        ),
                    )}
                    {regions.map((region, ri) => {
                        return region.map((seg, i) => {
                            const prev =
                                region[i === 0 ? region.length - 1 : i - 1].to;
                            const next = region[(i + 1) % region.length];
                            const res = findInsidePoint(
                                prev,
                                seg,
                                next,
                                25 / zoom,
                            );
                            if (!res) {
                                return;
                            }
                            let [t0, t1, pos, p0] = res;

                            const wind = windingNumber(
                                pos,
                                primitives,
                                insetSegments,
                                false,
                            );
                            const wcount = wind.reduce(
                                (c, w) => (w.up ? 1 : -1) + c,
                                0,
                            );
                            const scalePos = (p: Coord) => ({
                                x: p.x * zoom,
                                y: p.y * zoom,
                            });

                            pos = scalePos(pos);
                            p0 = scalePos(p0);
                            const pa = push(p0, t0, 35);
                            const pb = push(p0, t1, 30);

                            return (
                                <g key={`${ri}-${i}`}>
                                    <line
                                        x1={p0.x}
                                        y1={p0.y}
                                        x2={pa.x}
                                        y2={pa.y}
                                        stroke="white"
                                        strokeWidth={3}
                                    />
                                    <line
                                        x1={p0.x}
                                        y1={p0.y}
                                        x2={pb.x}
                                        y2={pb.y}
                                        stroke="black"
                                        strokeWidth={3}
                                    />
                                    <line
                                        x1={p0.x}
                                        y1={p0.y}
                                        x2={pos.x}
                                        y2={pos.y}
                                        stroke={wcount === 0 ? 'red' : '#af0'}
                                        strokeWidth={3}
                                    />
                                </g>
                            );
                        });
                    })}
                    {regions.map((region, i) => (
                        <path
                            key={i}
                            d={calcPathD(pathSegs(region), zoom)}
                            strokeDasharray={'10 10'}
                            fill="none"
                            stroke="purple"
                            strokeWidth={4}
                        />
                    ))}
                </>
            );
        }
    }
    return (
        <>
            {origPath.segments.map((seg, i) => (
                <circle
                    key={i}
                    cx={seg.to.x * zoom}
                    cy={seg.to.y * zoom}
                    r={10}
                    stroke={
                        clip && !insidePath(seg.to, clip, false)
                            ? 'yellow'
                            : i === 0
                            ? 'red'
                            : 'blue'
                    }
                    strokeWidth={(1 / 100) * zoom}
                    fill={'none'}
                />
            ))}
            {false &&
                path.segments.map((seg, i) => (
                    <circle
                        key={i}
                        cx={seg.to.x * zoom}
                        cy={seg.to.y * zoom}
                        r={Math.min(10, (1 / 100) * zoom)}
                        fill={i === 0 ? 'red' : 'blue'}
                    />
                ))}

            {false && (
                <circle
                    cx={origPath.origin.x * zoom}
                    cy={origPath.origin.y * zoom}
                    r={10}
                    fill={'none'}
                    stroke={'green'}
                    strokeWidth={(1 / 100) * zoom}
                />
            )}
            {false && (
                <circle
                    cx={path.origin.x * zoom}
                    cy={path.origin.y * zoom}
                    r={10}
                    fill={'green'}
                />
            )}
            {false &&
                path.segments.map((seg, i) => (
                    <circle
                        key={`circle-${i}`}
                        cx={seg.to.x * zoom}
                        cy={seg.to.y * zoom}
                        r={Math.min(20, (2 / 100) * zoom)}
                        //   r={20}
                        fill="orange"
                    />
                ))}
            {insetEls}
        </>
    );
};

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
