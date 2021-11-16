/* @jsx jsx */
/* @jsxFrag React.Fragment */
import * as React from 'react';
import { jsx } from '@emotion/react';
import { Coord, Path, PathGroup, Segment } from './types';
import { combineStyles } from './Canvas';
import { arcPath } from './RenderPendingPath';
import { isClockwise, reversePath } from './CanvasRender';
import { angleTo, dist, push } from './getMirrorTransforms';
import {
    circleCircle,
    epsilon,
    lineCircle,
    lineLine,
    lineToSlope,
} from './intersect';
import { angleBetween, angleDiff } from './findNextSegments';

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
    return result;
};

export const insetPath = (path: Path, inset: number) => {
    // All paths are clockwise, it just makes this easier
    if (!isClockwise(path)) {
        path = reversePath(path);
    }
    // console.log('yes', path)

    const simplified = simplifyPath(path.segments);

    const segments = simplified.map((seg, i) => {
        const prev = i === 0 ? path.origin : simplified[i - 1].to;
        const next = simplified[i === simplified.length - 1 ? 0 : i + 1];
        return insetSegment(prev, seg, next, inset);
    });

    return { ...path, segments, origin: segments[segments.length - 1].to };
};

export const RenderPath = React.memo(
    ({
        path,
        zoom,
        groups,
        onClick,
        palette,
    }: {
        path: Path;
        zoom: number;
        groups: { [key: string]: PathGroup };
        onClick?: (evt: React.MouseEvent, id: string) => void;
        palette: Array<string>;
    }) => {
        const d = calcPathD(path, zoom);
        const style = combinedPathStyles(path, groups);

        // const insetPaths =
        //
        const fills = style.fills.map((fill, i) => {
            if (!fill) {
                return null;
            }
            let raw = d;
            let newPath = path;
            if (fill.inset) {
                newPath = insetPath(path, fill.inset / 100);
                raw = calcPathD(newPath, zoom);
            }
            return (
                <>
                    <path
                        key={`fill-${i}`}
                        data-id={path.id}
                        fillOpacity={fill.opacity}
                        stroke="none"
                        css={
                            onClick
                                ? {
                                      cursor: 'pointer',
                                  }
                                : {}
                        }
                        d={raw}
                        onMouseDown={
                            onClick ? (evt) => evt.preventDefault() : undefined
                        }
                        fill={paletteColor(palette, fill.color)}
                        onClick={
                            onClick ? (evt) => onClick(evt, path.id) : undefined
                        }
                    />
                    {path.debug
                        ? path.segments.map((seg, i) => (
                              <circle
                                  key={i}
                                  cx={seg.to.x * zoom}
                                  cy={seg.to.y * zoom}
                                  r={5}
                                  fill="blue"
                              />
                          ))
                        : null}
                    {path.debug
                        ? newPath.segments.map((seg, i) => (
                              <circle
                                  key={i}
                                  cx={seg.to.x * zoom}
                                  cy={seg.to.y * zoom}
                                  r={5}
                                  fill="red"
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
            return (
                <path
                    key={`line-${i}`}
                    d={d}
                    data-id={path.id}
                    stroke={paletteColor(palette, line.color)}
                    strokeDasharray={
                        line.dash ? line.dash.join(' ') : undefined
                    }
                    fill="none"
                    strokeLinejoin="round"
                    onClick={
                        onClick ? (evt) => onClick(evt, path.id) : undefined
                    }
                    css={
                        onClick
                            ? {
                                  cursor: 'pointer',
                              }
                            : {}
                    }
                    strokeWidth={line.width ? (line.width / 100) * zoom : 0}
                    onMouseDown={
                        onClick ? (evt) => evt.preventDefault() : undefined
                    }
                />
            );
        });
        return (
            <>
                {fills}
                {lines}
            </>
        );
    },
);

export const paletteColor = (
    palette: Array<string>,
    color: string | number | undefined,
) =>
    color == null
        ? undefined
        : typeof color === 'string'
        ? color
        : palette[color]?.startsWith('http')
        ? `url(#palette-${color})`
        : palette[color] ?? '#aaa';

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
