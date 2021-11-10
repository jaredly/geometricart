/* @jsx jsx */
import { jsx } from '@emotion/react';
import React from 'react';
import { State } from './types';
import { PREFIX, SUFFIX } from './Sidebar';
import { extractChunks, insertMetadata, encodeChunks } from 'png-metadata';

export const Export = ({
    canvasRef,
    state,
}: {
    state: State;
    canvasRef: { current: null | SVGSVGElement };
}) => {
    // const [name, setName] = React.useState()
    const name = `image-${Date.now()}.svg`;
    const [url, setUrl] = React.useState(null as null | string);

    const [png, setPng] = React.useState(null as null | string);

    const [size, setSize] = React.useState(400);

    return (
        <div
            css={{
                marginTop: 16,
            }}
        >
            <div>
                <button
                    css={{ marginRight: 16 }}
                    onClick={() => {
                        const text =
                            canvasRef.current!.outerHTML +
                            `\n\n${PREFIX}${JSON.stringify(state)}${SUFFIX}`;
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
            </div>
            {url ? (
                <div
                    css={{
                        display: 'flex',
                        flexDirection: 'row',
                    }}
                >
                    <div>
                        <div>
                            <a
                                href={url}
                                download={name}
                                css={{
                                    color: 'white',
                                    background: '#666',
                                    borderRadius: 6,
                                    padding: '4px 8px',
                                    textDecoration: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                Download {name}
                            </a>
                            <button onClick={() => setUrl(null)}>Close</button>
                        </div>
                        <img
                            src={url}
                            css={{ maxHeight: 400 }}
                            onLoad={(evt) => {
                                console.log('LAODED');
                                const canvas = document.createElement('canvas');
                                canvas.width = canvas.height = size;
                                const ctx = canvas.getContext('2d')!;
                                ctx.drawImage(
                                    evt.target as HTMLImageElement,
                                    0,
                                    0,
                                    size,
                                    size,
                                );
                                canvas.toBlob(async (blob) => {
                                    const buffer = await blob!.arrayBuffer();
                                    const uint8Array = new Uint8Array(buffer);
                                    const meta = {
                                        tEXt: {
                                            Title: 'My title',
                                            Author: 'Geometric Art',
                                            Description: 'An art',
                                            Source: 'this stuff',
                                            Random: JSON.stringify({
                                                name: 'hello',
                                                ages: [1, 2, 3, 4],
                                            }),
                                        },
                                    };

                                    const chunks = extractChunks(uint8Array);
                                    insertMetadata(chunks, meta);
                                    console.log(chunks);
                                    const newBuffer = new Uint8Array(
                                        encodeChunks(chunks),
                                    );

                                    // const newBuffer = writeMetadata(
                                    //     uint8Array,
                                    //     meta,
                                    // );
                                    const newBlob = new Blob([newBuffer], {
                                        type: blob!.type,
                                    });
                                    // console.log('ok');
                                    // blob = await writeMetadataB(blob, );
                                    // console.log('got it');
                                    // console.log(blob, newb);
                                    setPng(URL.createObjectURL(newBlob));
                                }, 'image/png');
                            }}
                        />
                    </div>
                    <div>{png ? <img src={png} /> : null}</div>
                </div>
            ) : null}
        </div>
    );
};
