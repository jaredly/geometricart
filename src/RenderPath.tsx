/* @jsx jsx */
/* @jsxFrag React.Fragment */
import * as React from 'react';
import { jsx } from '@emotion/react';
import { Path, PathGroup } from './types';
import { combineStyles } from './Canvas';
import { arcPath } from './RenderPendingPath';

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

export const RenderPath = ({
    path,
    zoom,
    groups,
    onClick,
    palette,
}: {
    path: Path;
    zoom: number;
    groups: { [key: string]: PathGroup };
    onClick?: (evt: React.MouseEvent) => void;
    palette: Array<string>;
}) => {
    const d = calcPathD(path, zoom);
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
    const fills = style.fills.map((fill, i) => {
        if (!fill) {
            return null;
        }
        return (
            <path
                key={`fill-${i}`}
                data-id={path.id}
                css={
                    onClick
                        ? {
                              cursor: 'pointer',
                              transition: '-moz-initial.2s ease opacity',
                              ':hover': {
                                  opacity: 0.8,
                              },
                          }
                        : {}
                }
                d={d}
                strokeLinejoin="round"
                fill={paletteColor(palette, fill.color)}
                onClick={onClick}
            />
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
                strokeDasharray={line.dash ? line.dash.join(' ') : undefined}
                fill="none"
                strokeLinejoin="round"
                strokeWidth={line.width}
            />
        );
    });
    return (
        <>
            {fills}
            {lines}
        </>
    );
};

export const paletteColor = (
    palette: Array<string>,
    color: string | number | undefined,
) =>
    color == null
        ? undefined
        : typeof color === 'string'
        ? color
        : palette[color];
