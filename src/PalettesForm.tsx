/* @jsx jsx */
import * as React from 'react';
import { jsx } from '@emotion/react';
import { State, Action } from './types';
import { ExportPalettes, ImportPalettes } from './ExportPalettes';

export function PalettesForm({
    state,
    dispatch,
}: {
    state: State;
    dispatch: (action: Action) => unknown;
}) {
    return (
        <div>
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
                    const parts = data
                        .split(',')
                        .map((m) =>
                            m.trim().match(/^[0-9a-fA-F]{6}$/)
                                ? '#' + m.trim()
                                : m.trim(),
                        );
                    console.log(parts);
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
                        />
                    ) : (
                        <div
                            key={i}
                            style={{
                                background: color.startsWith('http')
                                    ? `url("${color}")`
                                    : color,
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
            </div>
        </div>
    );
}

export const ColorEditor = ({
    color,
    onChange,
}: {
    color: string;
    onChange: (color: string) => void;
}) => {
    const [text, setText] = React.useState(null as null | string);
    return (
        <div css={{ display: 'flex' }}>
            <div
                style={{
                    background: (text ?? color).startsWith('http')
                        ? `url("${text ?? color}")`
                        : text ?? color,
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
        </div>
    );
};
