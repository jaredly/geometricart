/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import * as React from 'react';
import { geomsForGiude } from '../rendering/calculateGuideElements';
import {
    getTransformsForNewMirror,
    Matrix,
} from '../rendering/getMirrorTransforms';
import { geomToPrimitives } from '../rendering/points';
import { Mirror, State } from '../types';
import { Bounds } from './GuideElement';
import { RenderMirror } from './RenderMirror';
import { emptyPath, UnderlinePath } from './RenderPath';
import { RenderPrimitive } from './RenderPrimitive';
import { Hover } from './Sidebar';

export const showHover = (
    key: string,
    hover: Hover,
    state: State,
    mirrorTransforms: { [key: string]: Array<Array<Matrix>> },
    zoom: number,
    bounds: Bounds,
    selection: boolean,
) => {
    if (hover.type !== 'element') {
        return null;
    }
    const color = selection ? 'blue' : 'magenta';
    switch (hover.kind) {
        case 'Mirror': {
            if (!state.mirrors[hover.id]) {
                return null;
            }
            return (
                <RenderMirror
                    zoom={zoom}
                    key={key}
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
                <React.Fragment key={key}>
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
                </React.Fragment>
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
        case 'Clip': {
            const clip = state.clips[hover.id];
            return (
                <UnderlinePath
                    path={{
                        ...emptyPath,
                        segments: clip.shape,
                        origin: clip.shape[clip.shape.length - 1].to,
                    }}
                    zoom={zoom}
                    color={color}
                    key={key}
                />
            );
        }
    }
};
