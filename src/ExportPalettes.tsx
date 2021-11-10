/* @jsx jsx */
import { jsx } from '@emotion/react';
import React from 'react';
import { Action } from './types';

export const generatePaletteSvg = (palettes: {
    [key: string]: Array<string>;
}) => {
    const size = 20;
    const padding = 10;
    const xmargin = 0;
    const ymargin = 5;
    const maxSize = Object.keys(palettes).reduce(
        (m, k) => Math.max(m, palettes[k].length),
        0,
    );
    const width = maxSize * (size + xmargin) + padding * 2 - xmargin;
    const height =
        Object.keys(palettes).length * (size + ymargin) + padding * 2 - ymargin;

    return `<svg
                width="${width}"
                height="${height}"
                xmlns="http://www.w3.org/2000/svg"
            >
			${Object.keys(palettes)
                .map((k, i) => {
                    let y = i * (size + ymargin) + padding;
                    return palettes[k]
                        .map((color, j) => {
                            const x = j * (size + xmargin) + padding;
                            return `<rect x="${x}" y="${y}" width="${size}" height="${size}"
						fill="${color}"
					/>
					`;
                        })
                        .join('\n');
                })
                .join('\n')}
			</svg>\n\n<!-- PALETTES: ${JSON.stringify(palettes)} -->`;
};

export const ImportPalettes = ({
    dispatch,
    palettes,
}: {
    dispatch: (action: Action) => void;
    palettes: { [key: string]: Array<string> };
}) => {
    return (
        <div>
            Import palettes:
            <input
                type="file"
                placeholder="Import palettes"
                value={''}
                onChange={(evt) => {
                    const file = evt.target.files![0];
                    if (!file) {
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                        const text = reader.result as string;
                        if (typeof text !== 'string') {
                            return;
                        }
                        const last = text.trim().split('\n').slice(-1)[0];
                        if (
                            !last.startsWith(`<!-- PALETTES:`) ||
                            !last.endsWith(`-->`)
                        ) {
                            return;
                        }
                        const data = JSON.parse(
                            last.slice(`<!-- PALETTES:`.length, -'-->'.length),
                        );
                        console.log(data);
                        const have = Object.keys(palettes).map((k) =>
                            palettes[k].join(';;'),
                        );
                        Object.keys(data).forEach((name) => {
                            if (have.includes(data[name].join(';;'))) {
                                // already have it
                                return;
                            }
                            if (palettes[name]) {
                                let num = 1;
                                while (palettes[`${name}${num}`]) {
                                    num += 1;
                                }
                                name = name + num;
                            }
                            dispatch({
                                type: 'palette:update',
                                name,
                                colors: data[name],
                            });
                        });
                    };
                    reader.readAsText(file);
                    console.log(evt.target.files![0]);
                }}
            />
        </div>
    );
};

export const ExportPalettes = ({
    palettes,
}: {
    palettes: { [key: string]: Array<string> };
}) => {
    const [url, setUrl] = React.useState(null as null | string);
    React.useEffect(() => {
        const blob = new Blob([generatePaletteSvg(palettes)], {
            type: 'image/svg+xml',
        });
        const url = URL.createObjectURL(blob);
        setUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [palettes]);

    // let's export as an SVG, that would be veryy nice.
    const name = `palettes-${Date.now()}.svg`;

    if (url) {
        return (
            <a
                download={name}
                href={url}
                css={{
                    margin: 8,
                    display: 'block',
                    color: 'white',
                    cursor: 'pointer',
                }}
            >
                Export palettes
            </a>
        );
    }
    return null;
};
