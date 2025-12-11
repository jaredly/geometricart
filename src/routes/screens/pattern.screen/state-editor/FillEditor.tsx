import React from 'react';
import {
    Color,
    Fill,
    AnimatableBoolean,
    AnimatableNumber,
    AnimatableColor,
    PMods,
} from '../export-types';
import {addMod} from './createLayerTemplate';
import {AnimColor} from './AnimColor';
import {AnimInput} from './AnimInput';
import {PModEditor} from './PModEditor';
import {BlurInput} from './BlurInput';
import {ShadowEditor} from './ShadowEditor';

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
                Fill
                <BlurInput
                    className="w-20 font-mono"
                    value={value.id}
                    onChange={(id) => onChange({...value, id})}
                />
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
                <ShadowEditor
                    value={value.shadow ?? null}
                    onChange={(shadow) => onChange({...value, shadow: shadow ?? undefined})}
                    palette={palette}
                />
            </div>
            <ModsEditor
                palette={palette}
                mods={value.mods}
                onChange={(mods) => onChange({...value, mods})}
            />
        </div>
    );
};

export const ModsEditor = ({
    mods,
    onChange,
    palette,
}: {
    palette: Color[];
    mods: PMods[];
    onChange: (mods: PMods[]) => void;
}) => (
    <div>
        <div className="font-semibold text-sm flex flex-row gap-4 items-center">
            Mods
            <select
                className="select select-sm w-50"
                value=""
                onChange={(evt) => {
                    onChange([...mods, addMod(evt.target.value)]);
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

        {mods.map((mod, i) => (
            <PModEditor
                key={i}
                value={mod}
                palette={palette}
                onRemove={() => {
                    const nmods = mods.slice();
                    nmods.splice(i, 1);
                    onChange(nmods);
                }}
                onChange={(mod) => {
                    const nmods = mods.slice();
                    nmods[i] = mod;
                    onChange(nmods);
                }}
            />
        ))}
    </div>
);
