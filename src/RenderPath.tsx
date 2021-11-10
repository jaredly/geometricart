/* @jsx jsx */
/* @jsxFrag React.Fragment */
import * as React from 'react';
import { jsx } from '@emotion/react';
import { Path, PathGroup } from './types';
import { combineStyles } from './Canvas';
import { arcPath } from './RenderPendingPath';

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
    onClick?: () => void;
    palette: Array<string>;
}) => {
    let d = `M ${path.origin.x * zoom} ${path.origin.y * zoom}`;
    path.segments.forEach((seg) => {
        if (seg.type === 'Line') {
            d += ` L ${seg.to.x * zoom} ${seg.to.y * zoom}`;
        } else {
            d += arcPath(seg, zoom);
        }
    });
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
                key={i}
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
                d={d + ' Z'}
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
                key={i}
                d={d + ' Z'}
                stroke={paletteColor(palette, line.color)}
                fill="none"
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
