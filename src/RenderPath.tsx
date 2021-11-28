/* @jsx jsx */
/* @jsxFrag React.Fragment */
import * as React from 'react';
import { jsx } from '@emotion/react';
import { Path, PathGroup, View } from './types';
import { combineStyles } from './Canvas';
import { arcPath } from './RenderPendingPath';
import { ensureClockwise, totalAngle } from './CanvasRender';
import { dist } from './getMirrorTransforms';
import { angleDiff } from './findNextSegments';
import { rgbToHsl } from './colorConvert';
import Prando from 'prando';
import { RoughGenerator } from 'roughjs/bin/generator';
import { insetPath, pruneInsetPath } from './insetPath';
import { epsilon } from './intersect';

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

    return d + ' Z';
};

export const RenderPath = React.memo(
    ({
        path,
        origPath,
        zoom,
        sketchiness,
        groups,
        onClick,
        palette,
        generator,
        rand,
    }: {
        rand?: Prando;
        generator?: RoughGenerator;
        path: Path;
        origPath?: Path;
        zoom: number;
        sketchiness: number | undefined;
        groups: { [key: string]: PathGroup };
        onClick?: (evt: React.MouseEvent, id: string) => void;
        palette: Array<string>;
    }) => {
        const d = calcPathD(path, zoom);
        const style = path.style;

        // const insetPaths =
        //
        const fills = style.fills.map((fill, i) => {
            if (!fill) {
                return null;
            }
            let lighten = fill.lighten;
            if (fill.colorVariation && rand) {
                const off = rand.next(-1.0, 1.0) * fill.colorVariation;
                lighten = lighten != null ? lighten + off : off;
            }
            const color = paletteColor(palette, fill.color, lighten);
            if (color === 'transparent') {
                return null;
            }

            const common = {
                key: `fill-${i}`,
                fillOpacity: fill.opacity,
                stroke: 'none',
                css: onClick
                    ? {
                          cursor: 'pointer',
                      }
                    : {},
                onMouseDown: onClick
                    ? (evt: React.MouseEvent) => evt.preventDefault()
                    : undefined,
                fill: color,
                onClick: onClick
                    ? (evt: React.MouseEvent) => onClick(evt, path.id)
                    : undefined,
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
            let newPath = path;
            let pathInfos = [{ path, raw }];
            if (fill.inset) {
                const inset = insetPath(path, fill.inset / 100);

                const angle = totalAngle(inset.segments);

                // We have a twist!
                // but that's no the only possible self-intersection.
                // If we have a concave shape, it's easy to self-intersect.
                // So what we need to do is ... find self-intersections, and then
                // do self-clipping?
                // Basically do the same kind of clip walk, but it's just on one path.
                // And we'd have to do the same deal where we look at all points, to see
                // which ones are in a still-clockwise section of things.
                // if (Math.abs(angle) < epsilon * 2) {
                pathInfos = pruneInsetPath(inset.segments).map((segments) => ({
                    path: {
                        ...path,
                        segments,
                        origin: segments[segments.length - 1].to,
                    },
                    raw: calcPathD(
                        {
                            ...path,
                            segments,
                            origin: segments[segments.length - 1].to,
                        },
                        zoom,
                    ),
                }));
                // } else if (angle < Math.PI - epsilon) {
                //     return null;
                // } else {
                // pathInfos = [{ path: inset, raw: calcPathD(inset, zoom) }];
                // }
            }

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
                            onClick={common.onClick}
                            onMouseDown={common.onMouseDown}
                            css={common.css}
                        />
                    ));
                }

                return (
                    <>
                        <path data-id={path.id} d={raw} {...common} key={k} />
                        {path.debug
                            ? newPath.segments.map((seg, i) => (
                                  <circle
                                      key={`${k}:${i}`}
                                      cx={seg.to.x * zoom}
                                      cy={seg.to.y * zoom}
                                      r={(2 / 100) * zoom}
                                      fill="orange"
                                  />
                              ))
                            : null}
                    </>
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
                    ? line.dash
                          .map((d) => ((d / 100) * zoom).toFixed(2))
                          .join(' ')
                    : undefined,
                fill: 'none',
                strokeLinejoin: 'round' as 'round',
                onClick: onClick
                    ? (evt: React.MouseEvent) => onClick(evt, path.id)
                    : undefined,
                css: onClick
                    ? {
                          cursor: 'pointer',
                      }
                    : {},
                strokeWidth: line.width ? (line.width / 100) * zoom : 0,
                onMouseDown: onClick
                    ? (evt: React.MouseEvent) => evt.preventDefault()
                    : undefined,
            };
            if (path.segments.length === 1 && path.segments[0].type === 'Arc') {
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

            let raw = d;
            let newPath = path;
            if (line.inset) {
                const inset = insetPath(path, line.inset / 100);
                if (!inset) {
                    return null;
                }
                newPath = inset;
                raw = calcPathD(newPath, zoom);
            }

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
                        key={i}
                        d={info.d}
                        stroke={info.stroke}
                        fill={info.fill}
                        strokeWidth={info.strokeWidth}
                        onClick={common.onClick}
                        onMouseDown={common.onMouseDown}
                        css={common.css}
                    />
                ));
            }

            return <path d={raw} data-id={path.id} {...common} />;
        });
        return (
            <>
                {fills}
                {lines}
                {path.debug && origPath
                    ? origPath.segments.map((seg, i) => (
                          <circle
                              key={i}
                              cx={seg.to.x * zoom}
                              cy={seg.to.y * zoom}
                              r={(5 / 100) * zoom}
                              stroke={i === 0 ? 'red' : 'blue'}
                              strokeWidth={(1 / 100) * zoom}
                              fill={'none'}
                          />
                      ))
                    : null}
                {path.debug
                    ? path.segments.map((seg, i) => (
                          <circle
                              key={i}
                              cx={seg.to.x * zoom}
                              cy={seg.to.y * zoom}
                              r={(3 / 100) * zoom}
                              fill={i === 0 ? 'red' : 'blue'}
                          />
                      ))
                    : null}
                {path.debug && origPath ? (
                    <circle
                        cx={origPath.origin.x * zoom}
                        cy={origPath.origin.y * zoom}
                        r={(6 / 100) * zoom}
                        fill={'none'}
                        stroke={'green'}
                        strokeWidth={(1 / 100) * zoom}
                    />
                ) : null}
                {path.debug ? (
                    <circle
                        cx={path.origin.x * zoom}
                        cy={path.origin.y * zoom}
                        r={(4 / 100) * zoom}
                        fill={'green'}
                    />
                ) : null}
            </>
        );
    },
);

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
