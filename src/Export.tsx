/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import * as ReactDOM from 'react-dom';
import React from 'react';
import { Action, Coord, State } from './types';
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

export const findBoundingRect = (state: State) => {
    const clip = state.view.activeClip
        ? state.clips[state.view.activeClip]
        : undefined;

    let bounds: {
        x1: null | number;
        x2: null | number;
        y1: null | number;
        y2: null | number;
    } = { x1: null, y1: null, x2: null, y2: null };
    let addCoord = (c: Coord) => {
        bounds.x1 = bounds.x1 == null ? c.x : Math.min(c.x, bounds.x1);
        bounds.x2 = bounds.x2 == null ? c.x : Math.max(c.x, bounds.x2);
        bounds.y1 = bounds.y1 == null ? c.y : Math.min(c.y, bounds.y1);
        bounds.y2 = bounds.y2 == null ? c.y : Math.max(c.y, bounds.y2);
    };
    // NOTE: This won't totally cover arcs, but that's just too bad folks.
    sortedVisibleInsetPaths(state.paths, state.pathGroups, clip).forEach(
        (path) => {
            addCoord(path.origin);
            // TODO: Get proper bounding box for arc segments.
            path.segments.forEach((t) => addCoord(t.to));
        },
    );
    if (!bounds.x1 || !bounds.y1) {
        return null;
    }
    return { x1: bounds.x1!, y1: bounds.y1!, x2: bounds.x2!, y2: bounds.y2! };
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

    const [png, setPng] = React.useState(null as null | string);

    const [render, setRender] = React.useState(false);

    const [size, setSize] = React.useState(originalSize);
    const [embed, setEmbed] = React.useState(true);
    const [history, setHistory] = React.useState(false);

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
            <div css={{ marginTop: 16 }}>
                Width (px):{' '}
                <input
                    type="number"
                    value={size}
                    onChange={(evt) => setSize(+evt.target.value)}
                />
                <button
                    css={{ marginRight: 16 }}
                    onClick={async () => {
                        const url = await exportPNG(
                            size,
                            state,
                            originalSize,
                            embed,
                            history,
                        );
                        setPng(url);
                    }}
                >
                    Export PNG
                </button>
            </div>
            <div css={{ marginTop: 16 }}>
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
                        <span css={{ marginLeft: 8, marginRight: 8 }}>
                            Width: {(originalSize / ppi).toFixed(2)}in. Content
                            Size:
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
                        </span>
                    )}
                />
                <button
                    css={{ marginRight: 16 }}
                    onClick={async () => {
                        // I need to do e.g. `width=1in, height=1in viewbox="0 0 1000 1000"`
                        // Use the zoom, and the ... "final size" ...
                        // But really, I should ditch the "just hijack the current svg"
                        // because it's buggy.
                        // Or at the very least, render a new svg in an invisible node.
                        // That's probably good.
                        // And there can be a mode for "real-world size units", dontcha know.
                        let svgNode: SVGElement | null = null;
                        const dest = document.createElement('div');
                        ReactDOM.render(
                            <Canvas
                                state={state}
                                dragSelect={false}
                                cancelDragSelect={() => {}}
                                isTouchScreen={false}
                                width={originalSize}
                                height={originalSize}
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
                {/* <button
                    onClick={() => {
                        setRender(!render);
                    }}
                >
                    {render ? `Clear render` : `Render`}
                </button> */}
                {url ? (
                    <button onClick={() => setUrl(null)}>Close</button>
                ) : null}
            </div>
            <div
                css={{
                    display: 'flex',
                    flexDirection: 'row',
                }}
            >
                {url ? (
                    <div css={{ marginRight: 16 }}>
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
                <div>
                    {png ? (
                        <>
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
                        </>
                    ) : null}
                </div>
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
): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.save();
    await canvasRender(ctx, state, size, size, size / originalSize);
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
