/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React, { useState } from 'react';
import { BlurInt, Text, Toggle } from './Forms';
import { transparent } from './Icons';
import { angleBetween } from '../rendering/findNextSegments';
import { sortedVisibleInsetPaths } from '../rendering/sortedVisibleInsetPaths';
import { Action } from '../state/Action';
import { State } from '../types';
import { closeEnough } from '../rendering/clipPath';
import { PendingBounds, newPendingBounds, addCoordToBounds } from './Bounds';
import { MultiColor, constantColors, maybeUrlColor } from './MultiStyleForm';
import { UIState } from '../useUIState';
import {
    consumePath,
    getClips,
    getVisiblePaths,
    pkClips,
} from '../rendering/pkInsetPaths';
import { ExportSVG } from './ExportSVG';
import { ExportPng } from './ExportPng';
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
    dist,
    scaleMatrix,
    translationMatrix,
} from '../rendering/getMirrorTransforms';
import { scalePos } from './PendingPreview';
import { transformSegment } from '../rendering/points';

export type Bounds = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
};

export const findBoundingRect = (state: State): Bounds | null => {
    const clip = getClips(state);

    let bounds: PendingBounds = newPendingBounds();
    // NOTE: This won't totally cover arcs, but that's just too bad folks.
    sortedVisibleInsetPaths(
        state.paths,
        state.pathGroups,
        { next: (_, __) => 0 },
        clip,
    ).forEach((path) => {
        addCoordToBounds(bounds, path.origin);
        // TODO: Get proper bounding box for arc segments.
        path.segments.forEach((t) => addCoordToBounds(bounds, t.to));
    });
    if (bounds.x0 == null || bounds.y0 == null) {
        return null;
    }
    return { x1: bounds.x0!, y1: bounds.y0!, x2: bounds.x1!, y2: bounds.y1! };
};

export type Multi = NonNullable<State['view']['multi']>;

export const Export = ({
    state,
    dispatch,
    originalSize,
}: {
    state: State;
    originalSize: number;
    dispatch: (action: Action) => void;
}) => {
    // const [name, setName] = React.useState()
    const [url, setUrl] = React.useState(
        null as null | { url: string; info: string }[],
    );
    const [animationPosition, setAnimationPosition] = React.useState(0);

    const [png, setPng] = React.useState(null as null | string);

    const [size, setSize] = React.useState(originalSize);
    const [embed, setEmbed] = React.useState(true);
    const [history, setHistory] = React.useState(false);
    const name = `image-${Date.now()}${history ? '-history' : ''}.svg`;

    const [crop, setCrop] = React.useState(10 as null | number);

    const boundingRect = React.useMemo(
        () => findBoundingRect(state),
        [state.paths, state.pathGroups, state.clips],
    );

    return (
        <div className="p-2" css={{}}>
            <div
                css={{
                    padding: 4,
                    marginBottom: 16,
                }}
            >
                Title:{' '}
                <Text
                    value={state.meta.title}
                    onChange={(title) =>
                        dispatch({
                            type: 'meta:update',
                            meta: { ...state.meta, title },
                        })
                    }
                />
                <br />
                <div>Description:</div>
                <Text
                    value={state.meta.description}
                    multiline
                    onChange={(description) =>
                        dispatch({
                            type: 'meta:update',
                            meta: { ...state.meta, description },
                        })
                    }
                />
            </div>
            <div>
                <Toggle
                    label="Embed editor state"
                    value={embed}
                    onChange={setEmbed}
                />
                {embed ? (
                    <Toggle
                        label="Embed history"
                        value={history}
                        onChange={setHistory}
                    />
                ) : null}
            </div>
            <div>
                Animation Position
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={animationPosition}
                    onChange={(evt) => setAnimationPosition(+evt.target.value)}
                />
                <BlurInt
                    value={animationPosition}
                    onChange={(v) => (v ? setAnimationPosition(v) : null)}
                />
            </div>
            <ExportPng
                size={size}
                setSize={setSize}
                state={state}
                originalSize={originalSize}
                embed={embed}
                history={history}
                animationPosition={animationPosition}
                setPng={setPng}
                png={png}
                name={name}
            />
            <ExportSVG
                state={state}
                dispatch={dispatch}
                originalSize={originalSize}
                boundingRect={boundingRect}
                crop={crop}
                setCrop={setCrop}
                embed={embed}
                history={history}
                setUrl={setUrl}
                url={url}
                name={name}
            />
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
                    simpleExport(state, trid);
                }}
            >
                Export a thing
            </button>
            <div
                css={{
                    display: 'flex',
                    flexDirection: 'row',
                }}
            >
                <div></div>
                {/* {render ? <RenderWebGL state={state} /> : null} */}
            </div>
        </div>
    );
};

const blankUIState: UIState = {
    hover: null,
    pendingDuplication: null,
    pendingMirror: null,
    previewActions: [],
    screen: 'edit',
    styleHover: null,
};

export const blankCanvasProps = {
    pendingMirror: null,
    setPendingMirror: (_: any) => {},
    dispatch: (_: any) => {},
    hover: null,
    setHover: (_: any) => {},
    uiState: blankUIState,
    styleHover: null,
    // Clear out background in laser cut mode
    pendingDuplication: null,
    setPendingDuplication: () => null,
    isTouchScreen: false,
} as const;

export const DL = ({
    url,
    name,
    subtitle,
}: {
    url: string;
    name: string;
    subtitle: string;
}) => {
    return (
        <>
            <a
                href={url}
                download={name}
                css={{
                    color: 'white',
                    background: '#666',
                    borderRadius: 6,
                    padding: '4px 8px',
                    display: 'block',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    marginBottom: 16,
                }}
            >
                Download {name}
            </a>
            {subtitle}
            <div
                style={{
                    backgroundImage: `url("${transparent}")`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: 40,
                }}
            >
                <img src={url} css={{ maxHeight: 400 }} />
            </div>
        </>
    );
};

export const simpleExport = (state: State, trid: string) => {
    const paths = getVisiblePaths(state.paths, state.pathGroups).filter(
        (i) => i !== trid,
    );
    const pkc = [
        {
            path: pkPath(
                PK,
                state.paths[trid].segments,
                state.paths[trid].origin,
            ),
            outside: false,
        },
    ];
    const intersections = paths
        .map((id) =>
            consumePath(
                PK,
                pkClips(
                    PK,
                    pkPath(
                        PK,
                        state.paths[id].segments,
                        state.paths[id].origin,
                    ),
                    pkc,
                    state.paths[id],
                ),
                state.paths[id],
            ),
        )
        .flat();

    const pts = state.paths[trid].segments.map((s) => s.to);
    const mx = Math.min(...pts.map((p) => p.x));
    const bl = pts.find((p) => p.x === mx)!;
    const br = pts.find((p) => p !== bl && closeEnough(p.y, bl.y));
    if (!br) {
        console.error('no bottom right');
        return;
    }
    const scale = 1 / dist(bl, br);
    const translate = scalePos(bl, -1);
    const tx = [translationMatrix(translate), scaleMatrix(scale, scale)];
    console.log({ translate, scale });

    const trilines = addPrevsToSegments(
        state.paths[trid].segments.map((seg) => transformSegment(seg, tx)),
    ).map((seg) => lineToSlope(seg.prev, seg.segment.to, true));
    const klines: Record<string, SlopeIntercept> = {};
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
    console.log('klins', klines);
    const segs = Object.keys(klines).sort();
    // .map((k) => klines[k]);
    console.log(segs);
};
