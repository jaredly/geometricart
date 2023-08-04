/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import { encodeChunks, extractChunks, insertMetadata } from 'png-metadata';
import React, { useState } from 'react';
import * as ReactDOM from 'react-dom';
import { Canvas } from './Canvas';
import { canvasRender } from '../rendering/CanvasRender';
import { BlurInt, Text, Toggle } from './Forms';
import { transparent } from './Icons';
import { angleBetween } from '../rendering/findNextSegments';
import { setup } from './RenderWebGL';
import { PREFIX, SUFFIX } from './Sidebar';
import { sortedVisibleInsetPaths } from '../rendering/sortedVisibleInsetPaths';
import { Action } from '../state/Action';
import { initialHistory } from '../state/initialState';
import { texture1, texture2 } from '../rendering/textures';
import { State, TextureConfig } from '../types';
import { closeEnough } from '../rendering/clipPath';
import { PendingBounds, newPendingBounds, addCoordToBounds } from './Bounds';
import { MultiColor } from './MultiStyleForm';
import { UIState } from '../useUIState';

export type Bounds = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
};

export const findBoundingRect = (state: State): Bounds | null => {
    const clip = state.view.activeClip
        ? state.clips[state.view.activeClip]
        : undefined;

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
    const [url, setUrl] = React.useState(null as null | string);
    const [animationPosition, setAnimationPosition] = React.useState(0);

    const [multi, setMulti] = useState(
        null as null | {
            outline: number | string;
            shape: number | string;
        },
    );

    const [png, setPng] = React.useState(null as null | string);

    const [size, setSize] = React.useState(originalSize);
    const [embed, setEmbed] = React.useState(true);
    const [history, setHistory] = React.useState(false);
    const name = `image-${Date.now()}${history ? '-history' : ''}.svg`;

    const [crop, setCrop] = React.useState(10 as null | number);

    const boundingRect = React.useMemo(
        () => findBoundingRect(state),
        [state.paths, state.pathGroups, state.clips, state.view.activeClip],
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
                        const blob = await exportPNG(
                            size,
                            state,
                            originalSize,
                            embed,
                            history,
                            animationPosition,
                        );
                        setPng(URL.createObjectURL(blob));
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
                {multi ? (
                    <div
                        css={{
                            border: '1px solid #aaa',
                            padding: 8,
                            marginTop: 8,
                        }}
                    >
                        Multi SVG Settings
                        <div css={{ marginTop: 8 }}>
                            Outline Color:
                            <MultiColor
                                palette={state.palette}
                                color={[multi.outline]}
                                onHover={() => {}}
                                onChange={(color) => {
                                    setMulti((m) =>
                                        m ? { ...m, outline: color } : m,
                                    );
                                }}
                            />
                        </div>
                        <div css={{ marginTop: 8 }}>
                            Shape line Color:
                            <MultiColor
                                palette={state.palette}
                                color={[multi.shape]}
                                onHover={() => {}}
                                onChange={(color) => {
                                    setMulti((m) =>
                                        m ? { ...m, shape: color } : m,
                                    );
                                }}
                            />
                        </div>
                        <button
                            css={{ marginTop: 16, display: 'block' }}
                            onClick={() => setMulti(null)}
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <button
                        css={{ marginTop: 16, display: 'block' }}
                        onClick={() => setMulti({ outline: 0, shape: 1 })}
                    >
                        Multi SVG
                    </button>
                )}
                <br />
                <button
                    css={{ marginTop: 16, display: 'block' }}
                    onClick={() =>
                        runSVGExport({
                            crop,
                            boundingRect,
                            state,
                            originalSize,
                            embed,
                            history,
                            setUrl,
                            multi,
                        })
                    }
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

const blankUIState: UIState = {
    hover: null,
    pendingDuplication: null,
    pendingMirror: null,
    previewActions: [],
    screen: 'edit',
    styleHover: null,
};

const blankCanvasProps = {
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

async function runSVGExport({
    crop,
    boundingRect,
    state,
    originalSize,
    embed,
    history,
    setUrl,
    multi,
}: {
    crop: number | null;
    boundingRect: Bounds | null;
    state: State;
    originalSize: number;
    embed: boolean;
    history: boolean;
    setUrl: React.Dispatch<React.SetStateAction<string | null>>;
    multi: null | { outline: number | string; shape: number | string };
}) {
    let svgNode: SVGElement | null = null;
    const dest = document.createElement('div');
    const size = calcSVGSize(crop, boundingRect, state, originalSize);

    ReactDOM.render(
        <Canvas
            {...blankCanvasProps}
            {...size}
            innerRef={(node) => (svgNode = node)}
            ppi={state.meta.ppi}
            state={
                state.view.laserCutMode
                    ? {
                          ...state,
                          view: { ...state.view, background: undefined },
                      }
                    : state
            }
        />,
        dest,
    );

    let text = svgNode!.outerHTML;
    if (embed) {
        text += `\n\n${PREFIX}${JSON.stringify(
            history ? state : { ...state, history: initialHistory },
        )}${SUFFIX}`;
    }
    const blob = new Blob([text], { type: 'image/svg+xml' });
    setUrl(URL.createObjectURL(blob));
}

function calcSVGSize(
    crop: number | null,
    boundingRect: Bounds | null,
    state: State,
    originalSize: number,
) {
    const h =
        crop && boundingRect
            ? (boundingRect.y2 - boundingRect.y1) * state.view.zoom +
              (crop / 50) * state.meta.ppi
            : originalSize;
    const w =
        crop && boundingRect
            ? (boundingRect.x2 - boundingRect.x1) * state.view.zoom +
              (crop / 50) * state.meta.ppi
            : originalSize;
    const size = { width: w, height: h };
    return size;
}

export async function exportPNG(
    size: number,
    state: State,
    originalSize: number,
    embed: boolean,
    history: boolean,
    animationPosition: number,
): Promise<Blob> {
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
        {},
        animationPosition,
    );
    ctx.restore();

    if (state.view.texture) {
        renderTexture(state.view.texture, size, originalSize, ctx);
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
            res(blob);
        }, 'image/png'),
    );
}

export function renderTexture(
    textureConfig: TextureConfig,
    size: number,
    originalSize: number,
    ctx: CanvasRenderingContext2D,
) {
    const fns: {
        [key: string]: (scale: number, intensity: number) => string;
    } = { texture1: texture1, texture2: texture2 };
    const fn = fns[textureConfig.id];
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
                (textureConfig.scale * size) / originalSize,
                textureConfig.intensity,
            ),
            0,
        );

        ctx.drawImage(texture, 0, 0);
    }
}

export async function addMetadata(
    blob: Blob | null,
    state: State,
    gcode?: string,
) {
    const buffer = await blob!.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    const raw = JSON.stringify(state).replaceAll(/[^\u0000-\u007f]/g, '*');
    const meta: any = {
        tEXt: {
            Source: 'Geometric Art',
            // TODO: Add an option to scrub history, for smaller file size
            GeometricArt: raw,
        },
    };
    if (gcode) {
        meta.tEXt.GCode = gcode;
    }

    const chunks = extractChunks(uint8Array);
    try {
        insertMetadata(chunks, meta);
    } catch (err) {
        alert('Unable to add metadata: ' + (err as Error).message);
    }
    const newBuffer = new Uint8Array(encodeChunks(chunks));

    const newBlob = new Blob([newBuffer], {
        type: blob!.type,
    });
    return newBlob;
}
