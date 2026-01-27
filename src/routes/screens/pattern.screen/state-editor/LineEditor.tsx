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
import {BooleanInput, Labeled, NumberInput} from './ExpandableEditor';

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
        <details className="space-y-2">
            <summary className="flex flex-row md:flex-row gap-2 md:items-center">
                Line
                <BlurInput className="w-20 font-mono" value={value.id} onChange={reId} />
                <button className="btn btn-ghost btn-xs text-error " onClick={update.remove}>
                    &times;
                </button>
            </summary>

            <div className="flex flex-row flex-wrap gap-2">
                <Labeled text="Enabled">
                    <BooleanInput
                        value={value.enabled}
                        onChange={(enabled) => update.enabled(enabled)}
                    />
                </Labeled>
                <Labeled text="Opacity">
                    <NumberInput
                        value={value.opacity}
                        onChange={(opacity) => update.opacity(opacity)}
                    />
                </Labeled>
                <Labeled text="zIndex">
                    <NumberInput
                        value={value.zIndex}
                        onChange={(zIndex) => update.zIndex(zIndex)}
                    />
                </Labeled>
                <AnimColor
                    palette={palette}
                    label="Color"
                    value={value.color}
                    // biome-ignore lint: this one is fine
                    onChange={update.color as Updater<any>}
                />
                <AnimColor
                    palette={palette}
                    label="Tint"
                    value={value.tint}
                    placeholder="rgb or hsl"
                    onChange={(tint, when) => update.tint(tint as AnimatableColor, when)}
                />
                <Labeled text="Width">
                    <NumberInput value={value.width} onChange={(width) => update.width(width)} />
                </Labeled>
                <Labeled text="Sharp">
                    <BooleanInput
                        value={value.sharp}
                        // biome-ignore lint: this one is fine
                        onChange={update.sharp as Updater<any>}
                    />
                </Labeled>
            </div>
            <div>
                <ShadowEditor
                    value={value.shadow ?? null}
                    update={update.shadow}
                    palette={palette}
                />
            </div>
            <ModsEditor palette={palette} mods={value.mods} update={update.mods} />
        </details>
    );
};
