import React from 'react';
import {colorToString, parseColor} from '../colors';
import {Color} from '../export-types';
import {BlurInput} from './BlurInput';
import {ColorInput} from './ColorInput';
import {Updater} from '../../../../json-diff/helper2';

export const PaletteEditor = ({palette, update}: {palette: Color[]; update: Updater<Color[]>}) => {
    return (
        <div className="bg-base-200 rounded-lg border border-base-300 p-3 space-y-3">
            <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">Palette</div>
                <button
                    className="btn btn-sm btn-outline"
                    onClick={() => update.push({r: 255, g: 255, b: 255})}
                >
                    Add color
                </button>
            </div>
            <div className="space-y-2">
                {palette.map((color, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <ColorInput value={color} onChange={update[i]} />
                        <BlurInput
                            value={colorToString(color)}
                            onChange={(v) => {
                                const c = parseColor(v);
                                if (!c) return;
                                update[i](c);
                            }}
                        />
                        <button className="btn btn-ghost btn-xs" onClick={update[i].remove}>
                            Remove
                        </button>
                    </div>
                ))}
                {palette.length === 0 ? (
                    <div className="text-sm opacity-60">No colors yet. Add your first swatch.</div>
                ) : null}
            </div>
        </div>
    );
};
