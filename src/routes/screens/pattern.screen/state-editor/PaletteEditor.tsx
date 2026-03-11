import React, {useState} from 'react';
import {colorToString, parseColor} from '../utils/colors';
import {Color} from '../export-types';
import {BlurInput} from './BlurInput';
import {ColorInput} from './ColorInput';
import {Updater} from '../../../../json-diff/Updater';
import {ChevronUp12} from '../../../../icons/Icon';

export const PaletteEditor = ({palette, update}: {palette: Color[]; update: Updater<Color[]>}) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="bg-base-200 rounded-lg border border-base-300 py-3 pr-3 space-y-3 flex">
            <ChevronUp12
                onClick={() => setOpen(!open)}
                className={'m-3 shrink-0 ' + (open ? 'rotate-180' : 'rotate-90')}
            />
            <div className="space-y-2">
                {open ? (
                    palette.map((color, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <ColorInput
                                value={color}
                                onChange={update[i].$replace}
                                onPreview={(v) => update[i](v, 'preview')}
                            />
                            <BlurInput
                                value={colorToString(color)}
                                onChange={(v) => {
                                    const c = parseColor(v);
                                    if (!c) return;
                                    update[i](c);
                                }}
                            />
                            <button className="btn btn-ghost btn-xs" onClick={update[i].$remove}>
                                Remove
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-wrap py-2">
                        {palette.map((color, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <ColorInput
                                    value={color}
                                    onChange={update[i].$replace}
                                    onPreview={(v) => update[i](v, 'preview')}
                                />
                            </div>
                        ))}
                    </div>
                )}
                {palette.length === 0 ? (
                    <div className="text-sm opacity-60">No colors yet. Add your first swatch.</div>
                ) : null}
            </div>
        </div>
    );
};
