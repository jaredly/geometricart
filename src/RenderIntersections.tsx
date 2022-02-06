import React from 'react';
import { Intersect } from './types';
import { css } from '@emotion/css';

const intersectionStyle = css({
    // fill: 'rgba(255,255,255,0.1)',
    cursor: 'pointer',
    transition: '.2s ease r, .2s ease fill',
    ':hover': {
        r: 7,
        fill: 'white',
    },
});

export const useTouchClick = <T,>(fn: (arg: T) => void) => {
    const valid = React.useRef(null as null | boolean);
    return (arg: T) => ({
        onTouchStart: (evt: React.TouchEvent) => {
            if (valid.current === null) {
                valid.current = true;
            } else {
                valid.current = false;
            }
        },
        onTouchMove: (evt: React.TouchEvent) => {
            valid.current = false;
        },
        onTouchEnd: (evt: React.TouchEvent) => {
            evt.preventDefault(); // stop onclick from happening.
            if (evt.touches.length > 0) {
                return;
            }
            if (valid.current === true) {
                fn(arg);
            }
            valid.current = null;
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
        const handlers = useTouchClick<Intersect>((intersection) =>
            onClick(intersection, false),
        );
        const isTouchScreen = 'ontouchstart' in window;
        return (
            <>
                {isTouchScreen
                    ? intersections.map((intersection, i) => (
                          <circle
                              key={i}
                              cx={intersection.coord.x * zoom}
                              cy={intersection.coord.y * zoom}
                              onClick={(evt) => {
                                  evt.preventDefault();
                                  evt.stopPropagation();
                                  onClick(intersection, evt.shiftKey);
                              }}
                              {...handlers(intersection)}
                              r={15}
                              fill="rgba(255,255,255,0)"
                              stroke={'none'}
                              className={intersectionStyle}
                          />
                      ))
                    : null}
                {intersections.map((intersection, i) => (
                    <circle
                        key={i}
                        cx={intersection.coord.x * zoom}
                        cy={intersection.coord.y * zoom}
                        onClick={(evt) => {
                            evt.preventDefault();
                            evt.stopPropagation();
                            onClick(intersection, evt.shiftKey);
                        }}
                        {...handlers(intersection)}
                        r={5}
                        fill={highlight ? '#faa' : 'rgba(255,255,255,0.1)'}
                        stroke={'black'}
                        className={intersectionStyle}
                    />
                ))}
            </>
        );
    },
);
