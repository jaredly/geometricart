/* @jsx jsx */
import * as React from 'react';
import { jsx } from '@emotion/react';
import { State, Action, Attachment, Coord } from './types';
import {
    ExportPalettes,
    getPalettesFromFile,
    importPalettes,
    ImportPalettes,
} from './ExportPalettes';
import { useDropTarget } from './useDropTarget';
import { createPortal } from 'react-dom';

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

    React.useEffect(() => {
        if (!ref.current) {
            return;
        }
        const ctx = ref.current.getContext('2d')!;
        const image = new Image();
        image.src = contents;
        image.onload = () => {
            ctx.canvas.width = 800;
            ctx.canvas.height =
                (image.naturalHeight / image.naturalWidth) * ctx.canvas.width;
            ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height);
            data.current = ctx.getImageData(
                0,
                0,
                ctx.canvas.width,
                ctx.canvas.height,
            );
        };
    }, [contents, ref.current]);

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
                    setHover({ color: colorAt(data.current, pos), pos });
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
                    onChoose(colorAt(data.current, pos));
                }}
            />
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
                Hello folks
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
                        type: 'palette:update',
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
                            .slice(`https://coolors.co/`.length)
                            .split('-')
                            .map((m) => `#` + m);
                    } else {
                        parts = data
                            .split(',')
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
                        type: 'palette:update',
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
            onClick={() => dispatch({ type: 'palette:select', name })}
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
                                    type: 'palette:update',
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
                                type: 'palette:update',
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
                            type: 'palette:update',
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
                            type: 'palette:update',
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
    return (
        <div css={{ display: 'flex' }}>
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
        </div>
    );
};
