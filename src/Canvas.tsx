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

export const geomsForGiude = (
    guide: Guide,
    mirror: Array<Array<Matrix>> | null,
) => {
    const elements: Array<GuideElement> = [];

    if (mirror) {
        mirror.forEach((matrices) => {
            elements.push({
                id: guide.id,
                active: guide.active,
                geom: transformGuideGeom(guide.geom, (pos) =>
                    applyMatrices(pos, matrices),
                ),
                original: false,
            });
        });
    }
    elements.push({
        id: guide.id,
        geom: guide.geom,
        active: guide.active,
        original: true,
    });

    return elements;
};

// These are NOT in /view/ coordinates!
export const calculateGuideElements = (
    guides: { [key: Id]: Guide },
    mirrorTransforms: { [key: Id]: Array<Array<Matrix>> },
) => {
    const elements: Array<GuideElement> = [];
    Object.keys(guides).forEach((k) => {
        elements.push(
            ...geomsForGiude(
                guides[k],
                guides[k].mirror ? mirrorTransforms[guides[k].mirror!] : null,
            ),
        );

        // const g = guides[k];
        // if (g.mirror) {
        //     mirrorTransforms[g.mirror].forEach((matrices) => {
        //         elements.push({
        //             id: g.id,
        //             active: g.active,
        //             geom: transformGuideGeom(g.geom, (pos) =>
        //                 applyMatrices(pos, matrices),
        //             ),
        //             original: false,
        //         });
        //     });
        // }
        // elements.push({
        //     id: g.id,
        //     geom: g.geom,
        //     active: g.active,
        //     original: true,
        // });
    });
    return elements;
};

export type Props = {
    state: State;
    width: number;
    height: number;
    innerRef: (node: SVGSVGElement) => unknown;
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
        case 'Line': {
            const t1 = angleTo(geom.p1, geom.p2);
            const d = dist(geom.p1, geom.p2);
            const left = push(geom.p1, t1, -10);
            const right = push(geom.p2, t1, 10);
            return (
                <>
                    <line
                        x1={left.x * zoom}
                        y1={left.y * zoom}
                        x2={right.x * zoom}
                        y2={right.y * zoom}
                        stroke="#fff"
                        strokeWidth={1}
                    />
                </>
            );
        }
        case 'PerpendicularBisector': {
            const t1 = angleTo(geom.p1, geom.p2);
            const d = dist(geom.p1, geom.p2);
            const mid = push(geom.p1, t1, d / 2);
            const left = push(mid, t1 + Math.PI / 2, 10);
            const right = push(mid, t1 + Math.PI / 2, -10);
            return (
                <>
                    <line
                        x1={left.x * zoom}
                        y1={left.y * zoom}
                        x2={right.x * zoom}
                        y2={right.y * zoom}
                        stroke="#fff"
                        strokeWidth={1}
                    />
                    <line
                        x1={geom.p1.x * zoom}
                        y1={geom.p1.y * zoom}
                        x2={geom.p2.x * zoom}
                        y2={geom.p2.y * zoom}
                        strokeDasharray="5 5"
                        stroke="#666"
                        strokeWidth={1}
                    />
                </>
            );
        }
        case 'AngleBisector': {
            const t1 = angleTo(geom.p2, geom.p1);
            const t2 = angleTo(geom.p2, geom.p3);
            const left = push(geom.p2, (t1 + t2) / 2, 10);
            const right = push(geom.p2, (t1 + t2) / 2, -10);
            return (
                <>
                    <line
                        x1={geom.p1.x * zoom}
                        y1={geom.p1.y * zoom}
                        x2={geom.p2.x * zoom}
                        y2={geom.p2.y * zoom}
                        stroke="#666"
                        strokeDasharray="5 5"
                        strokeWidth={1}
                    />
                    <line
                        x1={geom.p3.x * zoom}
                        y1={geom.p3.y * zoom}
                        x2={geom.p2.x * zoom}
                        y2={geom.p2.y * zoom}
                        stroke="#666"
                        strokeDasharray="5 5"
                        strokeWidth={1}
                    />
                    <line
                        x1={left.x * zoom}
                        y1={left.y * zoom}
                        x2={right.x * zoom}
                        y2={right.y * zoom}
                        stroke="#fff"
                        strokeWidth={1}
                    />
                </>
            );
        }
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
                    {/* {original ? (
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
                    ) : null} */}
                </>
            );
    }
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

export const Primitives = React.memo(
    ({
        primitives,
        zoom,
        height,
        width,
    }: {
        zoom: number;
        height: number;
        width: number;
        primitives: Array<Primitive>;
    }) => {
        console.log(primitives);
        return (
            <>
                {primitives.map((prim, i) => (
                    <RenderPrimitive
                        prim={prim}
                        zoom={zoom}
                        height={height}
                        width={width}
                        key={i}
                    />
                ))}
            </>
        );
    },
);

export const Canvas = ({ state, width, height, dispatch, innerRef }: Props) => {
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

    const [pos, setPos] = React.useState({ x: 0, y: 0 });

    return (
        <div
            css={{}}
            // style={{ width, height }}
        >
            <svg
                width={width}
                height={height}
                xmlns="http://www.w3.org/2000/svg"
                ref={innerRef}
                css={{
                    outline: '1px solid magenta',
                }}
                onMouseMove={(evt) => {
                    const rect = evt.currentTarget.getBoundingClientRect();
                    setPos({
                        x:
                            (evt.clientX - rect.left - height / 2) /
                            state.view.zoom,
                        y:
                            (evt.clientY - rect.top - width / 2) /
                            state.view.zoom,
                    });
                }}
            >
                <g transform={`translate(${width / 2} ${height / 2})`}>
                    {/* {guideElements.map((element) => (
                        <GuideElement
                            geom={element.geom}
                            zoom={state.view.zoom}
                            original={element.original}
                        />
                    ))} */}
                    <Primitives
                        primitives={guidePrimitives}
                        zoom={state.view.zoom}
                        width={width}
                        height={height}
                    />
                    {allIntersections.map((coord, i) => (
                        <circle
                            key={i}
                            cx={coord.x * state.view.zoom}
                            cy={coord.y * state.view.zoom}
                            onClick={() => {
                                dispatch({ type: 'pending:point', coord });
                            }}
                            r={5}
                            fill={'rgba(255,255,255,0.1)'}
                            css={{
                                fill: 'rgba(255,255,255,0.1)',
                                cursor: 'pointer',
                                ':hover': {
                                    fill: 'white',
                                },
                            }}
                        />
                    ))}
                    {state.pendingGuide ? (
                        <Pending
                            guide={state.pendingGuide}
                            pos={pos}
                            zoom={state.view.zoom}
                        />
                    ) : null}
                </g>
            </svg>
        </div>
    );
};

export const pendingGuide = (
    type: GuideGeom['type'],
    points: Array<Coord>,
): GuideGeom => {
    switch (type) {
        case 'Line':
            return {
                type,
                p1: points[0],
                p2: points[1],
            };
        case 'Circle':
            return {
                type,
                center: points[0],
                radius: points[1],
                half: false,
                multiples: 1,
            };
        case 'AngleBisector':
            return {
                type,
                p1: points[0],
                p2: points[1],
                p3: points[2],
            };
        case 'PerpendicularBisector':
            return {
                type,
                p1: points[0],
                p2: points[1],
            };
    }
};

export const Pending = ({
    guide,
    pos,
    zoom,
}: {
    pos: Coord;
    guide: { type: GuideGeom['type']; points: Array<Coord> };
    zoom: number;
}) => {
    let offsets = [
        { x: 3, y: 2 },
        { x: 1, y: 3 },
    ];

    const points = guide.points.concat([pos]);
    offsets.forEach((off) => {
        points.push({ x: pos.x + off.x, y: pos.y + off.y });
    });

    const prims = geomToPrimitives(pendingGuide(guide.type, points));

    return (
        <g style={{ pointerEvents: 'none' }}>
            <GuideElement
                zoom={zoom}
                original={true}
                geom={pendingGuide(guide.type, points)}
            />
        </g>
    );
};

function RenderPrimitive({
    prim,
    zoom,
    height,
    width,
}: {
    prim: Primitive;
    zoom: number;
    height: number;
    width: number;
}): jsx.JSX.Element {
    return prim.type === 'line' ? (
        prim.m === Infinity ? (
            <line
                x1={prim.b * zoom}
                y1={-height}
                y2={height}
                x2={prim.b * zoom}
                stroke="green"
                strokeWidth="1"
            />
        ) : (
            <line
                x1={-width}
                y1={-width * prim.m + prim.b * zoom}
                x2={width}
                y2={prim.m * width + prim.b * zoom}
                stroke="green"
                strokeWidth="1"
            />
        )
    ) : (
        <circle
            cx={prim.center.x * zoom}
            cy={prim.center.y * zoom}
            r={prim.radius * zoom}
            stroke="#666"
            strokeWidth="1"
            fill="none"
        />
    );
}
