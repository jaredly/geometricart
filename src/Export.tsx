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

    const [size, setSize] = React.useState(1000);
    const [embed, setEmbed] = React.useState(true);

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
                    onClick={() => {
                        let text = canvasRef.current!.outerHTML;
                        if (embed) {
                            text += `\n\n${PREFIX}${JSON.stringify(
                                state,
                            )}${SUFFIX}`;
                        }
                        const blob = new Blob([text], {
                            type: 'image/svg+xml',
                        });
                        setUrl(URL.createObjectURL(blob));
                    }}
                >
                    Export
                </button>
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
                {url ? (
                    <button onClick={() => setUrl(null)}>Close</button>
                ) : null}
            </div>
            {url ? (
                <div
                    css={{
                        display: 'flex',
                        flexDirection: 'row',
                    }}
                >
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
                            <img
                                src={url}
                                css={{ maxHeight: 400 }}
                                onLoad={async (evt) => {
                                    const canvas =
                                        document.createElement('canvas');
                                    canvas.width = canvas.height = size;
                                    const ctx = canvas.getContext('2d')!;

                                    await canvasRender(ctx, state);
                                    // ctx.drawImage(
                                    //     evt.target as HTMLImageElement,
                                    //     0,
                                    //     0,
                                    //     size,
                                    //     size,
                                    // );
                                    canvas.toBlob(async (blob) => {
                                        if (embed) {
                                            blob = await addMetadata(
                                                blob,
                                                state,
                                            );
                                        }
                                        setPng(URL.createObjectURL(blob));
                                    }, 'image/png');
                                }}
                            />
                        </div>
                    </div>
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
                </div>
            ) : null}
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
