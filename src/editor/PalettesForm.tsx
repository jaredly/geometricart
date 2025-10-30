/* @jsx jsx */
import * as React from 'react';
import {jsx} from '@emotion/react';
import {State, Coord} from '../types';
import {Action} from '../state/Action';
import {ExportPalettes, ImportPalettes} from './ExportPalettes';
import {getPalettesFromFile} from './getPalettesFromFile';
import {importPalettes} from './importPalettes';
import {useDropTarget} from './useDropTarget';
import {rgbToHsl} from '../rendering/colorConvert';
import rc from 'react-color';
const {SliderPicker, SketchPicker} = rc;
// @ts-ignore
import kMeans from 'kmeans-js';

import {AttachmentsChooser} from './Rgb';
import {Rgb} from './Rgb.2';
import {colorAt} from './PalettesForm.averageAt.related';



const toHex = (n: number) => n.toString(16).padStart(2, '0');
const rgbToHex = ({r, g, b}: Rgb) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

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
                <PaletteForm name={name} state={state} dispatch={dispatch} key={name} />
            ))}
            <button
                css={{margin: '14px 0'}}
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
                css={{display: 'block'}}
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
                                m.trim().match(/^[0-9a-fA-F]{6}$/) ? '#' + m.trim() : m.trim(),
                            );
                    }
                    if (!parts.every((value) => value.match(/^#[0-9a-fA-F]{3,6}$/))) {
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
    const [choosing, setChoosing] = React.useState(null as null | [string, number]);
    return (
        <div
            style={{
                border: `1px solid transparent`,
            }}
        >
            {name}
            <button
                onClick={() => {
                    dispatch({
                        type: 'palette:update',
                        colors: state.palettes[name],
                    });
                }}
            >
                Use
            </button>
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
                                background: color.startsWith('http') ? `url("${color}")` : color,
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
                        onChoose={() => setChoosing([name, state.palettes[name].length])}
                    />
                ) : null}
                <div style={{flexBasis: 16}} />
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

const ColorEditor = ({
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
        <div css={{display: 'flex', position: 'relative'}}>
            <div
                style={{
                    background: (text ?? color).startsWith('http')
                        ? `url("${text ?? color}")`
                        : (text ?? color),
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


const findMajorColors = (data: ImageData, bins: number = 50, top: number = 10) => {
    // // h, s, l
    // // l = 3 bins; 0.3, 0.6
    // // s = 2 bins 0.5, 1.0
    // // const bins = 50;
    const hueBins = new Array(bins).fill(0);
    for (let x = 0; x < data.width; x++) {
        for (let y = 0; y < data.height; y++) {
            const color = colorAt(data, {x, y});
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
        .map((count, i) => ({i, count}))
        .sort((a, b) => b.count - a.count)
        .slice(0, top)
        .sort((a, b) => a.i - b.i);
    return sorted.map((item) => [(item.i / bins) * 360, 0.8, 0.3]);
};
