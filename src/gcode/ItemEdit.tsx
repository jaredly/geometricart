import React, { useState } from 'react';
import { paletteColor } from '../editor/RenderPath';
import { pxToMM } from './generateGcode';
import { Fill, GCodePath, State } from '../types';
import { FillColors, LineColors } from './GCodeEditor';

const ColorsSelect = ({
    value,
    colors,
    onChange,
}: {
    value?: string;
    colors: { key: string; color: string; title: string }[];
    onChange: (key: string) => void;
}) => {
    const [show, setShow] = useState(false);
    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <div
                style={{
                    backgroundColor:
                        colors.find((c) => c.key === value)?.color ?? 'white',
                    width: 20,
                    height: 20,
                    border: '1px solid black',
                    cursor: 'pointer',
                }}
                onClick={() => setShow(!show)}
            />
            {show && (
                <div
                    style={{
                        position: 'absolute',
                        zIndex: 100,
                        top: 20,
                        left: 0,
                        backgroundColor: '#222',
                        border: '1px solid black',
                    }}
                >
                    {colors.map((c) => (
                        <div
                            key={c.key}
                            style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}
                            onClick={() => (setShow(false), onChange(c.key))}
                        >
                            <div
                                style={{
                                    backgroundColor: c.color,
                                    display: 'inline-block',
                                    width: 20,
                                    height: 20,
                                    marginRight: 4,
                                }}
                            />
                            <span style={{ whiteSpace: 'nowrap' }}>
                                {c.title}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const ItemEdit = ({
    item,
    onChange,
    colors,
    state,
}: {
    item: GCodePath;
    onChange: (item: GCodePath) => void;
    colors: { line: LineColors; fill: FillColors };
    state: State;
}) => {
    const [edited, setEdited] = useState(null as null | GCodePath);
    const selected = colors.line[edited?.color ?? item.color];
    return (
        <div>
            <ColorsSelect
                onChange={(color) => setEdited({ ...(edited ?? item), color })}
                value={edited?.color ?? item.color}
                colors={Object.keys(colors.line).map((c) => ({
                    key: c,
                    color: paletteColor(
                        state.palettes[state.activePalette],
                        colors.line[c].color,
                    )!,
                    title: `(${colors.line[c].count} paths)`,
                }))}
            />
            {selected && selected.width
                ? pxToMM(selected.width / 100, state.meta.ppi).toFixed(2) +
                  'mm Bit size'
                : null}
            <span style={{ marginRight: 8 }} /> Speed
            <Float
                style={{
                    marginRight: 16,
                    marginLeft: 4,
                }}
                value={edited?.speed ?? item.speed}
                placeholder="Speed"
                onChange={(speed) =>
                    speed != null
                        ? setEdited({ ...(edited ?? item), speed })
                        : null
                }
            />
            Depth
            <Float
                style={{
                    marginRight: 16,
                    marginLeft: 4,
                }}
                value={edited?.depth ?? item.depth}
                placeholder="Depth"
                onChange={(depth) =>
                    depth ? setEdited({ ...(edited ?? item), depth }) : null
                }
            />
            Pass Depth
            <Float
                style={{
                    marginRight: 16,
                    marginLeft: 4,
                }}
                value={edited ? edited.passDepth : item.passDepth}
                placeholder="Depth"
                onChange={(passDepth) =>
                    setEdited({ ...(edited ?? item), passDepth })
                }
            />
            Fill Overlap
            <Float
                style={{
                    marginRight: 16,
                    marginLeft: 4,
                }}
                value={edited ? edited.fillOver : item.fillOver}
                placeholder="Fill Overlap"
                onChange={(fillOver) =>
                    setEdited({ ...(edited ?? item), fillOver })
                }
            />
            {edited != null ? (
                <button
                    onClick={() => {
                        onChange(edited);
                        setEdited(null);
                    }}
                >
                    Save
                </button>
            ) : null}
        </div>
    );
};

export const Float = ({
    value,
    onChange,
    placeholder,
    style,
}: {
    value?: number;
    onChange: (v?: number) => unknown;
    placeholder?: string;
    style?: React.CSSProperties;
}) => {
    let [text, setText] = React.useState(null as null | string);
    return (
        <input
            value={text ?? value ?? ''}
            placeholder={placeholder}
            onChange={(evt) => {
                setText(evt.target.value);
                if (!evt.target.value.trim().length) {
                    return onChange(undefined);
                }
                const value = +evt.target.value;
                if (!isNaN(value)) {
                    onChange(value);
                }
            }}
            onBlur={() => setText(null)}
            style={{ width: 40, textAlign: 'center', ...style }}
        />
    );
};
