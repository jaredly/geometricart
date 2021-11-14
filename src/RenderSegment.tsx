/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import { Coord, Segment } from './types';
import { arcPath } from './RenderPendingPath';

export const RenderSegment = ({
    segment,
    prev,
    zoom,
    onClick,
    onMouseOver,
    color,
    width = 4,
    strokeDasharray,
}: {
    segment: Segment;
    prev: Coord;
    zoom: number;
    onClick?: () => unknown;
    onMouseOver?: () => unknown;
    color?: string;
    strokeDasharray?: string;
    width?: number;
}) => {
    if (segment.type === 'Line') {
        return (
            <line
                x1={prev.x * zoom}
                y1={prev.y * zoom}
                x2={segment.to.x * zoom}
                y2={segment.to.y * zoom}
                stroke={color || (onClick ? 'red' : 'green')}
                strokeWidth={width}
                onClick={onClick}
                onMouseOver={onMouseOver}
                strokeDasharray={strokeDasharray}
                css={{
                    cursor: onClick || onMouseOver ? 'pointer' : 'default',
                    ':hover': onClick
                        ? {
                              strokeWidth: '10',
                          }
                        : {},
                }}
            />
        );
    } else {
        return (
            <path
                onClick={onClick}
                onMouseOver={onMouseOver}
                stroke={color || (onClick ? 'red' : 'green')}
                strokeWidth={width}
                strokeDasharray={strokeDasharray}
                fill="none"
                d={
                    `M ${prev.x * zoom} ${prev.y * zoom} ` +
                    arcPath(segment, prev, zoom)
                }
                css={{
                    cursor: onClick || onMouseOver ? 'pointer' : 'default',
                    ':hover': onClick
                        ? {
                              strokeWidth: '10',
                          }
                        : {},
                }}
            />
        );
    }
};
