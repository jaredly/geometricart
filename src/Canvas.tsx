/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { Action } from './App';
import {
    angleTo,
    applyMatrices,
    dist,
    getMirrorTransforms,
    Matrix,
    push,
    scale,
} from './getMirrorTransforms';
import { Primitive } from './intersect';
import { calculateIntersections, geomToPrimitives } from './points';
import { Coord, Guide, GuideGeom, Id, Mirror, State, View } from './types';

export type GuideElement = {
    id: Id;
    geom: GuideGeom;
    active: boolean;
    original: boolean;
};

export const transformGuideGeom = (
    geom: GuideGeom,
    transform: (pos: Coord) => Coord,
): GuideGeom => {
    switch (geom.type) {
        case 'AngleBisector':
            return {
                ...geom,
                p1: transform(geom.p1),
                p2: transform(geom.p2),
                p3: transform(geom.p3),
            };
        case 'Line':
        case 'PerpendicularBisector':
            return { ...geom, p1: transform(geom.p1), p2: transform(geom.p2) };
        case 'Circle':
            return {
                ...geom,
                center: transform(geom.center),
                radius: transform(geom.radius),
            };
    }
};

// These are NOT in /view/ coordinates!
export const calculateGuideElements = (
    guides: { [key: Id]: Guide },
    mirrorTransforms: { [key: Id]: Array<Array<Matrix>> },
) => {
    const elements: Array<GuideElement> = [];
    Object.keys(guides).forEach((k) => {
        const g = guides[k];
        if (g.mirror) {
            mirrorTransforms[g.mirror].forEach((matrices) => {
                elements.push({
                    id: g.id,
                    active: g.active,
                    geom: transformGuideGeom(g.geom, (pos) =>
                        applyMatrices(pos, matrices),
                    ),
                    original: false,
                });
            });
        }
        elements.push({
            id: g.id,
            geom: g.geom,
            active: g.active,
            original: true,
        });
    });
    return elements;
};

export type Props = {
    state: State;
    width: number;
    height: number;
    dispatch: (action: Action) => unknown;
};

export const GuideElement = ({
    geom,
    zoom,
    original,
}: {
    geom: GuideGeom;
    zoom: number;
    original: boolean;
}) => {
    switch (geom.type) {
        case 'Line':
            return (
                <>
                    <line
                        x1={geom.p1.x * zoom}
                        y1={geom.p1.y * zoom}
                        x2={geom.p2.x * zoom}
                        y2={geom.p2.y * zoom}
                    />
                </>
            );
        case 'Circle':
            const r = dist(geom.radius, geom.center);
            const m = [];
            for (let i = 1; i <= geom.multiples + 1; i++) {
                m.push(
                    <circle
                        key={i}
                        cx={geom.center.x * zoom}
                        cy={geom.center.y * zoom}
                        r={r * i * zoom}
                        fill="none"
                        strokeDasharray={i === 1 ? '' : '5 5'}
                        stroke="#666"
                        strokeWidth={1}
                    />,
                );
            }
            const a = angleTo(geom.center, geom.radius);
            const p1 = push(scale(geom.center, zoom), a, 2000);
            const p2 = push(scale(geom.center, zoom), a, -2000);
            return (
                <>
                    <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke="green"
                        strokeWidth={0.5}
                    />
                    {m}
                    {geom.half ? (
                        <circle
                            cx={geom.center.x * zoom}
                            cy={geom.center.y * zoom}
                            r={r * 0.5 * zoom}
                            strokeDasharray="5 5"
                            fill="none"
                            stroke="#666"
                            strokeWidth={1}
                        />
                    ) : null}
                    {original ? (
                        <circle
                            cx={geom.center.x * zoom}
                            cy={geom.center.y * zoom}
                            r={5}
                            fill="white"
                        />
                    ) : null}
                    {original ? (
                        <circle
                            cx={geom.radius.x * zoom}
                            cy={geom.radius.y * zoom}
                            r={5}
                            fill="white"
                        />
                    ) : null}
                </>
            );
    }
    return <div>hlloe</div>;
};

const precision = 4;
export const primitiveKey = (p: Primitive) =>
    p.type === 'line'
        ? `${p.m.toFixed(precision)}:${p.b.toFixed(precision)}`
        : `${coordKey(p.center)}:${p.radius.toFixed(precision)}`;
export const coordKey = (coord: Coord) =>
    `${coord.x.toFixed(precision)},${coord.y.toFixed(precision)}`;

export const calcAllIntersections = (primitives: Array<Primitive>) => {
    const seen: { [k: string]: true } = {};
    const deduped = primitives.filter((p) => {
        const k = primitiveKey(p);
        if (seen[k]) {
            return false;
        }
        return (seen[k] = true);
    });
    const seenCoords: { [k: string]: true } = {};
    const coords: Array<Coord> = [];
    for (let i = 0; i < deduped.length; i++) {
        for (let j = i + 1; j < deduped.length; j++) {
            coords.push(
                ...calculateIntersections(deduped[i], deduped[j]).filter(
                    (coord) => {
                        const k = coordKey(coord);
                        if (seenCoords[k]) {
                            return false;
                        }
                        return (seenCoords[k] = true);
                    },
                ),
            );
        }
    }
    return coords;
};

export const Canvas = ({ state, width, height, dispatch }: Props) => {
    const mirrorTransforms = React.useMemo(
        () => getMirrorTransforms(state.mirrors),
        [state.mirrors],
    );
    // NEED TO - dedup circles. HOW: make a key, that is rounded center.
    // This includes points I think....
    const guideElements = React.useMemo(
        () => calculateGuideElements(state.guides, mirrorTransforms),
        [state.guides, mirrorTransforms],
    );

    const guidePrimitives = React.useMemo(
        () =>
            ([] as Array<Primitive>).concat(
                ...guideElements.map((el) => geomToPrimitives(el.geom)),
            ),
        [guideElements],
    );

    const allIntersections = React.useMemo(
        () => calcAllIntersections(guidePrimitives),
        [guidePrimitives],
    );

    //

    return (
        <div
            css={{
                border: '1px solid magenta',
            }}
            style={{ width, height }}
        >
            Yes
            {allIntersections.length}
            <svg width={width} height={height}>
                <g transform={`translate(${width / 2} ${height / 2})`}>
                    {/* {guideElements.map((element) => (
                        <GuideElement
                            geom={element.geom}
                            zoom={state.view.zoom}
                            original={element.original}
                        />
                    ))} */}
                    {guidePrimitives.map((prim, i) =>
                        prim.type === 'line' ? (
                            prim.m === Infinity ? (
                                <line
                                    x1={prim.b + state.view.zoom}
                                    y1={-height}
                                    y2={height}
                                    x2={prim.b + state.view.zoom}
                                    stroke="green"
                                    strokeWidth="1"
                                />
                            ) : (
                                <line
                                    x1={-width}
                                    y1={
                                        -width * prim.m +
                                        prim.b * state.view.zoom
                                    }
                                    x2={width}
                                    y2={
                                        prim.m * width +
                                        prim.b * state.view.zoom
                                    }
                                    stroke="green"
                                    strokeWidth="1"
                                />
                            )
                        ) : (
                            <circle
                                cx={prim.center.x * state.view.zoom}
                                cy={prim.center.y * state.view.zoom}
                                r={prim.radius * state.view.zoom}
                                stroke="#666"
                                strokeWidth="1"
                                fill="none"
                            />
                        ),
                    )}
                    {allIntersections.map((coord, i) => (
                        <circle
                            key={i}
                            cx={coord.x * state.view.zoom}
                            cy={coord.y * state.view.zoom}
                            r={5}
                            fill={'rgba(255,255,255,0.1)'}
                        />
                    ))}
                </g>
            </svg>
        </div>
    );
};
