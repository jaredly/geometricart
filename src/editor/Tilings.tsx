/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React, { useState } from 'react';
import { Action } from '../state/Action';
import {
    BarePath,
    Coord,
    Path,
    SegPrev,
    Segment,
    State,
    Tiling,
} from '../types';
import { closeEnough } from '../rendering/epsilonToZero';
import {
    consumePath,
    getVisiblePaths,
    pkClips,
} from '../rendering/pkInsetPaths';
import { PK } from './pk';
import { pkPath } from '../sidebar/NewSidebar';
import { addPrevsToSegments } from '../rendering/segmentsToNonIntersectingSegments';
import {
    SlopeIntercept,
    lineToSlope,
    slopeToLine,
} from '../rendering/intersect';
import { numKey } from '../rendering/coordKey';
import { applyMatrices } from '../rendering/getMirrorTransforms';
import { transformPath, transformSegment } from '../rendering/points';
import { boundsForCoords } from './Bounds';
import { tilingPoints, getTransform, eigenShapesToSvg } from './tilingPoints';

export const Tilings = ({
    state,
    dispatch,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
}) => {
    const [large, setLarge] = useState(false);
    return (
        <div>
            {Object.values(state.tilings).map((tiling) => {
                return (
                    <div key={tiling.id}>
                        <div>Tiling {tiling.id}</div>
                        <ShowTiling tiling={tiling} />
                        {tiling.shape.type === 'right-triangle' ? (
                            <label>
                                <input
                                    type="checkbox"
                                    checked={tiling.shape.rotateHypotenuse}
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
                        ) : null}
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
                        {tiling.cache
                            ? tilingCacheSvg(tiling.cache, tiling.shape)
                            : null}
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

export const simpleExport = async (state: State, shape: Tiling['shape']) => {
    const pts = tilingPoints(shape);
    const res = getShapesIntersectingPolygon(state, pts);
    if (!res) {
        return;
    }
    const { klines, shapes, tr, pts: tpts } = res;
    console.log('klins', klines);
    const segs = Object.keys(klines).sort();

    const hash = await hashData(segs.join(','));

    const unique = Object.values(klines).map(slopeToLine);

    return {
        hash,
        segments: unique.map(
            ([p1, p2]): SegPrev => ({
                prev: p1,
                segment: { type: 'Line', to: p2 },
            }),
        ),
        shapes,
    };
};

export function tilingCacheSvg(cache: Tiling['cache'], shape: Tiling['shape']) {
    const pts = tilingPoints(shape);
    const tx = getTransform(pts);
    return (
        <img
            style={{ width: 200 }}
            src={`data:image/svg+xml,${eigenShapesToSvg(
                cache.segments.map((s) => [s.prev, s.segment.to]),
                shape.type === 'right-triangle' && shape.rotateHypotenuse,
                applyMatrices(pts[2], tx),
                pts.map((pt) => applyMatrices(pt, tx)),
            )}`}
        />
    );
}

export const getShapesIntersectingPolygon = (state: State, pts: Coord[]) => {
    const tx = getTransform(pts);

    const segments: Segment[] = pts.map((to) => ({ type: 'Line', to }));
    const origin = pts[pts.length - 1];

    const trilines = addPrevsToSegments(
        segments.map((seg) => transformSegment(seg, tx)),
    ).map((seg) => lineToSlope(seg.prev, seg.segment.to, true));
    const klines: Record<string, SlopeIntercept> = {};

    const paths = getVisiblePaths(state.paths, state.pathGroups);
    const pkc = {
        path: pkPath(PK, segments, origin),
        outside: false,
    };
    const shapes: BarePath[] = [];
    const intersections = paths.flatMap((id) => {
        const got = consumePath(
            PK,
            pkClips(
                PK,
                pkPath(PK, state.paths[id].segments, state.paths[id].origin),
                [pkc],
                state.paths[id],
            )[0],
            state.paths[id],
        );
        if (got.length) {
            const { origin, segments, open } = transformPath(
                state.paths[id],
                tx,
            );
            shapes.push({ origin, segments, open });
        }
        return got;
    });

    intersections
        .flatMap((path) =>
            addPrevsToSegments(
                path.segments.map((seg) => transformSegment(seg, tx)),
            ),
        )
        .map((iline) => lineToSlope(iline.prev, iline.segment.to, true))
        .filter((sl) => {
            if (
                trilines.some(
                    (tl) => closeEnough(tl.b, sl.b) && closeEnough(tl.m, sl.m),
                )
            ) {
                return false;
            }
            return true;
        })
        .forEach((sl) => {
            const [min, max] = sl.limit!;
            const key = `${numKey(min)}:${numKey(sl.b)}:${numKey(
                sl.m,
            )}:${numKey(max)}`;
            klines[key] = sl;
        });
    return {
        shapes,
        klines,
        tr: applyMatrices(pts[2], tx),
        pts: pts.map((pt) => applyMatrices(pt, tx)),
    };
};

async function hashData(kk: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(kk);
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', data);

    const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''); // convert bytes to hex string
    return hashHex;
}
