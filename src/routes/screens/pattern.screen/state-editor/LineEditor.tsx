import React, {useState} from 'react';
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
import {ModsEditor, nonNullArray} from './FillEditor';
import {Updater} from '../../../../json-diff/Updater';
import {BlurInput} from './BlurInput';
import {BooleanInput, ExpandableEditor, Labeled, NumberInput} from './ExpandableEditor';
import {CogIcon, DeleteForeverIcon} from '../../../../icons/Icon';

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
    const [showAll, setShowAll] = useState(false);
    return (
        <div className="space-y-2">
            <div className="flex flex-row flex-wrap gap-2 items-center">
                <button className="btn btn-ghost btn-xs text-error " onClick={update.remove}>
                    &times;
                </button>
                <ExpandableEditor value={value.id} onChange={reId} />
                <button className="btn btn-ghost btn-xs " onClick={() => setShowAll(!showAll)}>
                    <CogIcon />
                </button>
                {[
                    <Labeled text="Enabled" key="enabled">
                        <BooleanInput
                            value={value.enabled}
                            onChange={(enabled) => update.enabled(enabled)}
                        />
                    </Labeled>,
                    <Labeled text="Opacity" key="opacity">
                        <NumberInput
                            value={value.opacity}
                            onChange={(opacity) => update.opacity(opacity)}
                        />
                    </Labeled>,
                    <Labeled text="zIndex" key="zIndex">
                        <NumberInput
                            value={value.zIndex}
                            onChange={(zIndex) => update.zIndex(zIndex)}
                        />
                    </Labeled>,
                    <AnimColor
                        key="color"
                        palette={palette}
                        label="Color"
                        value={value.color}
                        // biome-ignore lint: this one is fine
                        onChange={update.color as Updater<any>}
                    />,
                    <AnimColor
                        key="tint"
                        palette={palette}
                        label="Tint"
                        value={value.tint}
                        placeholder="rgb or hsl"
                        onChange={(tint, when) => update.tint(tint as AnimatableColor, when)}
                    />,
                    <Labeled text="Width" key="width">
                        <NumberInput
                            value={value.width}
                            onChange={(width) => update.width(width)}
                        />
                    </Labeled>,
                    <Labeled text="Sharp" key="sharp">
                        <BooleanInput
                            value={value.sharp}
                            // biome-ignore lint: this one is fine
                            onChange={update.sharp as Updater<any>}
                        />
                    </Labeled>,
                    <Labeled text="shadow" key="shadow" className="bg-base-100 p-2 relative">
                        <ShadowEditor
                            value={value.shadow ?? null}
                            update={update.shadow}
                            palette={palette}
                        />
                    </Labeled>,
                    <ModsEditor
                        key="mods"
                        palette={palette}
                        mods={value.mods}
                        update={update.mods}
                    />,
                ].map((node) =>
                    showAll || nonNullArray(value[node.key as keyof typeof value]) ? node : null,
                )}
            </div>
            <div></div>
        </div>
    );
};
