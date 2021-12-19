/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx, css } from '@emotion/react';
import React from 'react';
import { Intersect } from './types';

const whatsit = css({
    // fill: 'rgba(255,255,255,0.1)',
    cursor: 'pointer',
    transition: '.2s ease r, .2s ease fill',
    ':hover': {
        r: 7,
        fill: 'white',
    },
});

export const useTouchClick = <T,>(fn: (arg: T) => void) => {
    const ref = React.useRef(null as null | boolean);
    return (arg: T) => ({
        onTouchStart: (evt: React.TouchEvent) => {
            if (ref.current === null) {
                ref.current = true;
            } else {
                ref.current = false;
            }
        },
        onTouchMove: (evt: React.TouchEvent) => {
            ref.current = false;
        },
        onTouchEnd: (evt: React.TouchEvent) => {
            evt.preventDefault(); // stop onclick from happening.
            if (evt.touches.length > 0) {
                return;
            }
            if (ref.current === true) {
                fn(arg);
            }
            ref.current = null;
        },
    });
};

export const RenderIntersections = React.memo(
    ({
        zoom,
        intersections,
        onClick,
        highlight,
    }: {
        zoom: number;
        highlight: boolean;
        intersections: Array<Intersect>;
        onClick: (item: Intersect, shiftKey: boolean) => unknown;
    }) => {
        // if (true) {
        //     return null;
        // }
        const handlers = useTouchClick<Intersect>((intersection) =>
            onClick(intersection, false),
        );
        const isTouchScreen = 'ontouchstart' in window;
        return (
            <>
                {intersections.map((intersection, i) => (
                    <circle
                        key={i}
                        cx={intersection.coord.x * zoom}
                        cy={intersection.coord.y * zoom}
                        onClick={(evt) => {
                            onClick(intersection, evt.shiftKey);
                        }}
                        {...handlers(intersection)}
                        r={5}
                        fill={highlight ? '#faa' : 'rgba(255,255,255,0.1)'}
                        stroke={'black'}
                        css={whatsit}
                        // css={{
                        //     fill: 'rgba(255,255,255,0.1)',
                        //     cursor: 'pointer',
                        //     transition: '.2s ease r, .2s ease fill',
                        //     ':hover': {
                        //         r: 7,
                        //         fill: 'white',
                        //     },
                        // }}
                    />
                ))}
            </>
        );
    },
);
