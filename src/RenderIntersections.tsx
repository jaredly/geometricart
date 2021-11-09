/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { Intersect } from './types';

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
                        r={5}
                        fill={'rgba(255,255,255,0.1)'}
                        css={{
                            fill: 'rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                            transition: '.2s ease r, .2s ease fill',
                            ':hover': {
                                r: 7,
                                fill: 'white',
                            },
                        }}
                    />
                ))}
            </>
        );
    },
);
