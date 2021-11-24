/* @jsx jsx */
/* @jsxFrag React.Fragment */
import * as React from 'react';
import { jsx } from '@emotion/react';
import { Coord, Path, PathGroup, Segment, View } from './types';
import { combineStyles } from './Canvas';
import { arcPath } from './RenderPendingPath';
import { ensureClockwise, isClockwise, reversePath } from './CanvasRender';
import { angleTo, dist, push } from './getMirrorTransforms';
import {
    circleCircle,
    epsilon,
    lineCircle,
    lineLine,
    lineToSlope,
} from './intersect';
import { angleBetween, angleDiff } from './findNextSegments';
import { rgbToHsl } from './colorConvert';
import { coordsEqual } from './pathsAreIdentical';
import Prando from 'prando';
import { RoughGenerator } from 'roughjs/bin/generator';

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

export const insetSegment = (
    prev: Coord,
    seg: Segment,
    next: Segment,
    amount: number,
): Segment => {
    if (seg.type === 'Line') {
        const t = angleTo(prev, seg.to);
        const p0 = push(prev, t + Math.PI / 2, amount);
        const p1 = push(seg.to, t + Math.PI / 2, amount);
        const slope1 = lineToSlope(p0, p1);

        if (next.type === 'Line') {
            const t1 = angleTo(seg.to, next.to);
            const p2 = push(seg.to, t1 + Math.PI / 2, amount);
            const p3 = push(next.to, t1 + Math.PI / 2, amount);
            const slope2 = lineToSlope(p2, p3);
            const intersection = lineLine(slope1, slope2);
            if (!intersection) {
                // Assume they're the same line, so the pushed one is correct
                return { ...seg, to: p2 };
            }
            return { ...seg, to: intersection };
        } else {
            const radius =
                dist(next.center, next.to) + amount * (next.clockwise ? -1 : 1);
            const angle = angleTo(next.center, next.to);
            const intersection = lineCircle(
                { center: next.center, radius: radius, type: 'circle' },
                slope1,
            );
            const dists = intersection.map((pos) => dist(pos, p1));
            if (dists.length > 1) {
                return {
                    ...seg,
                    to: dists[0] > dists[1] ? intersection[1] : intersection[0],
                };
            }
            return intersection.length ? { ...seg, to: intersection[0] } : seg;
        }
    }
    if (seg.type === 'Arc') {
        const radius =
            dist(seg.center, seg.to) + amount * (seg.clockwise ? -1 : 1);
        const angle = angleTo(seg.center, seg.to);

        if (next.type === 'Line') {
            const t1 = angleTo(seg.to, next.to);
            const p2 = push(seg.to, t1 + Math.PI / 2, amount);
            const p3 = push(next.to, t1 + Math.PI / 2, amount);
            const slope2 = lineToSlope(p2, p3);
            const intersection = lineCircle(
                { center: seg.center, radius: radius, type: 'circle' },
                slope2,
            );
            const dists = intersection.map((pos) => dist(pos, p2));
            if (dists.length > 1) {
                return {
                    ...seg,
                    to: dists[0] > dists[1] ? intersection[1] : intersection[0],
                };
            }
            return intersection.length ? { ...seg, to: intersection[0] } : seg;
        } else {
            const radius2 =
                dist(next.center, next.to) + amount * (next.clockwise ? -1 : 1);
            // const angle2 = angleTo(next.center, next.to);
            const intersection = circleCircle(
                { center: next.center, radius: radius2, type: 'circle' },
                { center: seg.center, radius: radius, type: 'circle' },
            );
            // if (intersection.length === 1 && 1 == 0) {
            //     return { ...seg, to: intersection[0] };
            // }
            if (intersection.length < 2) {
                const newTo = push(seg.center, angle, radius);
                return { ...seg, to: newTo };
            }
            const angle0 = angleTo(seg.center, prev);
            const angles = intersection.map((pos) =>
                angleBetween(angle0, angleTo(seg.center, pos), seg.clockwise),
            );
            // We want the first one we run into, going around the original circle.
            if (angles[0] < angles[1]) {
                return { ...seg, to: intersection[0] };
            }
            return { ...seg, to: intersection[1] };
        }
    }
    throw new Error(`nope`);
};

export const areContiguous = (prev: Coord, one: Segment, two: Segment) => {
    if (one.type !== two.type) {
        return false;
    }
    if (one.type === 'Line' && two.type === 'Line') {
        return (
            Math.abs(angleTo(prev, one.to) - angleTo(one.to, two.to)) < epsilon
        );
    }
    if (one.type === 'Arc' && two.type === 'Arc') {
        return (
            one.clockwise === two.clockwise &&
            coordsEqual(one.center, two.center)
        );
    }
    return false;
};

export const simplifyPath = (segments: Array<Segment>): Array<Segment> => {
    let result: Array<Segment> = [];
    let prev = segments[segments.length - 1].to;
    segments.forEach((segment, i) => {
        if (!result.length) {
            result.push(segment);
            return;
        }
        if (areContiguous(prev, result[result.length - 1], segment)) {
            result[result.length - 1] = {
                ...result[result.length - 1],
                to: segment.to,
            };
        } else {
            prev = result[result.length - 1].to;
            result.push(segment);
        }
    });
    // Ok so the edge case is, what if the first & last are contiguous?
    // we can't muck with the origin, so we're stuck with it. Which is a little weird.
    // should I just drop the separate keeping of an `origin`? Like once we have segments,
    // do we need it at all?
    // I guess we just need to know whether the path is "closed"?
    // oh yeah, if it's not closed, then we do need an origin.
    // ok.
    return result;
};

export const insetPath = (path: Path, inset: number) => {
    // All paths are clockwise, it just makes this easier
    if (!isClockwise(path.segments)) {
        path = { ...path, segments: reversePath(path.segments) };
    }
    // console.log('yes', path)

    const simplified = simplifyPath(path.segments);

    const segments = simplified.map((seg, i) => {
        const prev = i === 0 ? path.origin : simplified[i - 1].to;
        const next = simplified[i === simplified.length - 1 ? 0 : i + 1];
        return insetSegment(prev, seg, next, inset);
    });

    // we've gone inside out!
    if (!isClockwise(segments)) {
        return null;
    }

    return { ...path, segments, origin: segments[segments.length - 1].to };
};

export const RenderPath = React.memo(
    ({
        path,
        origPath,
        view,
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
        view: View;
        groups: { [key: string]: PathGroup };
        onClick?: (evt: React.MouseEvent, id: string) => void;
        palette: Array<string>;
    }) => {
        const d = calcPathD(path, view.zoom);
        const style = combinedPathStyles(path, groups);

        const zoom = view.zoom;
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
            if (fill.inset) {
                const inset = insetPath(path, fill.inset / 100);
                if (!inset) {
                    return null;
                }
                newPath = inset;
                raw = calcPathD(newPath, zoom);
            }

            if (generator && view.sketchiness && view.sketchiness > 0) {
                const p = generator.path(raw, {
                    fill: common.fill,
                    fillStyle: 'solid',
                    seed: idSeed(path.id),
                    roughness: view.sketchiness,
                    stroke: 'none',
                });
                const info = generator.toPaths(p);
                return info.map((info, i) => (
                    <path
                        key={i}
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
                    <path data-id={path.id} d={raw} {...common} />
                    {path.debug
                        ? newPath.segments.map((seg, i) => (
                              <circle
                                  key={i}
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

            if (generator && view.sketchiness && view.sketchiness > 0) {
                const p = generator.path(raw, {
                    fill: 'none',
                    seed: idSeed(path.id),
                    roughness: view.sketchiness,
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

export function combinedPathStyles(
    path: Path,
    groups: { [key: string]: PathGroup },
) {
    const styles = [path.style];
    if (path.group) {
        let group = groups[path.group];
        styles.unshift(group.style);
        while (group.group) {
            group = groups[group.group];
            styles.unshift(group.style);
        }
    }
    const style = combineStyles(styles);
    return style;
}

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
