import React from 'react';
import {Box} from '../export-types';
import {NumberField} from './NumberField';
import {Updater} from '../../../../json-diff/helper2';

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
                    <NumberField
                        key={key}
                        label={key.toUpperCase()}
                        value={value[key]}
                        step={0.01}
                        onChange={update[key]}
                    />
                ))}
            </div>
        </div>
    );
};
