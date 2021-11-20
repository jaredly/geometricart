/* @jsx jsx */
/* @jsxFrag React.Fragment */
import * as React from 'react';
import { jsx } from '@emotion/react';
import { geomsForGiude } from './calculateGuideElements';
import { Matrix } from './getMirrorTransforms';
import { geomToPrimitives } from './points';
import { UnderlinePath } from './RenderPath';
import { RenderPrimitive } from './RenderPrimitive';
import { Hover } from './Sidebar';
import { State } from './types';
import { pathToPrimitives } from './findSelection';

export const showHover = (
    key: string,
    hover: Hover,
    state: State,
    mirrorTransforms: { [key: string]: Array<Array<Matrix>> },
    height: number,
    width: number,
    zoom: number,
    selection: boolean,
) => {
    const color = selection ? 'blue' : 'magenta';
    switch (hover.kind) {
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
                state.guides[hover.id].mirror
                    ? mirrorTransforms[state.guides[hover.id].mirror!]
                    : null,
            ).map((geom, j) =>
                geomToPrimitives(geom.geom).map((prim, i) => (
                    <RenderPrimitive
                        prim={prim}
                        strokeWidth={4}
                        color={
                            state.guides[hover.id].active
                                ? '#ccc'
                                : 'rgba(102,102,102,0.5)'
                        }
                        zoom={zoom}
                        height={height}
                        width={width}
                        key={`${key}:${j}:${i}`}
                    />
                )),
            );
        }
        case 'Clip':
            if (!state.view.clip) {
                return;
            }

            return pathToPrimitives(
                state.view.clip[state.view.clip.length - 1].to,
                state.view.clip,
            ).map((prim, i) => (
                <RenderPrimitive
                    prim={prim}
                    zoom={zoom}
                    width={width}
                    height={height}
                    color={'red'}
                    strokeWidth={4}
                    key={i}
                />
            ));
    }
};
