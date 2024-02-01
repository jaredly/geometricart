/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React, { useMemo, useState } from 'react';
import { Action } from '../state/Action';
import { BarePath, Coord, Path, State, Tiling } from '../types';
import {
    applyMatrices,
    translationMatrix,
} from '../rendering/getMirrorTransforms';
import { transformBarePath, transformSegment } from '../rendering/points';
import { boundsForCoords, segmentsBounds } from './Bounds';
import { tilingPoints } from './tilingPoints';
import { UIDispatch } from '../useUIState';
import { emptyPath } from './RenderPath';
import { tilingTransforms } from './tilingTransforms';
import { calcSegmentsD } from './calcPathD';
import {
    handleTiling,
    simpleExport,
    handleNegZero,
    getSvgData,
} from './handleTiling';

export const Tilings = ({
    state,
    dispatch,
    uiDispatch,
}: {
    state: State;
    uiDispatch: UIDispatch;
    dispatch: React.Dispatch<Action>;
}) => {
    const [large, setLarge] = useState(false);
    return (
        <div>
            {Object.values(state.tilings).map((tiling) => {
                return (
                    <div
                        key={tiling.id}
                        onMouseEnter={() =>
                            uiDispatch({
                                type: 'hover',
                                hover: {
                                    id: tiling.id,
                                    kind: 'Tiling',
                                    type: 'element',
                                },
                            })
                        }
                        onMouseLeave={() =>
                            uiDispatch({ type: 'hover', hover: null })
                        }
                    >
                        <div>Tiling {tiling.id}</div>
                        <div style={{ display: 'flex' }}>
                            <ShowTiling tiling={tiling} />
                            {tiling.shape.type === 'right-triangle' ? (
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={
                                            !!tiling.shape.rotateHypotenuse
                                        }
                                        onChange={() => {
                                            const sh = tiling.shape as Extract<
                                                Tiling['shape'],
                                                { type: 'right-triangle' }
                                            >;

                                            dispatch({
                                                type: 'tiling:update',
                                                tiling: {
                                                    ...tiling,
                                                    shape: {
                                                        ...sh,
                                                        rotateHypotenuse:
                                                            !sh.rotateHypotenuse,
                                                    },
                                                },
                                            });
                                        }}
                                    />
                                    Rotate around hypotenuse
                                </label>
                            ) : tiling.shape.type === 'isocelese' ? (
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={!!tiling.shape.flip}
                                        onChange={() => {
                                            const sh = tiling.shape as Extract<
                                                Tiling['shape'],
                                                { type: 'isocelese' }
                                            >;

                                            dispatch({
                                                type: 'tiling:update',
                                                tiling: {
                                                    ...tiling,
                                                    shape: {
                                                        ...sh,
                                                        flip: !sh.flip,
                                                    },
                                                },
                                            });
                                        }}
                                    />
                                    Flip (vs rotate)
                                </label>
                            ) : null}
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                }}
                            >
                                <button
                                    onClick={() => {
                                        const { bounds, lines, tr } =
                                            handleTiling(tiling);
                                        const mx = tilingTransforms(
                                            tiling.shape,
                                            tr,
                                            bounds,
                                        );

                                        let shapes = tiling.cache.shapes;
                                        mx.forEach((set) => {
                                            shapes = shapes.concat(
                                                ...set.map((s) =>
                                                    shapes.map((shape) => ({
                                                        origin: applyMatrices(
                                                            shape.origin,
                                                            s,
                                                        ),
                                                        segments:
                                                            shape.segments.map(
                                                                (seg) =>
                                                                    transformSegment(
                                                                        seg,
                                                                        s,
                                                                    ),
                                                            ),
                                                    })),
                                                ),
                                            );
                                        });
                                        dispatch({
                                            type: 'path:create:many',
                                            paths: shapes.map(
                                                (bare): Path => ({
                                                    ...emptyPath,
                                                    origin: bare.origin,
                                                    segments: bare.segments,
                                                }),
                                            ),
                                            withMirror: false,
                                        });
                                    }}
                                >
                                    Create shapes
                                </button>
                                <button
                                    onClick={async () => {
                                        const cache = await simpleExport(
                                            state,
                                            tiling.shape,
                                        );
                                        if (!cache) return;

                                        dispatch({
                                            type: 'tiling:update',
                                            tiling: { ...tiling, cache },
                                        });
                                    }}
                                >
                                    Recalculate eigenshapes
                                </button>
                            </div>
                        </div>
                        <div style={{ fontSize: '70%' }}>
                            {tiling.cache?.hash.slice(0, 10)}
                        </div>
                        <div>
                            {(
                                JSON.stringify(tiling.cache)?.length / 1000
                            ).toFixed(2)}
                            kb with shapes,{' '}
                            {(
                                JSON.stringify({
                                    segments: tiling.cache?.segments,
                                    hash: tiling.cache?.hash,
                                }).length / 1000
                            ).toFixed(2)}
                            kb without
                        </div>
                        {tiling.cache ? <SimpleTiling tiling={tiling} /> : null}
                        <button
                            onClick={() => {
                                dispatch({
                                    type: 'tiling:delete',
                                    id: tiling.id,
                                });
                            }}
                        >
                            Delete Tiling
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

const ShowTiling = ({ tiling }: { tiling: Tiling }) => {
    const pts = tilingPoints(tiling.shape);
    const { x0, y0, x1, y1 } = boundsForCoords(...pts);
    const w = x1 - x0;
    const h = y1 - y0;
    const m = Math.min(w, h) / 10;

    return (
        <svg
            viewBox={`${x0 - m} ${y0 - m} ${w + m * 2} ${h + m * 2}`}
            style={{ background: 'black', width: 50, height: (h / w) * 50 }}
        >
            <path
                fill="rgb(100,0,0)"
                d={pts
                    .map(({ x, y }, i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`)
                    .join(' ')}
            />
        </svg>
    );
};

export function TilingSvg({
    bounds,
    lines,
    shapes,
    size = 300,
}: {
    shapes: BarePath[];
    bounds: Coord[];
    lines: [Coord, Coord][];
    size?: number;
}) {
    const normShapes = useMemo(() => {
        const margin = 0.1;
        let left = -2.5;
        let y = 0;
        let rh = 0;
        return shapes.map((shape) => {
            const bounds = segmentsBounds(shape.segments);
            if (left + (bounds.x1 - bounds.x0) > 2.5) {
                left = -2.5;
                y += rh + 0.1;
                rh = 0;
            }
            const norm = transformBarePath(shape, [
                translationMatrix({
                    x: -bounds.x0 + left,
                    y: -bounds.y0 + y,
                }),
            ]);
            left += bounds.x1 - bounds.x0 + margin;
            rh = Math.max(rh, bounds.y1 - bounds.y0);
            return norm;
        });
    }, [shapes]);

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            style={{ background: 'black', width: size, height: size }}
            viewBox="-2.5 -2.5 5 5"
        >
            <path
                d={`${bounds
                    .map(
                        ({ x, y }, i) =>
                            `${i === 0 ? 'M' : 'L'}${handleNegZero(
                                x,
                            )} ${handleNegZero(y)}`,
                    )
                    .join(' ')}Z`}
                fill="rgb(50,50,50)"
                stroke="none"
            />
            {lines.map(([p1, p2], i) => {
                return (
                    <line
                        key={i}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        x1={p1.x.toFixed(2)}
                        x2={p2.x.toFixed(2)}
                        y1={p1.y.toFixed(2)}
                        y2={p2.y.toFixed(2)}
                        stroke="yellow"
                        strokeWidth="0.02"
                    />
                );
            })}{' '}
            {normShapes.map((shape, i) => (
                <path
                    key={i}
                    d={calcSegmentsD(
                        shape.segments,
                        shape.origin,
                        shape.open,
                        1,
                    )}
                    fill="red"
                />
            ))}
        </svg>
    );
}

const PREFIX = '<!-- TILING:';
const SUFFIX = '-->';

export const SimpleTiling = ({ tiling }: { tiling: Tiling }) => {
    const { bounds, lines } = useMemo(() => getSvgData(tiling), [tiling]);

    return (
        <a
            href=""
            download={'tiling-' + tiling.cache.hash + '.svg'}
            onClick={(evt) => {
                const txt = evt.currentTarget.innerHTML;
                const blob = new Blob(
                    [txt + PREFIX + JSON.stringify(tiling) + SUFFIX],
                    {
                        type: 'image/svg+xml',
                    },
                );
                const url = URL.createObjectURL(blob);
                evt.currentTarget.href = url;
                setTimeout(() => {
                    evt.currentTarget.href = '';
                    URL.revokeObjectURL(url);
                }, 0);
            }}
        >
            <TilingSvg
                bounds={bounds}
                lines={lines}
                shapes={tiling.cache.shapes}
            />
        </a>
    );
};
