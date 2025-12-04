import React from 'react';

export const TextField = ({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    placeholder?: string;
    onChange: (next: string) => void;
}) => (
    <label className="form-control w-full">
        <div className="label">
            <span className="label-text font-semibold">{label}</span>
        </div>
        <input
            className="input input-bordered w-full"
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(evt) => onChange(evt.target.value)}
        />
    </label>
);
