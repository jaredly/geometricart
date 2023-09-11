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
    applyMatrices,
    dist,
    rotationMatrix,
    scaleMatrix,
    translationMatrix,
} from '../rendering/getMirrorTransforms';
import { scalePos } from './PendingPreview';
import { transformSegment } from '../rendering/points';

export const Tilings = ({
    state,
    dispatch,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
}) => {
    const [flip, setFlip] = useState(false);
    return (
        <div>
            {Object.values(state.tilings).map((tiling) => (
                <div key={tiling.id}>
                    <div>Tiling {tiling.id}</div>
                    <button
                        onClick={() => {
                            simpleExport(state, tiling.shape);
                        }}
                    >
                        Show me the money
                    </button>
                </div>
            ))}
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

export const simpleExport = async (state: State, shape: Tiling['shape']) => {
    const flip = false;
    const pts =
        shape.type === 'right-triangle'
            ? [shape.start, shape.corner, shape.end]
            : [shape.first, shape.second, shape.third];
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
    ${full
        .map(([p1, p2]) => {
            return `<line x1="${p1.x}" x2="${p2.x}" y1="${p1.y}" y2="${p2.y}" stroke="yellow" stroke-width="0.02"/>`;
        })
        .join('\n')}
    </svg>
    `;
    consoleSvg(svg);
};
const consoleSvg = (svg: string) => {
    const bgi = `data:image/svg+xml;base64,${btoa(svg)}`;
    const img = new Image();
    img.src = bgi;
    document.body.append(img);
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
    const mx = Math.min(...pts.map((p) => p.x));
    const bl = pts.find((p) => p.x === mx)!;
    const br = pts.find((p) => p !== bl && closeEnough(p.y, bl.y));
    const tr = pts.find((p) => p !== bl && !closeEnough(p.y, bl.y));
    if (!br || !tr) {
        console.error('no bottom right');
        return;
    }
    const scale = 1 / dist(bl, br);
    const translate = scalePos(bl, -1);
    const tx = [translationMatrix(translate), scaleMatrix(scale, scale)];

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
    return { shapes, klines, tr: applyMatrices(tr, tx) };
};
