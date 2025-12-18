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
import {Updater} from '../../../../json-diff/Updater';

export const FillEditor = ({
    value,
    update,
    palette,
    reId,
}: {
    palette: Color[];
    value: Fill;
    update: Updater<Fill>;
    reId(newKey: string): void;
}) => {
    return (
        <div className="space-y-2 relative">
            <div className="flex flex-row md:flex-row gap-2 md:items-center">
                Fill
                <BlurInput className="w-20 font-mono" value={value.id} onChange={reId} />
                <button className="btn btn-ghost btn-xs text-error " onClick={update.remove}>
                    &times;
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                <AnimInput
                    label="enabled"
                    value={value.enabled}
                    onChange={(enabled) => update.enabled(enabled as AnimatableBoolean)}
                />
                <AnimInput
                    label="zIndex"
                    value={value.zIndex}
                    onChange={(zIndex) => update.zIndex(zIndex as AnimatableNumber)}
                />
                <AnimColor
                    label="Color"
                    value={value.color}
                    onChange={(color, when) => update.color(color as AnimatableColor, when)}
                    palette={palette}
                />
                <AnimInput
                    label="Rounded"
                    value={value.rounded}
                    onChange={(rounded) => update.rounded(rounded as AnimatableNumber)}
                />
                <ShadowEditor
                    value={value.shadow ?? null}
                    update={update.shadow}
                    palette={palette}
                />
            </div>
            <ModsEditor palette={palette} mods={value.mods} update={update.mods} />
        </div>
    );
};

export const ModsEditor = ({
    mods,
    update,
    palette,
}: {
    palette: Color[];
    mods: PMods[];
    update: Updater<PMods[]> | Updater<PMods[] | undefined>;
}) => (
    <div>
        <div className="font-semibold text-sm flex flex-row gap-4 items-center">
            Mods
            <select
                className="select select-sm w-50"
                value=""
                onChange={(evt) => {
                    (update as Updater<PMods[] | undefined>)((a, u) =>
                        a ? u.push(addMod(evt.target.value)) : u([addMod(evt.target.value)]),
                    );
                    // update.push(addMod(evt.target.value));
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
            <PModEditor key={i} value={mod} palette={palette} update={update[i]} />
        ))}
    </div>
);
