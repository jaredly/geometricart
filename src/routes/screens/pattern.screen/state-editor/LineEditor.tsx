import React from 'react';
import {
    Color,
    Line,
    AnimatableNumber,
    AnimatableColor,
    AnimatableBoolean,
    AnimatableValue,
} from '../export-types';
import {ShadowEditor} from './ShadowEditor';
import {AnimColor} from './AnimColor';
import {AnimInput} from './AnimInput';
import {ModsEditor} from './FillEditor';
import {Updater} from '../../../../json-diff/Updater';
import {BlurInput} from './BlurInput';

export const LineEditor = ({
    palette,
    value,
    update,
    reId,
}: {
    palette: Color[];
    value: Line;
    update: Updater<Line>;
    reId(newKey: string): void;
}) => {
    return (
        <div className="space-y-2">
            <div className="flex flex-row md:flex-row gap-2 md:items-center">
                Line
                <BlurInput className="w-20 font-mono" value={value.id} onChange={reId} />
                <button className="btn btn-ghost btn-xs text-error " onClick={update.remove}>
                    &times;
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <AnimInput
                    label="zIndex"
                    value={value.zIndex}
                    // biome-ignore lint: this one is fine
                    onChange={update.zIndex as Updater<any>}
                />
                <AnimColor
                    palette={palette}
                    label="Color"
                    value={value.color}
                    // biome-ignore lint: this one is fine
                    onChange={update.color as Updater<any>}
                />
                <AnimInput
                    label="Width"
                    value={value.width}
                    // biome-ignore lint: this one is fine
                    onChange={update.width as Updater<any>}
                />
                <AnimInput
                    label="Sharp"
                    value={value.sharp}
                    // biome-ignore lint: this one is fine
                    onChange={update.sharp as Updater<any>}
                />
            </div>
            <div>
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
