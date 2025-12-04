import React from 'react';

export const NumberField = ({
    label,
    value,
    onChange,
    step = 1,
}: {
    label: string;
    value: number;
    step?: number;
    onChange: (next: number) => void;
}) => (
    <label className="flex gap-2 items-center" onClick={(evt) => evt.stopPropagation()}>
        <div className="label">
            <span className="label-text font-semibold">{label}</span>
        </div>
        <input
            className="input input-sm input-bordered w-15"
            type="number"
            value={value}
            step={step}
            onChange={(evt) => onChange(+evt.target.value)}
        />
    </label>
);
