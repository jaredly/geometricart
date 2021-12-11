/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx, css } from '@emotion/react';
import React from 'react';
import { Intersect } from './types';

const whatsit = css({
    fill: 'rgba(255,255,255,0.1)',
    cursor: 'pointer',
    transition: '.2s ease r, .2s ease fill',
    ':hover': {
        r: 7,
        fill: 'white',
    },
});

export const RenderIntersections = React.memo(
    ({
        zoom,
        intersections,
        onClick,
    }: {
        zoom: number;
        intersections: Array<Intersect>;
        onClick: (item: Intersect, shiftKey: boolean) => unknown;
    }) => {
        // if (true) {
        //     return null;
        // }
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
                        onTouchStart={() => {
                            console.log('ok');
                        }}
                        onTouchEnd={() => {
                            onClick(intersection, false);
                        }}
                        r={5}
                        fill={'rgba(255,255,255,0.1)'}
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
