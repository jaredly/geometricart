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
import {Updater} from '../../../../json-diff/helper2';

export const LineEditor = ({
    palette,
    value,
    update,
}: {
    palette: Color[];
    value: Line;
    update: Updater<Line>;
}) => {
    return (
        <div className="space-y-2">
            <div className="flex flex-row md:flex-row gap-2 md:items-center">
                Line <span className="font-mono bg-gray-600 px-2 rounded">{value.id}</span>
                <button className="btn btn-ghost btn-xs text-error " onClick={update.remove}>
                    &times;
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <AnimInput
                    label="zIndex"
                    value={value.zIndex}
                    onChange={update.zIndex as Updater<any>}
                />
                <AnimColor
                    palette={palette}
                    label="Color"
                    value={value.color}
                    onChange={update.color as Updater<any>}
                />
                <AnimInput
                    label="Width"
                    value={value.width}
                    onChange={update.width as Updater<any>}
                />
                <AnimInput
                    label="Sharp"
                    value={value.sharp}
                    onChange={update.sharp as Updater<any>}
                />
                <ShadowEditor
                    value={value.shadow ?? null}
                    onChange={(shadow) => update.shadow(shadow ?? undefined)}
                    palette={palette}
                />
            </div>
            <ModsEditor palette={palette} mods={value.mods} update={update.mods} />
        </div>
    );
};
