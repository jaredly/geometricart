/* @jsx jsx */
import * as React from 'react';
import { jsx } from '@emotion/react';
import { State, Attachment, Coord } from '../types';
import { Action } from '../state/Action';
import {
    ExportPalettes,
    getPalettesFromFile,
    importPalettes,
    ImportPalettes,
} from './ExportPalettes';
import { useDropTarget } from './useDropTarget';
import { createPortal } from 'react-dom';
import { hslToRgb, rgbToHsl } from '../rendering/colorConvert';
import { SliderPicker, SketchPicker } from 'react-color';
// @ts-ignore
import kMeans from 'kmeans-js';

import { ColorPicker } from 'primereact/colorpicker';

export const averageAt = (data: ImageData, pos: Coord): Rgb => {
    const colors = [
        colorAt(data, pos),
        colorAt(data, { x: pos.x - 1, y: pos.y }),
        colorAt(data, { x: pos.x + 1, y: pos.y }),
        colorAt(data, { x: pos.x, y: pos.y - 1 }),
        colorAt(data, { x: pos.x, y: pos.y + 1 }),
    ];
    return {
        r: Math.round(colors.reduce((a, b) => a + b.r, 0) / colors.length),
        g: Math.round(colors.reduce((a, b) => a + b.g, 0) / colors.length),
        b: Math.round(colors.reduce((a, b) => a + b.b, 0) / colors.length),
    };
};

export const colorAt = (imageData: ImageData, { x, y }: Coord): Rgb => {
    x = Math.floor(x);
    y = Math.floor(y);
    return {
        r: imageData.data[y * (imageData.width * 4) + x * 4 + 0],
        g: imageData.data[y * (imageData.width * 4) + x * 4 + 1],
        b: imageData.data[y * (imageData.width * 4) + x * 4 + 2],
    };
    // color['alpha'] = imageData.data[((y*(imageData.width*4)) + (x*4)) + 3];
};

export const rgbToString = ({ r, g, b }: Rgb) => `rgb(${r},${g},${b})`;
export const toHex = (n: number) => n.toString(16).padStart(2, '0');
export const rgbToHex = ({ r, g, b }: Rgb) =>
    `#${toHex(r)}${toHex(g)}${toHex(b)}`;

export const ImageChooser = ({
    contents,
    onChoose,
}: {
    contents: string;
    onHover: (color: Rgb) => void;
    onChoose: (color: Rgb) => void;
}) => {
    const ref = React.useRef(null as null | HTMLCanvasElement);
    const data = React.useRef(null as null | ImageData);
    const [colors, setColors] = React.useState(
        null as null | Array<Array<number>>,
    );

    React.useEffect(() => {
        if (!ref.current) {
            return;
        }
        const ctx = ref.current.getContext('2d')!;
        const image = new Image();
        image.src = contents;
        image.onload = () => {
            ctx.canvas.height = 800;
            ctx.canvas.width =
                (image.naturalWidth / image.naturalHeight) * ctx.canvas.height;
            ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height);
            data.current = ctx.getImageData(
                0,
                0,
                ctx.canvas.width,
                ctx.canvas.height,
            );
            console.log('finding them thanks');
            // setColors(findMajorColorsExpensive(data.current));
        };
    }, [contents]);

    const [hover, setHover] = React.useState(
        null as null | { color: Rgb; pos: Coord },
    );

    return (
        <div css={{ position: 'relative' }}>
            <canvas
                ref={(node) => (ref.current = node)}
                onMouseMove={(evt) => {
                    if (!data.current) {
                        return;
                    }
                    const rect = evt.currentTarget.getBoundingClientRect();
                    const pos = {
                        x: evt.clientX - rect.left,
                        y: evt.clientY - rect.top,
                    };
                    setHover({ color: averageAt(data.current, pos), pos });
                }}
                onClick={(evt) => {
                    if (!data.current) {
                        return;
                    }
                    const rect = evt.currentTarget.getBoundingClientRect();
                    const pos = {
                        x: evt.clientX - rect.left,
                        y: evt.clientY - rect.top,
                    };
                    onChoose(averageAt(data.current, pos));
                }}
            />
            {colors ? (
                <div>
                    {/* {[0.2, 0.5, 0.7].map((lightness, i) => ( */}
                    <div
                        css={{ display: 'flex', flexDirection: 'row' }}
                        // key={i}
                    >
                        {colors.map(([h, s, l], i) => (
                            <div
                                onClick={() => {
                                    const [r, g, b] = hslToRgb(h, s, l);
                                    onChoose({
                                        r: Math.floor(r),
                                        g: Math.floor(g),
                                        b: Math.floor(b),
                                    });
                                }}
                                key={i}
                                style={{
                                    cursor: 'pointer',
                                    background: `hsl(${(h * 360).toFixed(
                                        2,
                                    )}, ${(s * 100).toFixed(1)}%, ${(
                                        l * 100
                                    ).toFixed(1)}%)`,
                                    width: 20,
                                    height: 20,
                                }}
                            />
                        ))}
                    </div>
                    {/* ))} */}
                </div>
            ) : null}
            <button
                onClick={() => {
                    setColors(findMajorColorsExpensive(data.current!));
                }}
            >
                Autodetect major colors
            </button>
            {hover ? (
                <div
                    style={{
                        left: hover.pos.x + 10,
                        top: hover.pos.y + 10,
                        backgroundColor: rgbToString(hover.color),
                    }}
                    css={{
                        position: 'absolute',
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        border: '1px solid red',
                    }}
                />
            ) : null}
        </div>
    );
};

export type Rgb = { r: number; g: number; b: number };
export const AttachmentsChooser = ({
    onChoose,
    attachments,
}: {
    onChoose: (color: Rgb | null) => void;
    attachments: { [key: string]: Attachment };
}) => {
    const portal = React.useMemo(() => {
        return document.createElement('div');
    }, []);
    React.useEffect(() => {
        document.body.append(portal);
        return () => {
            document.body.removeChild(portal);
        };
    }, [portal]);
    const [hover, setHover] = React.useState(null as null | Rgb);
    return createPortal(
        <div
            css={{
                position: 'fixed',
                background: 'rgba(0,0,0,0.7)',
                top: 0,
                bottom: 0,
                right: 0,
                left: 0,
                padding: '10vw',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            <div css={{ background: 'white', maxWidth: 800 }}>
                <button onClick={() => onChoose(null)}>Close</button>
                <div css={{ maxHeight: 900, overflow: 'auto' }}>
                    {Object.keys(attachments).map((key) => (
                        <div key={key}>
                            <ImageChooser
                                contents={attachments[key].contents}
                                onHover={setHover}
                                onChoose={onChoose}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        portal,
    );
};

export function PalettesForm({
    state,
    dispatch,
}: {
    state: State;
    dispatch: (action: Action) => unknown;
}) {
    const [dragging, callbacks] = useDropTarget((file) => {
        getPalettesFromFile(file, (data) => {
            console.log(data);
            importPalettes(state.palettes, data, dispatch);
        });
    });
    return (
        <div
            {...callbacks}
            style={{
                // overflow: 'auto',
                padding: 8,
                // display: 'flex',
                // flexDirection: 'column',
                // flex: 1,
                background: dragging ? 'rgba(255,255,255,0.1)' : '',
                transition: '.3s ease background',
            }}
        >
            {Object.keys(state.palettes).map((name) => (
                <PaletteForm
                    name={name}
                    state={state}
                    dispatch={dispatch}
                    key={name}
                />
            ))}
            <button
                css={{ margin: '14px 0' }}
                onClick={() => {
                    let num = Object.keys(state.palettes).length;
                    while (state.palettes[`palette${num}`]) {
                        num += 1;
                    }
                    let newName = `palette${num}`;
                    dispatch({
                        type: 'library:palette:update',
                        name: newName,
                        colors: ['red', 'green', 'blue'],
                    });
                }}
            >
                Add Palette
            </button>
            <input
                css={{ display: 'block' }}
                onPaste={(evt) => {
                    const data = evt.clipboardData.getData('text/plain');
                    let parts;
                    if (data.startsWith(`https://coolors.co/`)) {
                        parts = data
                            .split('/')
                            .slice(-1)[0]
                            .split('-')
                            .map((m) => `#` + m);
                    } else {
                        parts = data
                            .split(/[,-\s]/g)
                            .map((m) =>
                                m.trim().match(/^[0-9a-fA-F]{6}$/)
                                    ? '#' + m.trim()
                                    : m.trim(),
                            );
                    }
                    if (
                        !parts.every((value) =>
                            value.match(/^#[0-9a-fA-F]{3,6}$/),
                        )
                    ) {
                        console.log(`not hex`, parts);
                        return;
                    }
                    let num = Object.keys(state.palettes).length;
                    while (state.palettes[`palette${num}`]) {
                        num += 1;
                    }
                    let newName = `palette${num}`;
                    dispatch({
                        type: 'library:palette:update',
                        name: newName,
                        colors: parts,
                    });
                }}
                value=""
                onChange={() => {}}
                placeholder="Paste comma-separated colors"
            />
            <ExportPalettes palettes={state.palettes} />
            <ImportPalettes dispatch={dispatch} palettes={state.palettes} />
        </div>
    );
}

function PaletteForm({
    name,
    state,
    dispatch,
}: {
    name: string;
    state: State;
    dispatch: (action: Action) => unknown;
}): jsx.JSX.Element {
    const [editing, setEditing] = React.useState(false);
    const [choosing, setChoosing] = React.useState(
        null as null | [string, number],
    );
    return (
        <div
            style={{
                border:
                    state.activePalette === name
                        ? `1px solid white`
                        : `1px solid transparent`,
            }}
            onClick={() => dispatch({ type: 'library:palette:select', name })}
        >
            {name}
            <div
                css={{
                    display: 'flex',
                    flexDirection: editing ? 'column' : 'row',
                    alignItems: 'flex-start',
                }}
            >
                {state.palettes[name].map((color, i) =>
                    editing ? (
                        <ColorEditor
                            color={color}
                            key={i}
                            onChange={(color) => {
                                const palette = state.palettes[name].slice();
                                palette[i] = color;
                                dispatch({
                                    type: 'library:palette:update',
                                    name,
                                    colors: palette,
                                });
                            }}
                            onChoose={() => setChoosing([name, i])}
                        />
                    ) : (
                        <div
                            key={i}
                            style={{
                                background: color.startsWith('http')
                                    ? `url("${color}")`
                                    : color,
                                backgroundSize: '20px 20px',
                                width: 20,
                                height: 20,
                            }}
                        />
                    ),
                )}
                {editing ? (
                    <ColorEditor
                        color={''}
                        onChange={(color) => {
                            const palette = state.palettes[name].slice();
                            palette.push(color);
                            dispatch({
                                type: 'library:palette:update',
                                name,
                                colors: palette,
                            });
                        }}
                        onChoose={() =>
                            setChoosing([name, state.palettes[name].length])
                        }
                    />
                ) : null}
                <div style={{ flexBasis: 16 }} />
                <button
                    onClick={() => {
                        setEditing(!editing);
                    }}
                >
                    {editing ? 'Done' : 'Edit'}
                </button>
                <button
                    onClick={() => {
                        let num = Object.keys(state.palettes).length;
                        while (state.palettes[`palette${num}`]) {
                            num += 1;
                        }
                        let newName = `palette${num}`;
                        dispatch({
                            type: 'library:palette:update',
                            name: newName,
                            colors: state.palettes[name],
                        });
                    }}
                >
                    Duplicate
                </button>
            </div>
            {choosing ? (
                <AttachmentsChooser
                    attachments={state.attachments}
                    onChoose={(color) => {
                        setChoosing(null);
                        if (!color) {
                            return;
                        }
                        const [name, i] = choosing!;
                        const colors = state.palettes[name].slice();
                        colors[i] = rgbToHex(color);
                        dispatch({
                            type: 'library:palette:update',
                            name,
                            colors,
                        });
                    }}
                />
            ) : null}
        </div>
    );
}

export const ColorEditor = ({
    color,
    onChange,
    onChoose,
}: {
    color: string;
    onChange: (color: string) => void;
    onChoose: () => void;
}) => {
    const [text, setText] = React.useState(null as null | string);
    const [visual, showVisual] = React.useState(false);
    return (
        <div css={{ display: 'flex', position: 'relative' }}>
            <div
                style={{
                    background: (text ?? color).startsWith('http')
                        ? `url("${text ?? color}")`
                        : text ?? color,
                    backgroundSize: '20px 20px',
                    // backgroundColor: text ?? color,
                    width: 20,
                    height: 20,
                    marginRight: 16,
                }}
            ></div>
            <input
                value={text ?? color}
                onChange={(evt) => setText(evt.target.value)}
                onKeyDown={(evt) => {
                    if (evt.key === 'Escape') {
                        setText(null);
                        setTimeout(() => {
                            (evt.target as HTMLInputElement).blur();
                        }, 10);
                    }
                }}
                onBlur={() => {
                    if (text) {
                        onChange(text);
                        setText(null);
                    }
                }}
            />
            <button onClick={() => onChoose()}>Choose from attachments</button>
            <button
                onClick={() => {
                    showVisual(!visual);
                }}
            >
                Visual picker
            </button>
            {visual ? (
                <div
                    css={{
                        position: 'absolute',
                        zIndex: 10,
                        top: '100%',
                        width: 200,
                    }}
                >
                    <SketchPicker
                        color={text ?? color}
                        onChange={(change) => {
                            onChange(change.hex);
                        }}
                    />
                    {/* <ColorPicker
                        inline
                        color={text?.slice(1) ?? color.slice(1)}
                        onChange={(e) => onChange('#' + e.value)}
                    /> */}
                </div>
            ) : null}
        </div>
    );
};

export const findMajorColorsExpensive = (
    data: ImageData,
    bins: number = 50,
    top: number = 10,
) => {
    const points = [];
    // // h, s, l
    // // l = 3 bins; 0.3, 0.6
    // // s = 2 bins 0.5, 1.0
    // // const bins = 50;
    // const hueBins = new Array(bins).fill(0);
    for (let x = 0; x < data.width; x++) {
        for (let y = 0; y < data.height; y++) {
            const color = colorAt(data, { x, y });
            const [h, s, l] = rgbToHsl(color.r, color.g, color.b);
            points.push([h, s, l]);
            // // outside of range
            // // if (s < 0.5 || l > 0.9 || l < 0.2) {
            // //     continue;
            // // }
            // const hue = Math.floor(h * bins);
            // hueBins[hue]++;
        }
    }

    const km = new kMeans({ K: 8 });

    km.cluster(points);
    while (km.step()) {
        km.findClosestCentroids();
        km.moveCentroids();

        // console.log(km.centroids);

        if (km.hasConverged()) break;
    }

    return km.centroids; //.map((item) => item[0] * 360);

    // const sorted = hueBins
    //     .map((count, i) => ({ i, count }))
    //     .sort((a, b) => b.count - a.count)
    //     .slice(0, top)
    //     .sort((a, b) => a.i - b.i);
    // return sorted.map((item) => (item.i / bins) * 360);
};

export const findMajorColors = (
    data: ImageData,
    bins: number = 50,
    top: number = 10,
) => {
    // // h, s, l
    // // l = 3 bins; 0.3, 0.6
    // // s = 2 bins 0.5, 1.0
    // // const bins = 50;
    const hueBins = new Array(bins).fill(0);
    for (let x = 0; x < data.width; x++) {
        for (let y = 0; y < data.height; y++) {
            const color = colorAt(data, { x, y });
            const [h, s, l] = rgbToHsl(color.r, color.g, color.b);
            // // outside of range
            // // if (s < 0.5 || l > 0.9 || l < 0.2) {
            // //     continue;
            // // }
            const hue = Math.floor(h * bins);
            hueBins[hue]++;
        }
    }
    const sorted = hueBins
        .map((count, i) => ({ i, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, top)
        .sort((a, b) => a.i - b.i);
    return sorted.map((item) => [(item.i / bins) * 360, 0.8, 0.3]);
};
