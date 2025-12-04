import React from 'react';
import {Box} from '../export-types';
import {NumberField} from './NumberField';

export const BoxField = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value: Box;
    onChange: (box: Box) => void;
}) => {
    const update = (key: keyof Box, next: number) => onChange({...value, [key]: next});
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
                        onChange={(val) => update(key, val)}
                    />
                ))}
            </div>
        </div>
    );
};
