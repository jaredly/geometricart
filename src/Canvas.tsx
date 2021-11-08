/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { findNextSegments } from './findNextSegments';
import {
    applyMatrices,
    dist,
    getMirrorTransforms,
    Matrix,
} from './getMirrorTransforms';
import { GuideElement } from './GuideElement';
import { Primitive } from './intersect';
import { calculateIntersections, geomToPrimitives } from './points';
import {
    Action,
    ArcSegment,
    Coord,
    Guide,
    GuideGeom,
    Id,
    Intersect,
    Mirror,
    Path,
    Pending,
    PendingGuide,
    PendingPath,
    PendingSegment,
    Segment,
    State,
    View,
} from './types';

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
        case 'InCircle':
        case 'AngleBisector':
        case 'CircumCircle':
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
        if (!guides[k].active) {
            return;
        }
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

export const numKey = (num: number) => {
    const res = num.toFixed(precision);
    if (res === '-0.000') {
        return '0.000';
    }
    return res;
};
const precision = 3;
export const primitiveKey = (p: Primitive) =>
    p.type === 'line'
        ? `${numKey(p.m)}:${numKey(p.b)}`
        : `${coordKey(p.center)}:${numKey(p.radius)}`;
export const coordKey = (coord: Coord) =>
    `${numKey(coord.x)},${numKey(coord.y)}`;

export const calcAllIntersections = (
    primitives: Array<Primitive>,
): Array<Intersect> => {
    const seenCoords: { [k: string]: Intersect } = {};
    const coords: Array<Intersect> = [];
    for (let i = 0; i < primitives.length; i++) {
        for (let j = i + 1; j < primitives.length; j++) {
            const pair: [number, number] = [i, j];
            coords.push(
                ...(calculateIntersections(primitives[i], primitives[j])
                    .map((coord) => {
                        const k = coordKey(coord);
                        if (seenCoords[k]) {
                            seenCoords[k].primitives.push(pair);
                            return null;
                        }
                        return (seenCoords[k] = { coord, primitives: [pair] });
                    })
                    .filter(Boolean) as Array<Intersect>),
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
        // console.log(primitives);
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
    const guideElements = React.useMemo(
        () => calculateGuideElements(state.guides, mirrorTransforms),
        [state.guides, mirrorTransforms],
    );

    const guidePrimitives = React.useMemo(() => {
        const seen: { [key: string]: true } = {};
        return ([] as Array<Primitive>)
            .concat(...guideElements.map((el) => geomToPrimitives(el.geom)))
            .filter((prim) => {
                const k = primitiveKey(prim);
                if (seen[k]) {
                    return false;
                }
                return (seen[k] = true);
            });
    }, [guideElements]);

    const allIntersections = React.useMemo(
        () => calcAllIntersections(guidePrimitives),
        [guidePrimitives],
    );

    const [pos, setPos] = React.useState({ x: 0, y: 0 });

    const currentState = React.useRef(state);
    currentState.current = state;

    const onClickIntersection = React.useCallback((coord: Intersect) => {
        const state = currentState.current;
        if (!state.pending) {
            dispatch({ type: 'path:point', coord });
        }
        if (state.pending && state.pending.type === 'Guide') {
            dispatch({
                type: 'pending:point',
                coord: coord.coord,
            });
        }
    }, []);

    const nextSegments = React.useMemo(() => {
        if (state.pending && state.pending.type === 'Path') {
            return findNextSegments(
                state.pending as PendingPath,
                guidePrimitives,
                allIntersections,
            );
        }
        return null;
    }, [
        state.pending && state.pending.type === 'Path' ? state.pending : null,
        allIntersections,
        guidePrimitives,
    ]);
    const onAdd = React.useCallback((segment: PendingSegment) => {
        dispatch({ type: 'path:add', segment });
    }, []);

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
                    {Object.keys(state.paths).map((k) => (
                        <RenderPath
                            key={k}
                            path={state.paths[k]}
                            zoom={state.view.zoom}
                        />
                    ))}
                    {state.view.guides ? (
                        <>
                            <Primitives
                                primitives={guidePrimitives}
                                zoom={state.view.zoom}
                                width={width}
                                height={height}
                            />
                            <Intersections
                                zoom={state.view.zoom}
                                intersections={allIntersections}
                                onClick={onClickIntersection}
                            />
                            {state.pending && state.pending.type === 'Guide' ? (
                                <RenderPendingGuide
                                    guide={state.pending}
                                    pos={pos}
                                    zoom={state.view.zoom}
                                />
                            ) : null}
                            {nextSegments ? (
                                <RenderPendingPath
                                    next={nextSegments}
                                    path={state.pending as PendingPath}
                                    zoom={state.view.zoom}
                                    onAdd={onAdd}
                                />
                            ) : null}
                        </>
                    ) : null}
                </g>
            </svg>
            <div>
                Guides: {guideElements.length}, Points:{' '}
                {allIntersections.length}
            </div>
        </div>
    );
};

export const RenderPath = ({ path, zoom }: { path: Path; zoom: number }) => {
    let d = `M ${path.origin.x * zoom} ${path.origin.y * zoom}`;
    path.segments.forEach((seg) => {
        if (seg.type === 'Line') {
            d += ` L ${seg.to.x * zoom} ${seg.to.y * zoom}`;
        } else {
            d += arcPath(seg, zoom);
        }
    });
    return <path d={d + ' Z'} fill={'green'} stroke="white" strokeWidth="3" />;
};

export const RenderPendingPath = React.memo(
    ({
        next,
        path,
        zoom,
        onAdd,
    }: {
        next: Array<PendingSegment>;
        path: PendingPath;
        zoom: number;
        onAdd: (next: PendingSegment) => unknown;
    }) => {
        const current = path.parts.length
            ? path.parts[path.parts.length - 1].to
            : path.origin;

        return (
            <>
                {path.parts.map((part, i) => (
                    <RenderSegment
                        key={i}
                        segment={part.segment}
                        zoom={zoom}
                        prev={
                            i === 0
                                ? path.origin.coord
                                : path.parts[i - 1].to.coord
                        }
                    />
                ))}
                {next.map((seg, i) => {
                    return (
                        <RenderSegment
                            key={i}
                            segment={seg.segment}
                            zoom={zoom}
                            prev={current.coord}
                            onClick={() => onAdd(seg)}
                        />
                    );
                })}
            </>
        );
    },
);

export const RenderSegment = ({
    segment,
    prev,
    zoom,
    onClick,
}: {
    segment: Segment;
    prev: Coord;
    zoom: number;
    onClick?: () => unknown;
}) => {
    if (segment.type === 'Line') {
        return (
            <line
                x1={prev.x * zoom}
                y1={prev.y * zoom}
                x2={segment.to.x * zoom}
                y2={segment.to.y * zoom}
                stroke={onClick ? 'red' : 'green'}
                strokeWidth={'4'}
                onClick={onClick}
                css={{
                    cursor: onClick ? 'pointer' : 'default',
                    ':hover': onClick
                        ? {
                              strokeWidth: '10',
                          }
                        : {},
                }}
            />
        );
    } else {
        return (
            <path
                onClick={onClick}
                stroke={onClick ? 'red' : 'green'}
                strokeWidth={'4'}
                fill="none"
                d={
                    `M ${prev.x * zoom} ${prev.y * zoom} ` +
                    arcPath(segment, zoom)
                }
                css={{
                    cursor: onClick ? 'pointer' : 'default',
                    ':hover': onClick
                        ? {
                              strokeWidth: '10',
                          }
                        : {},
                }}
            />
        );
    }
};

export const arcPath = (segment: ArcSegment, zoom: number) => {
    const r = dist(segment.to, segment.center);
    return `A ${r * zoom} ${r * zoom} 0 0 ${segment.clockwise ? 1 : 0} ${
        segment.to.x * zoom
    } ${segment.to.y * zoom}`;
};

export const Intersections = React.memo(
    ({
        zoom,
        intersections,
        onClick,
    }: {
        zoom: number;
        intersections: Array<Intersect>;
        onClick: (item: Intersect) => unknown;
    }) => {
        return (
            <>
                {intersections.map((intersection, i) => (
                    <circle
                        key={i}
                        cx={intersection.coord.x * zoom}
                        cy={intersection.coord.y * zoom}
                        onClick={() => {
                            onClick(intersection);
                        }}
                        r={5}
                        fill={'rgba(255,255,255,0.1)'}
                        css={{
                            fill: 'rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                            transition: '.2s ease r',
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
        case 'InCircle':
        case 'CircumCircle':
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

export const RenderPendingGuide = ({
    guide,
    pos,
    zoom,
}: {
    pos: Coord;
    guide: PendingGuide;
    zoom: number;
}) => {
    let offsets = [
        { x: -1, y: 1 },
        { x: 2, y: 1 },
    ];

    const points = guide.points.concat([pos]);
    offsets.slice(guide.points.length).forEach((off) => {
        points.push({ x: pos.x + off.x, y: pos.y + off.y });
    });

    const prims = geomToPrimitives(pendingGuide(guide.kind, points));

    return (
        <g style={{ pointerEvents: 'none' }}>
            <GuideElement
                zoom={zoom}
                original={true}
                geom={pendingGuide(guide.kind, points)}
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
                stroke="#666"
                strokeWidth="1"
            />
        ) : (
            <line
                x1={-width}
                y1={-width * prim.m + prim.b * zoom}
                x2={width}
                y2={prim.m * width + prim.b * zoom}
                stroke="#666"
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
