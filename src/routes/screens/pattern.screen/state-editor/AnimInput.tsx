import React from 'react';
import {AnimatableNumber, AnimatableBoolean, AnimatableColor} from '../export-types';
import {BlurInput} from './BlurInput';
import {parseAnimatable} from './createLayerTemplate';

export const AnimInput = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value?: AnimatableNumber | AnimatableBoolean | AnimatableColor;
    onChange: (next?: AnimatableNumber | AnimatableBoolean | AnimatableColor) => void;
}) => (
    <label className="form-control">
        <div className="label">
            <span className="label-text text-sm font-semibold">{label}</span>
        </div>
        <BlurInput
            value={value != null ? String(value) : ''}
            placeholder="number | expression"
            onChange={(value) => {
                const parsed = parseAnimatable(value);
                onChange(value.trim() ? parsed : undefined);
            }}
        />
    </label>
);
