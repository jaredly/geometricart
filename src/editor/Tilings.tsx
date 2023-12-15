/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React, { useMemo, useState } from 'react';
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
    lineLine,
    lineToSlope,
    slopeToLine,
} from '../rendering/intersect';
import { numKey } from '../rendering/coordKey';
import { applyMatrices } from '../rendering/getMirrorTransforms';
import { transformPath, transformSegment } from '../rendering/points';
import { boundsForCoords } from './Bounds';
import {
    tilingPoints,
    getTransform,
    eigenShapesToSvg,
    eigenShapesToLines,
} from './tilingPoints';
import { UIDispatch } from '../useUIState';
import { coordsEqual } from '../rendering/pathsAreIdentical';
import { consoleSvg, renderSegments } from '../animation/renderSegments';
import { SegmentWithPrev } from '../rendering/clipPathNew';
import { emptyPath } from './RenderPath';
import { tilingTransforms } from './tilingTransforms';

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

export const simpleExport = async (state: State, shape: Tiling['shape']) => {
    const pts = tilingPoints(shape);
    const res = getShapesIntersectingPolygon(state, pts);
    if (!res) {
        return;
    }
    const { klines, shapes, tr, pts: tpts } = res;
    console.log('pts', pts);
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

export const slopeToPseg = (line: SlopeIntercept): SegmentWithPrev => {
    const [p1, p2] = slopeToLine(line);
    return { prev: p1, segment: { type: 'Line', to: p2 }, shape: -1 };
};

export function tilingCacheSvg(cache: Tiling['cache'], shape: Tiling['shape']) {
    const pts = tilingPoints(shape);
    const tx = getTransform(pts);
    return (
        <img
            style={{ width: 200 }}
            src={`data:image/svg+xml,${eigenShapesToSvg(
                cache.segments.map((s) => [s.prev, s.segment.to]),
                shape,
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

    const origSegments = paths.flatMap((id) =>
        addPrevsToSegments(
            state.paths[id].segments.map((seg) => transformSegment(seg, tx)),
        ),
    );
    const origLines = origSegments.map((iline) =>
        lineToSlope(iline.prev, iline.segment.to, true),
    );

    const isegs = intersections.flatMap((path) =>
        addPrevsToSegments(
            path.segments.map((seg) => transformSegment(seg, tx)),
        ),
    );
    // KEEP
    // consoleSvg(renderSegments(origSegments));
    // consoleSvg(renderSegments(isegs));
    isegs
        .map((iline) => lineToSlope(iline.prev, iline.segment.to, true))
        .filter((sl) => {
            if (
                trilines.some(
                    (tl) => closeEnough(tl.b, sl.b) && closeEnough(tl.m, sl.m),
                )
            ) {
                const ss = slopeToLine(sl);
                for (let os of origLines) {
                    if (!closeEnough(os.b, sl.b) || !closeEnough(os.m, sl.m)) {
                        continue;
                    }
                    const ol = slopeToLine(os);
                    if (
                        (coordsEqual(ss[0], ol[0]) ||
                            coordsEqual(ss[0], ol[1])) &&
                        (coordsEqual(ss[1], ol[1]) || coordsEqual(ss[1], ol[0]))
                    ) {
                        return true;
                    }
                    const int = lineLine(os, sl);
                    if (int) {
                        const back = slopeToLine(os);
                        const first = coordsEqual(int, back[0]);
                        const last = coordsEqual(int, back[1]);
                        if ((!first && !last) || (first && last)) {
                            // consoleSvg(
                            //     renderSegments(
                            //         [slopeToPseg(os), slopeToPseg(sl)],
                            //         undefined,
                            //         ['red', 'blue'],
                            //     ),
                            // );
                            // console.log(
                            //     'thing to remove, is maybe still good',
                            //     os,
                            //     sl,
                            //     int,
                            // );
                            return true;
                        }
                    }
                }
                // const got = origSegments.some((os) => lineLine(os, sl))
                // if () {
                //     return true;
                // }
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

export function handleTiling(data: Tiling) {
    const pts = tilingPoints(data.shape);
    const tx = getTransform(pts);
    const bounds = pts.map((pt) => applyMatrices(pt, tx));
    const lines = data.cache.segments.map((s): [Coord, Coord] => [
        s.prev,
        s.segment.to,
    ]);
    const tr = applyMatrices(pts[2], tx);
    return { bounds, lines, tr };
}

export function getSvgData(data: Tiling): {
    bounds: Coord[];
    lines: [Coord, Coord][];
} {
    const { bounds, lines, tr } = handleTiling(data);
    return { bounds, lines: eigenShapesToLines(lines, data.shape, tr, bounds) };
}

export const handleNegZero = (n: number) => {
    const m = n.toFixed(2);
    return m === '-0.00' ? '0.00' : m;
};

export function tilingSvg(
    bounds: Coord[],
    lines: [Coord, Coord][],
    size = 300,
) {
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
            })}
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
            {tilingSvg(bounds, lines)}
        </a>
    );
};
