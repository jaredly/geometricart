/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import * as ReactDOM from 'react-dom';
import React from 'react';
import { Coord, Pending, Segment, State } from './types';
import { Action } from './Action';
import { PREFIX, SUFFIX } from './Sidebar';
import {
    extractChunks,
    insertMetadata,
    encodeChunks,
    readMetadata,
} from 'png-metadata';
import { Toggle, Text, BlurInt } from './Forms';
import { transparent } from './Icons';
import { canvasRender } from './CanvasRender';
import { RenderWebGL, setup } from './RenderWebGL';
import { texture1, texture2 } from './textures';
import { initialHistory } from './initialState';
import { Canvas } from './Canvas';
import { sortedVisibleInsetPaths } from './sortedVisibleInsetPaths';
import { Bounds } from './GuideElement';
import { angleBetween } from './findNextSegments';
import { angleTo, dist, push } from './getMirrorTransforms';

export type PendingBounds = {
    x0: null | number;
    x1: null | number;
    y0: null | number;
    y1: null | number;
};

export function addCoordToBounds(bounds: PendingBounds, c: Coord) {
    bounds.x0 = bounds.x0 == null ? c.x : Math.min(c.x, bounds.x0);
    bounds.x1 = bounds.x1 == null ? c.x : Math.max(c.x, bounds.x1);
    bounds.y0 = bounds.y0 == null ? c.y : Math.min(c.y, bounds.y0);
    bounds.y1 = bounds.y1 == null ? c.y : Math.max(c.y, bounds.y1);
}

function newPendingBounds(): PendingBounds {
    return { x0: null, y0: null, x1: null, y1: null };
}

export const boundsForCoords = (...coords: Array<Coord>) => {
    const xs = coords.map((c) => c.x);
    const ys = coords.map((c) => c.y);
    return {
        x0: Math.min(...xs),
        x1: Math.max(...xs),
        y0: Math.min(...ys),
        y1: Math.max(...ys),
    };
};

export const mergeBounds = (b1: Bounds, b2: Bounds): Bounds => ({
    x0: Math.min(b1.x0, b2.x0),
    y0: Math.min(b1.y0, b2.y0),
    x1: Math.max(b1.x1, b2.x1),
    y1: Math.max(b1.y1, b2.y1),
});

export const largestDimension = ({ x0, x1, y0, y1 }: Bounds) =>
    Math.max(Math.abs(x0), Math.abs(x1), Math.abs(y0), Math.abs(y1));

export const adjustBounds = (
    { x0, x1, y0, y1 }: Bounds,
    { x, y }: Coord,
): Bounds => ({
    x0: x0 - x,
    x1: x1 - x,
    y0: y0 - y,
    y1: y1 - y,
});

export const segmentsBounds = (segments: Array<Segment>): Bounds => {
    let bounds = segmentBounds(segments[segments.length - 1].to, segments[0]);
    for (let i = 1; i < segments.length; i++) {
        const next = segmentBounds(segments[i - 1].to, segments[i]);
        bounds = mergeBounds(bounds, next);
    }
    return bounds;
};

export const segmentBounds = (prev: Coord, segment: Segment): Bounds => {
    switch (segment.type) {
        case 'Line':
            return {
                x0: Math.min(segment.to.x, prev.x),
                x1: Math.max(segment.to.x, prev.x),
                y0: Math.min(segment.to.y, prev.y),
                y1: Math.max(segment.to.y, prev.y),
            };
        case 'Arc': {
            // lets do 3 samples, we'll be generous
            const t0 = angleTo(segment.center, prev);
            const t1 = angleTo(segment.center, segment.to);
            const around = angleBetween(t0, t1, segment.clockwise);
            const tmid = t0 + around / 2;
            const mid = push(segment.center, tmid, dist(segment.center, prev));
            const coords = [prev, segment.to];
            for (let i = 0.5; i < 6; i++) {
                const tmid = t0 + (around / 6) * i;
                const mid = push(
                    segment.center,
                    tmid,
                    dist(segment.center, prev),
                );
                coords.push(mid);
            }
            return boundsForCoords(...coords);
        }
    }
};

export const findBoundingRect = (state: State) => {
    const clip = state.view.activeClip
        ? state.clips[state.view.activeClip]
        : undefined;

    let bounds: PendingBounds = newPendingBounds();
    // NOTE: This won't totally cover arcs, but that's just too bad folks.
    sortedVisibleInsetPaths(state.paths, state.pathGroups, clip).forEach(
        (path) => {
            addCoordToBounds(bounds, path.origin);
            // TODO: Get proper bounding box for arc segments.
            path.segments.forEach((t) => addCoordToBounds(bounds, t.to));
        },
    );
    if (bounds.x0 == null || bounds.y0 == null) {
        return null;
    }
    return { x1: bounds.x0!, y1: bounds.y0!, x2: bounds.x1!, y2: bounds.y1! };
};

export const Export = ({
    canvasRef,
    state,
    dispatch,
    originalSize,
}: {
    state: State;
    originalSize: number;
    canvasRef: { current: null | SVGSVGElement };
    dispatch: (action: Action) => void;
}) => {
    // const [name, setName] = React.useState()
    const name = `image-${Date.now()}.svg`;
    const [url, setUrl] = React.useState(null as null | string);
    const [animationPosition, setAnimationPosition] = React.useState(0);

    const [png, setPng] = React.useState(null as null | string);

    const [size, setSize] = React.useState(originalSize);
    const [embed, setEmbed] = React.useState(true);
    const [history, setHistory] = React.useState(false);

    const [crop, setCrop] = React.useState(10 as null | number);

    const boundingRect = React.useMemo(
        () => findBoundingRect(state),
        [state.paths, state.pathGroups, state.clips, state.view.activeClip],
    );

    return (
        <div
            css={{
                marginTop: 16,
            }}
        >
            <div
                css={{
                    padding: 4,
                    marginBottom: 16,
                }}
            >
                <div
                    css={{
                        fontSize: '80%',
                        fontWeight: 'bold',
                        marginBottom: 8,
                    }}
                >
                    Metadata
                </div>
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
            <div css={{ marginTop: 16, border: '1px solid #aaa', padding: 8 }}>
                Width (px):{' '}
                <input
                    type="number"
                    value={size}
                    onChange={(evt) => setSize(+evt.target.value)}
                />
                <button
                    css={{ marginTop: 16, display: 'block' }}
                    onClick={async () => {
                        const url = await exportPNG(
                            size,
                            state,
                            originalSize,
                            embed,
                            history,
                            animationPosition,
                        );
                        setPng(url);
                    }}
                >
                    Export PNG
                </button>
                {png ? (
                    <div
                        css={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <a
                            href={png}
                            download={name.replace('.svg', '.png')}
                            css={{
                                display: 'block',
                                color: 'white',
                                background: '#666',
                                borderRadius: 6,
                                marginBottom: 16,
                                padding: '4px 8px',
                                textDecoration: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            Download {name.replace('.svg', '.png')}
                        </a>
                        <div
                            style={{
                                backgroundImage: `url("${transparent}")`,
                                backgroundRepeat: 'repeat',
                                backgroundSize: 40,
                            }}
                        >
                            <img css={{ maxHeight: 400 }} src={png} />
                        </div>
                    </div>
                ) : null}
            </div>
            <div css={{ marginTop: 16, border: '1px solid #aaa', padding: 8 }}>
                <Toggle
                    label="Laser Cut Mode"
                    value={!!state.view.laserCutMode}
                    onChange={(laserCutMode) =>
                        dispatch({
                            type: 'view:update',
                            view: { ...state.view, laserCutMode },
                        })
                    }
                />
                pixels per inch:{' '}
                <BlurInt
                    value={state.meta.ppi}
                    onChange={(ppi) =>
                        ppi != null
                            ? dispatch({
                                  type: 'meta:update',
                                  meta: { ...state.meta, ppi },
                              })
                            : null
                    }
                    label={(ppi) => (
                        <div css={{ marginTop: 8 }}>
                            Width: {(originalSize / ppi).toFixed(2)}in.
                            <br />
                            Content Size:
                            {boundingRect
                                ? ` ${(
                                      ((boundingRect.x2 - boundingRect.x1) /
                                          ppi) *
                                      state.view.zoom
                                  ).toFixed(2)}in x ${(
                                      ((boundingRect.y2 - boundingRect.y1) /
                                          ppi) *
                                      state.view.zoom
                                  ).toFixed(2)}in`
                                : null}
                        </div>
                    )}
                />
                <br />
                Crop margin (in/100):
                <BlurInt
                    value={crop}
                    onChange={(crop) => setCrop(crop ?? null)}
                />
                <br />
                <button
                    css={{ marginTop: 16, display: 'block' }}
                    onClick={async () => {
                        let svgNode: SVGElement | null = null;
                        const dest = document.createElement('div');
                        const h =
                            crop && boundingRect
                                ? (boundingRect.y2 - boundingRect.y1) *
                                      state.view.zoom +
                                  (crop / 50) * state.meta.ppi
                                : originalSize;
                        const w =
                            crop && boundingRect
                                ? (boundingRect.x2 - boundingRect.x1) *
                                      state.view.zoom +
                                  (crop / 50) * state.meta.ppi
                                : originalSize;
                        ReactDOM.render(
                            <Canvas
                                // Clear out background in laser cut mode
                                state={
                                    state.view.laserCutMode
                                        ? {
                                              ...state,
                                              view: {
                                                  ...state.view,
                                                  background: undefined,
                                              },
                                          }
                                        : state
                                }
                                isTouchScreen={false}
                                width={w}
                                height={h}
                                innerRef={(node) => (svgNode = node)}
                                pendingMirror={null}
                                setPendingMirror={(_) => {}}
                                dispatch={(_) => {}}
                                hover={null}
                                setHover={(_) => {}}
                                ppi={state.meta.ppi}
                            />,
                            dest,
                        );
                        // let text = canvasRef.current!.outerHTML;
                        let text = svgNode!.outerHTML;
                        if (embed) {
                            text += `\n\n${PREFIX}${JSON.stringify(
                                history
                                    ? state
                                    : { ...state, history: initialHistory },
                            )}${SUFFIX}`;
                        }
                        const blob = new Blob([text], {
                            type: 'image/svg+xml',
                        });
                        setUrl(URL.createObjectURL(blob));
                    }}
                >
                    Export SVG
                </button>
                {url ? (
                    <button onClick={() => setUrl(null)}>Close</button>
                ) : null}
                {url ? (
                    <div
                        css={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
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
                        <div
                            style={{
                                backgroundImage: `url("${transparent}")`,
                                backgroundRepeat: 'repeat',
                                backgroundSize: 40,
                            }}
                        >
                            <img src={url} css={{ maxHeight: 400 }} />
                        </div>
                    </div>
                ) : null}
            </div>
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

async function exportPNG(
    size: number,
    state: State,
    originalSize: number,
    embed: boolean,
    history: boolean,
    animationPosition: number,
): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.save();
    await canvasRender(
        ctx,
        state,
        size,
        size,
        size / originalSize,
        animationPosition,
    );
    ctx.restore();

    if (state.view.texture) {
        const fns: {
            [key: string]: (scale: number, intensity: number) => string;
        } = { texture1: texture1, texture2: texture2 };
        const fn = fns[state.view.texture.id];
        if (fn) {
            const texture = document.createElement('canvas');
            texture.width = texture.height = size;

            const gl = texture.getContext('webgl2');
            if (!gl) {
                throw new Error(`unable to get webgl context`);
            }
            setup(
                gl,
                fn(
                    (state.view.texture.scale * size) / originalSize,
                    state.view.texture.intensity,
                ),
                0,
            );

            ctx.drawImage(texture, 0, 0);
        }
    }

    return new Promise((res, rej) =>
        canvas.toBlob(async (blob) => {
            if (!blob) {
                alert('Unable to export. Canvas error');
                return rej(new Error('Unable to export'));
            }
            if (embed) {
                blob = await addMetadata(
                    blob,
                    history ? state : { ...state, history: initialHistory },
                );
            }
            res(URL.createObjectURL(blob));
        }, 'image/png'),
    );
}

async function addMetadata(blob: Blob | null, state: State) {
    const buffer = await blob!.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    const meta = {
        tEXt: {
            Source: 'Geometric Art',
            // TODO: Add an option to scrub history, for smaller file size
            GeometricArt: JSON.stringify(state),
        },
    };

    const chunks = extractChunks(uint8Array);
    insertMetadata(chunks, meta);
    const newBuffer = new Uint8Array(encodeChunks(chunks));

    const newBlob = new Blob([newBuffer], {
        type: blob!.type,
    });
    return newBlob;
}
