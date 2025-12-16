import React from 'react';
import {Box} from '../export-types';
import {NumberField} from './NumberField';
import {Updater} from '../../../../json-diff/Updater';
import {BlurInt} from '../../../../editor/Forms';

export const BoxField = ({
    label,
    value,
    update,
}: {
    label: string;
    value: Box;
    update: Updater<Box>;
}) => {
    return (
        <div className="bg-base-200 rounded-lg p-3 border border-base-300 space-y-2">
            <div className="font-semibold text-sm">{label}</div>
            <div className="flex flex-row gap-3">
                {(['x', 'y', 'width', 'height'] as const).map((key) => (
                    <label key={key}>
                        <span>{key.toUpperCase()}</span>
                        <BlurInt
                            className="input w-15 ml-2"
                            value={value[key]}
                            step={0.01}
                            onChange={(v) => (v != null ? update[key](v) : null)}
                        />
                    </label>
                ))}
            </div>
        </div>
    );
};
