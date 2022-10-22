import React, { useState } from 'react';
import { paletteColor } from '../editor/RenderPath';
import { pxToMM } from './generateGcode';
import { GCodePath, State } from '../types';
import { Colors } from './GCodeEditor';

export const ItemEdit = ({
    item,
    onChange,
    colors,
    state,
}: {
    item: GCodePath;
    onChange: (item: GCodePath) => void;
    colors: Colors;
    state: State;
}) => {
    const [edited, setEdited] = useState(null as null | GCodePath);
    const selected = colors[edited?.color ?? item.color];
    return (
        <div>
            <select
                onChange={(evt) =>
                    setEdited({ ...(edited ?? item), color: evt.target.value })
                }
                value={edited?.color ?? item.color}
                style={{ marginRight: 8 }}
            >
                <option value="">Select a color</option>
                {Object.keys(colors).map((key) => (
                    <option value={key + ''} key={key}>
                        {paletteColor(
                            state.palettes[state.activePalette],
                            colors[key].color,
                        )}{' '}
                        ({colors[key].count} paths)
                    </option>
                ))}
            </select>
            {selected
                ? pxToMM(selected.width / 100, state.meta.ppi).toFixed(2)
                : 'unknown'}
            mm Bit size
            <span style={{ marginRight: 8 }} /> Speed
            <input
                style={{
                    width: 40,
                    textAlign: 'center',
                    marginRight: 16,
                    marginLeft: 4,
                }}
                value={edited?.speed ?? item.speed}
                placeholder="Speed"
                onChange={(evt) =>
                    setEdited({ ...(edited ?? item), speed: +evt.target.value })
                }
            />
            Depth
            <input
                style={{
                    width: 40,
                    textAlign: 'center',
                    marginRight: 16,
                    marginLeft: 4,
                }}
                value={edited?.depth ?? item.depth}
                placeholder="Depth"
                onChange={(evt) =>
                    setEdited({ ...(edited ?? item), depth: +evt.target.value })
                }
            />
            Pass Depth
            <input
                style={{
                    width: 40,
                    textAlign: 'center',
                    marginRight: 16,
                    marginLeft: 4,
                }}
                value={edited ? edited.passDepth : item.passDepth}
                placeholder="Depth"
                onChange={(evt) =>
                    setEdited({
                        ...(edited ?? item),
                        passDepth: evt.target.value.length
                            ? +evt.target.value
                            : undefined,
                    })
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
