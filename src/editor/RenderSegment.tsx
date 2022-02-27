/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import { Coord, Segment } from '../types';
import { arcPath } from './RenderPendingPath';
import React from 'react';

export const RenderSegmentBasic = ({
    segment,
    zoom,
    prev,
    inner,
    className,
}: {
    segment: Segment;
    prev: Coord;
    zoom: number;
    className?: string;
    inner?: React.ComponentProps<'line'>;
}) => {
    if (segment.type === 'Line') {
        return (
            <line
                x1={prev.x * zoom}
                y1={prev.y * zoom}
                x2={segment.to.x * zoom}
                y2={segment.to.y * zoom}
                {...inner}
                className={className ?? inner?.className}
            />
        );
    } else {
        return (
            <path
                fill="none"
                d={
                    `M ${prev.x * zoom} ${prev.y * zoom} ` +
                    arcPath(segment, prev, zoom)
                }
                {...inner}
                className={className ?? inner?.className}
            />
        );
    }
};

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
    return (
        <RenderSegmentBasic
            segment={segment}
            prev={prev}
            zoom={zoom}
            inner={{
                stroke: color || (onClick ? 'red' : 'green'),
                strokeWidth: width,
                onClick: onClick,
                onMouseOver: onMouseOver,
                strokeDasharray: strokeDasharray,
            }}
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
    // if (segment.type === 'Line') {
    //     return (
    //         <line
    //             x1={prev.x * zoom}
    //             y1={prev.y * zoom}
    //             x2={segment.to.x * zoom}
    //             y2={segment.to.y * zoom}
    //             stroke={color || (onClick ? 'red' : 'green')}
    //             strokeWidth={width}
    //             onClick={onClick}
    //             onMouseOver={onMouseOver}
    //             strokeDasharray={strokeDasharray}
    //             css={{
    //                 cursor: onClick || onMouseOver ? 'pointer' : 'default',
    //                 ':hover': onClick
    //                     ? {
    //                           strokeWidth: '10',
    //                       }
    //                     : {},
    //             }}
    //         />
    //     );
    // } else {
    //     return (
    //         <path
    //             onClick={onClick}
    //             onMouseOver={onMouseOver}
    //             stroke={color || (onClick ? 'red' : 'green')}
    //             strokeWidth={width}
    //             strokeDasharray={strokeDasharray}
    //             fill="none"
    //             d={
    //                 `M ${prev.x * zoom} ${prev.y * zoom} ` +
    //                 arcPath(segment, prev, zoom)
    //             }
    //             css={{
    //                 cursor: onClick || onMouseOver ? 'pointer' : 'default',
    //                 ':hover': onClick
    //                     ? {
    //                           strokeWidth: '10',
    //                       }
    //                     : {},
    //             }}
    //         />
    //     );
    // }
};
