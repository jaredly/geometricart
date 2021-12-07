/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { Action, State } from './types';
import { PREFIX, SUFFIX } from './Sidebar';
import {
    extractChunks,
    insertMetadata,
    encodeChunks,
    readMetadata,
} from 'png-metadata';
import { Toggle, Text } from './Forms';
import { transparent } from './Icons';
import { canvasRender } from './CanvasRender';
import { RenderWebGL, setup } from './RenderWebGL';
import { texture1, texture2 } from './textures';
import { initialHistory } from './initialState';

export const Export = ({
    canvasRef,
    state,
    dispatch,
}: {
    state: State;
    canvasRef: { current: null | SVGSVGElement };
    dispatch: (action: Action) => void;
}) => {
    // const [name, setName] = React.useState()
    const name = `image-${Date.now()}.svg`;
    const [url, setUrl] = React.useState(null as null | string);

    const [png, setPng] = React.useState(null as null | string);

    const [render, setRender] = React.useState(false);

    const [size, setSize] = React.useState(1000);
    const [embed, setEmbed] = React.useState(true);
    const [history, setHistory] = React.useState(false);

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
                <button
                    css={{ marginRight: 16 }}
                    onClick={async () => {
                        // let text = canvasRef.current!.outerHTML;
                        // if (embed) {
                        //     text += `\n\n${PREFIX}${JSON.stringify(
                        //         state,
                        //     )}${SUFFIX}`;
                        // }
                        // const blob = new Blob([text], {
                        //     type: 'image/svg+xml',
                        // });
                        // setUrl(URL.createObjectURL(blob));

                        const canvas = document.createElement('canvas');
                        canvas.width = canvas.height = size;
                        const ctx = canvas.getContext('2d')!;

                        ctx.save();
                        await canvasRender(ctx, state);
                        ctx.restore();

                        if (state.view.texture) {
                            const fns: {
                                [key: string]: (
                                    scale: number,
                                    intensity: number,
                                ) => string;
                            } = { texture1: texture1, texture2: texture2 };
                            const fn = fns[state.view.texture.id];
                            if (fn) {
                                const texture =
                                    document.createElement('canvas');
                                texture.width = texture.height = size;

                                const gl = texture.getContext('webgl2');
                                if (!gl) {
                                    throw new Error(
                                        `unable to get webgl context`,
                                    );
                                }
                                setup(
                                    gl,
                                    fn(
                                        state.view.texture.scale,
                                        state.view.texture.intensity,
                                    ),
                                    0,
                                );

                                ctx.drawImage(texture, 0, 0);
                            }
                        }

                        canvas.toBlob(async (blob) => {
                            if (embed) {
                                blob = await addMetadata(
                                    blob,
                                    history
                                        ? state
                                        : { ...state, history: initialHistory },
                                );
                            }
                            setPng(URL.createObjectURL(blob));
                        }, 'image/png');
                    }}
                >
                    Export PNG
                </button>
                <button
                    css={{ marginRight: 16 }}
                    onClick={async () => {
                        let text = canvasRef.current!.outerHTML;
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
                Size (for .png):{' '}
                <input
                    type="number"
                    value={size}
                    onChange={(evt) => setSize(+evt.target.value)}
                />
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
