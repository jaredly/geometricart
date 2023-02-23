/* @jsx jsx */
/* @jsxFrag React.Fragment */
import React from 'react';
import { jsx } from '@emotion/react';
import { PendingMirror } from '../useUIState';
import {
    angleTo,
    applyMatrices,
    dist,
    Matrix,
    mirrorTransforms,
    push,
    transformsToMatrices,
} from '../rendering/getMirrorTransforms';
import { Coord } from '../types';

export const RenderPendingMirror = ({
    mirror,
    zoom,
    transforms,
    mouse,
}: {
    mirror: PendingMirror;
    zoom: number;
    transforms: null | Array<Array<Matrix>>;
    mouse: Coord;
}) => {
    let center = mirror.center ?? mouse;
    let radial = mirror.center ? mouse : push(center, 0, 100 / zoom);
    let line = {
        p1: radial,
        p2: push(
            radial,
            angleTo(radial, center) + (mirror.reflect ? Math.PI / 8 : 0),
            dist(center, radial) / 2,
        ),
    };
    const rotational: Array<boolean> = [];
    for (let i = 0; i < mirror.rotations - 1; i++) {
        rotational.push(true);
    }
    const mine = mirrorTransforms({
        id: '',
        origin: center,
        point: radial,
        rotational,
        reflect: mirror.reflect,
        parent: mirror.parent,
    }).map(transformsToMatrices);
    const alls: Array<Array<Matrix>> = mine.slice();
    transforms?.forEach((outer) => {
        alls.push(outer);
        mine.forEach((inner) => {
            alls.push(inner.concat(outer));
        });
    });
    return (
        <>
            <line
                x1={line.p1.x * zoom}
                y1={line.p1.y * zoom}
                x2={line.p2.x * zoom}
                y2={line.p2.y * zoom}
                stroke="#fa0"
                strokeWidth="2"
                pointerEvents="none"
            />
            {alls.map((transforms, i) => {
                const p1 = applyMatrices(line.p1, transforms);
                const p2 = applyMatrices(line.p2, transforms);
                return (
                    <line
                        pointerEvents="none"
                        key={i}
                        x1={p1.x * zoom}
                        y1={p1.y * zoom}
                        x2={p2.x * zoom}
                        y2={p2.y * zoom}
                        stroke="red"
                        strokeWidth="2"
                    />
                );
            })}
        </>
    );
};
