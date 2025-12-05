import React from 'react';
import {Color, PMods, AnimatableNumber, AnimatableCoord} from '../export-types';
import {AnimInput} from './AnimInput';
import {AnimCoordInput} from './AnimCoordInput';

export const PModEditor = ({
    palette,
    value,
    onChange,
    onRemove,
}: {
    palette: Color[];
    value: PMods;
    onChange: (next: PMods, nextKey?: string) => void;
    onRemove: () => void;
}) => {
    switch (value.type) {
        case 'inset':
            return (
                <div>
                    <button
                        onClick={onRemove}
                        className="cursor-pointer p-3 text-gray-600 hover:text-red-500"
                    >
                        &times;
                    </button>
                    <span className="mr-2">{value.type}</span>
                    <AnimInput
                        label="v"
                        value={value.v}
                        onChange={(v) => onChange({...value, v: v as AnimatableNumber})}
                    />
                </div>
            );
        case 'translate':
            return (
                <div>
                    <button
                        onClick={onRemove}
                        className="cursor-pointer p-3 text-gray-600 hover:text-red-500"
                    >
                        &times;
                    </button>
                    {value.type}
                    <AnimCoordInput
                        label="v"
                        value={value.v}
                        onChange={(v) => onChange({...value, v: v as AnimatableCoord})}
                    />
                </div>
            );
        case 'crop':
            return (
                <div>
                    <button
                        onClick={onRemove}
                        className="cursor-pointer p-3 text-gray-600 hover:text-red-500"
                    >
                        &times;
                    </button>
                    {value.type}:{value.id}
                    <input
                        type="checkbox"
                        className="checkbox"
                        checked={value.hole}
                        onChange={(evt) => onChange({...value, hole: evt.target.checked})}
                    />
                </div>
            );
        case 'scale':
            return null;
        case 'rotate':
            return (
                <div className="flex flex-row gap-2 items-center">
                    <button
                        onClick={onRemove}
                        className="cursor-pointer p-3 text-gray-600 hover:text-red-500"
                    >
                        &times;
                    </button>
                    {value.type}
                    <AnimInput
                        label="v"
                        value={value.v}
                        onChange={(v) => onChange({...value, v: v as AnimatableNumber})}
                    />
                    <AnimCoordInput
                        label="origin"
                        value={value.origin}
                        onChange={(origin) =>
                            onChange({...value, origin: origin as AnimatableCoord})
                        }
                    />
                </div>
            );
    }
};
