/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React, { useState } from 'react';
import { Action } from '../state/Action';
import { Coord, Path, Segment, State, Tiling } from '../types';
import { closeEnough } from '../rendering/clipPath';
import {
    consumePath,
    getVisiblePaths,
    pkClips,
} from '../rendering/pkInsetPaths';
import { getSelectedIds } from './SVGCanvas';
import { PK } from './pk';
import { pkPath } from '../sidebar/NewSidebar';
import { addPrevsToSegments } from '../rendering/segmentsToNonIntersectingSegments';
import {
    SlopeIntercept,
    lineToSlope,
    slopeToLine,
} from '../rendering/intersect';
import { numKey } from '../rendering/coordKey';
import {
    Matrix,
    angleTo,
    applyMatrices,
    dist,
    rotationMatrix,
    scaleMatrix,
    translationMatrix,
} from '../rendering/getMirrorTransforms';
import { scalePos } from './PendingPreview';
import { transformSegment } from '../rendering/points';
import { boundsForCoords } from './Bounds';

export const Tilings = ({
    state,
    dispatch,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
}) => {
    const [flip, setFlip] = useState(false);
    const [img, setImg] = useState('');
    const [large, setLarge] = useState(false);
    return (
        <div>
            {Object.values(state.tilings).map((tiling) => (
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
                            const svg = await simpleExport(state, tiling.shape);
                            if (!svg) {
                                return;
                            }
                            consoleSvg(svg);
                            setImg(`data:image/svg+xml,${svg}`);
                        }}
                    >
                        Show me the money
                    </button>
                </div>
            ))}
            {img ? (
                <img
                    src={img}
                    onClick={() => setLarge(!large)}
                    style={
                        large
                            ? {
                                  width: 1000,
                                  height: 1000,
                                  zIndex: 1000,
                                  position: 'fixed',
                                  top: 0,
                                  left: 0,
                              }
                            : {}
                    }
                />
            ) : null}
            {/* <label>
                <input
                    type="checkbox"
                    checked={flip}
                    onChange={() => setFlip(!flip)}
                />
                Flip
            </label>
            <button
                css={{ marginTop: 24, marginBottom: 16 }}
                onClick={() => {
                    const ids = Object.entries(
                        getSelectedIds(state.paths, state.selection),
                    )
                        .filter(([k, v]) => v)
                        .map((k) => k[0]);
                    if (
                        ids.length !== 1 ||
                        state.paths[ids[0]].segments.length !== 3
                    ) {
                        console.log('select a triagle');
                        return;
                    }
                    // we gots a triangle
                    const segs = state.paths[ids[0]].segments;
                    if (!segs.every((s) => s.type === 'Line')) {
                        console.log('has arcs');
                        return;
                    }
                    const trid = ids[0];
                    simpleExport(state, trid, flip);
                }}
            >
                Export a thing
            </button> */}
        </div>
    );
};

const ShowTiling = ({ tiling }: { tiling: Tiling }) => {
    const pts = tilingPoints(tiling.shape);
    const { x0, y0, x1, y1 } = boundsForCoords(...pts);

    return (
        <svg
            viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`}
            style={{ background: 'black', width: 50, height: 50 }}
        >
            <path
                fill="red"
                d={pts
                    .map(({ x, y }, i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`)
                    .join(' ')}
            />
        </svg>
    );
};

export const simpleExport = async (state: State, shape: Tiling['shape']) => {
    const flip = shape.type === 'right-triangle' && shape.rotateHypotenuse;
    const pts = tilingPoints(shape);
    const res = getShapesIntersectingTriangle(state, pts);
    if (!res) {
        return;
    }
    const { klines, shapes, tr } = res;
    console.log('klins', klines);
    const segs = Object.keys(klines).sort();

    const hashHex = await hashData(segs.join(','));
    console.log(hashHex);

    const unique = Object.values(klines).map(slopeToLine);

    let full = unique;
    if (flip) {
        full = full.concat(
            transformLines(full, [
                rotationMatrix(Math.PI),
                translationMatrix(tr),
            ]),
        );
        full = replicateStandard(full, tr.y);
    } else if (closeEnough(tr.y, -1 / Math.sqrt(3))) {
        full = full.concat(
            transformLines(full, [
                scaleMatrix(1, -1),
                rotationMatrix(-(Math.PI / 3)),
            ]),
        );
        full = full.concat(
            transformLines(full, [
                scaleMatrix(1, -1),
                rotationMatrix(-(Math.PI / 3) * 2),
            ]),
            transformLines(full, [
                scaleMatrix(1, -1),
                rotationMatrix(-Math.PI),
            ]),
        );
        full = full.concat(transformLines(full, [scaleMatrix(1, -1)]));
        full = full.concat(
            ...[0, 1, 2, 3, 4, 5].map((i) =>
                transformLines(full, [
                    translationMatrix({ x: 2, y: 0 }),
                    rotationMatrix((Math.PI / 3) * i),
                ]),
            ),
        );
    } else {
        full = full.concat(
            transformLines(full, [
                scaleMatrix(1, -1),
                rotationMatrix(-Math.PI / 2),
            ]),
        );
        full = replicateStandard(full, tr.y);
    }

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="50" style="background:black" height="50" viewBox="-2.5 -2.5 5 5">
    <circle cx="0" cy="0" r="0.01" fill="red" />
    ${full
        .map(([p1, p2]) => {
            return `<line
            stroke-linecap='round' stroke-linejoin='round'
             x1="${p1.x}" x2="${p2.x}" y1="${p1.y}" y2="${p2.y}" stroke="yellow" stroke-width="0.02"/>`;
        })
        .join('\n')}
    </svg>
    `;
    // consoleSvg(svg);
    return svg;
};
const consoleSvg = (svg: string) => {
    const bgi = `data:image/svg+xml;base64,${btoa(svg)}`;
    // const img = new Image();
    // img.src = bgi;
    // document.body.append(img);
    console.log(
        '%c ',
        `background-image: url("${bgi}");background-size:cover;padding:80px 85px`,
    );
};
const transformLines = (lines: [Coord, Coord][], mx: Matrix[]) =>
    lines.map(([p1, p2]): [Coord, Coord] => [
        applyMatrices(p1, mx),
        applyMatrices(p2, mx),
    ]);

function tilingPoints(
    shape:
        | {
              type: 'right-triangle';
              rotateHypotenuse: boolean;
              start: Coord;
              corner: Coord;
              end: Coord;
          }
        | { type: 'isocelese'; first: Coord; second: Coord; third: Coord },
) {
    return shape.type === 'right-triangle'
        ? [shape.start, shape.corner, shape.end]
        : [shape.first, shape.second, shape.third];
}

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
function replicateStandard(full: [Coord, Coord][], ty: number) {
    full = full.concat(
        transformLines(full, [
            scaleMatrix(-1, 1),
            translationMatrix({ x: 2, y: 0 }),
        ]),
    );
    full = full.concat(
        transformLines(full, [
            scaleMatrix(1, -1),
            translationMatrix({ x: 0, y: ty * 2 }),
        ]),
    );
    full.push(...transformLines(full, [scaleMatrix(1, -1)]));
    full.push(...transformLines(full, [scaleMatrix(-1, 1)]));
    return full;
}

export const getShapesIntersectingTriangle = (state: State, pts: Coord[]) => {
    // const tri = state.paths[trid];
    // const pts = tri.segments.map((s) => s.to);
    // const mx = Math.min(...pts.map((p) => p.x));
    // const bl = pts.find((p) => p.x === mx)!;
    // const br = pts.find((p) => p !== bl && closeEnough(p.y, bl.y));
    // const tr = pts.find((p) => p !== bl && !closeEnough(p.y, bl.y));
    // if (!br || !tr) {
    //     console.error('no bottom right');
    //     return;
    // }
    const [center, corner, top] = pts;

    const scale = 1 / dist(center, corner);
    const translate = scalePos(center, -1);
    const rotate = -angleTo(center, corner);
    const tx = [
        translationMatrix(translate),
        rotationMatrix(rotate),
        scaleMatrix(scale, scale),
    ];
    const top_ = applyMatrices(top, tx);
    if (top_.y > 0) {
        tx.push(scaleMatrix(1, -1));
        top_.y *= -1;
    }

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
    const shapes: Path[] = [];
    const intersections = paths.flatMap((id) => {
        const got = consumePath(
            PK,
            pkClips(
                PK,
                pkPath(PK, state.paths[id].segments, state.paths[id].origin),
                [pkc],
                state.paths[id],
            ),
            state.paths[id],
        );
        if (got.length) {
            shapes.push(state.paths[id]);
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
    return { shapes, klines, tr: applyMatrices(pts[2], tx) };
};
