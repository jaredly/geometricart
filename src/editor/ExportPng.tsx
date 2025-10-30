import {encodeChunks, extractChunks, insertMetadata} from 'png-metadata';
import React from 'react';
import {canvasRender, paletteImages} from '../rendering/CanvasRender';
import {transparent} from './Icons';
import {setup} from './RenderWebGL.setup.related';
import {initialHistory} from '../state/initialState';
import {texture1, texture2} from '../rendering/textures';
import {State, TextureConfig} from '../types';
import {cacheOverlays} from '../history/cacheOverlays';
import {exportPNG} from './ExportPng.exportPNG.related';

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

    const [size, setSize] = React.useState(3000);

    return (
        <div css={{marginTop: 16, border: '1px solid #aaa', padding: 8}}>
            Width (px):{' '}
            <input type="number" value={size} onChange={(evt) => setSize(+evt.target.value)} />
            <button
                css={{marginTop: 16, display: 'block'}}
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
                        <img css={{maxHeight: 400}} src={png} />
                    </div>
                </div>
            ) : null}
        </div>
    );
}



