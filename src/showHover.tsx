/* @jsx jsx */
/* @jsxFrag React.Fragment */
import * as React from 'react';
import { jsx } from '@emotion/react';
import { geomsForGiude } from './calculateGuideElements';
import {
    getTransformsForMirror,
    getTransformsForNewMirror,
    Matrix,
} from './getMirrorTransforms';
import { geomToPrimitives } from './points';
import { UnderlinePath } from './RenderPath';
import { RenderPrimitive } from './RenderPrimitive';
import { Hover } from './Sidebar';
import { Mirror, State } from './types';
import { pathToPrimitives } from './findSelection';
import { RenderMirror } from './RenderMirror';
import { Bounds } from './GuideElement';
import { calculateBounds } from './Guides';

export const showHover = (
    key: string,
    hover: Hover,
    state: State,
    mirrorTransforms: { [key: string]: Array<Array<Matrix>> },
    zoom: number,
    bounds: Bounds,
    selection: boolean,
) => {
    const color = selection ? 'blue' : 'magenta';
    switch (hover.kind) {
        case 'Mirror': {
            if (!state.mirrors[hover.id]) {
                return null;
            }
            return (
                <RenderMirror
                    zoom={zoom}
                    mirror={state.mirrors[hover.id]}
                    transforms={mirrorTransforms[hover.id]}
                />
            );
        }
        case 'Path': {
            if (!state.paths[hover.id]) {
                return;
            }
            return (
                <UnderlinePath
                    path={state.paths[hover.id]}
                    zoom={zoom}
                    color={color}
                    key={key}
                />
            );
        }
        case 'PathGroup': {
            return (
                <>
                    {Object.keys(state.paths)
                        .filter((k) => state.paths[k].group === hover.id)
                        .map((k, i) => (
                            <UnderlinePath
                                key={key + ':' + k}
                                path={state.paths[k]}
                                zoom={zoom}
                                color={color}
                            />
                        ))}
                </>
            );
        }
        case 'Guide': {
            if (!state.guides[hover.id]) {
                return;
            }
            return geomsForGiude(
                state.guides[hover.id],
                typeof state.guides[hover.id].mirror === 'string'
                    ? mirrorTransforms[state.guides[hover.id].mirror as string]
                    : state.guides[hover.id].mirror
                    ? getTransformsForNewMirror(
                          state.guides[hover.id].mirror as Mirror,
                      )
                    : null,

                // state.guides[hover.id].mirror
                //     ? mirrorTransforms[state.guides[hover.id].mirror!]
                //     : null,
            ).map((geom, j) =>
                geomToPrimitives(geom.geom).map((prim, i) => (
                    <RenderPrimitive
                        bounds={bounds}
                        prim={prim}
                        strokeWidth={4}
                        color={
                            state.guides[hover.id].active
                                ? '#ccc'
                                : 'rgba(102,102,102,0.5)'
                        }
                        zoom={zoom}
                        key={`${key}:${j}:${i}`}
                    />
                )),
            );
        }
    }
};
