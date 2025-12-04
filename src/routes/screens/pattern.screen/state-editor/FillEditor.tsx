import React from 'react';
import {Color, Fill, AnimatableBoolean, AnimatableNumber, AnimatableColor} from '../export-types';
import {addMod} from './createLayerTemplate';
import {AnimColor} from './AnimColor';
import {AnimInput} from './AnimInput';
import {PModEditor} from './PModEditor';

export const FillEditor = ({
    value,
    onChange,
    onRemove,
    palette,
}: {
    palette: Color[];
    value: Fill;
    onChange: (next: Fill, nextKey?: string) => void;
    onRemove: () => void;
}) => {
    return (
        <div className="space-y-2 relative">
            <div className="flex flex-row md:flex-row gap-2 md:items-center">
                Fill <span className="font-mono bg-gray-600 px-2 rounded">{value.id}</span>
                <button className="btn btn-ghost btn-xs text-error " onClick={onRemove}>
                    &times;
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                <AnimInput
                    label="enabled"
                    value={value.enabled}
                    onChange={(enabled) =>
                        onChange({...value, enabled: enabled as AnimatableBoolean})
                    }
                />
                <AnimInput
                    label="zIndex"
                    value={value.zIndex}
                    onChange={(zIndex) => onChange({...value, zIndex: zIndex as AnimatableNumber})}
                />
                <AnimColor
                    label="Color"
                    value={value.color}
                    onChange={(color) => onChange({...value, color: color as AnimatableColor})}
                    palette={palette}
                />
                <AnimInput
                    label="Rounded"
                    value={value.rounded}
                    onChange={(rounded) =>
                        onChange({...value, rounded: rounded as AnimatableNumber})
                    }
                />
                <div>
                    <div className="font-semibold text-sm flex flex-row gap-4 items-center">
                        Mods
                        <select
                            className="select select-sm w-50"
                            value=""
                            onChange={(evt) => {
                                const mods = value.mods.slice();
                                mods.push(addMod(evt.target.value));
                                onChange({...value, mods});
                            }}
                        >
                            <option disabled value="">
                                Add
                            </option>
                            {['inset', 'translate', 'crop', 'scale', 'rotate'].map((type) => (
                                <option value={type} key={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>

                    {value.mods.map((mod, i) => (
                        <PModEditor
                            key={i}
                            value={mod}
                            palette={palette}
                            onRemove={() => {
                                const mods = value.mods.slice();
                                mods.splice(i, 1);
                                onChange({...value, mods});
                            }}
                            onChange={(mod) => {
                                const mods = value.mods.slice();
                                mods[i] = mod;
                                onChange({...value, mods});
                            }}
                        />
                    ))}
                </div>
            </div>
            {/* <ModsEditor value={value.mods} onChange={(mods) => onChange({...value, mods})} /> */}
        </div>
    );
};
