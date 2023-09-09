/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import { encodeChunks, extractChunks, insertMetadata } from 'png-metadata';
import React from 'react';
import { canvasRender } from '../rendering/CanvasRender';
import { transparent } from './Icons';
import { setup } from './RenderWebGL';
import { initialHistory } from '../state/initialState';
import { texture1, texture2 } from '../rendering/textures';
import { State, TextureConfig } from '../types';

export function ExportPng({
    state,
    originalSize,
    embed,
    history,
    animationPosition,
    name,
}: {
    state: State;
    originalSize: number;
    embed: boolean;
    history: boolean;
    animationPosition: number;
    name: string;
}) {
    const [png, setPng] = React.useState(null as null | string);

    const [size, setSize] = React.useState(originalSize);

    return (
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
                    <button onClick={() => setPng(null)}>Close</button>
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
    );
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
