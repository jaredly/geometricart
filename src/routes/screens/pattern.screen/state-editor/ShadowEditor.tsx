import React from 'react';
import {Color, Shadow, AnimatableCoord, AnimatableColor} from '../export-types';
import {AnimColor} from './AnimColor';
import {AnimCoordOrNumberInput} from './AnimCoordOrNumberInput';
import {BlurInput} from './BlurInput';

export const ShadowEditor = ({
    palette,
    value,
    onChange,
}: {
    palette: Color[];
    value: Shadow | null;
    onChange: (next: Shadow | null) => void;
}) => {
    if (!value) {
        return (
            <div>
                <button
                    className="btn btn-sm"
                    onClick={() =>
                        onChange({
                            blur: {x: 0, y: 0},
                            offset: {x: 3, y: 3},
                            color: {r: 0, g: 0, b: 0},
                        })
                    }
                >
                    Add shadow
                </button>
            </div>
        );
    }
    if (typeof value === 'string') {
        return (
            <div className="space-y-2">
                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                    <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => onChange(null)}
                    >
                        Remove
                    </button>
                </div>
                <BlurInput value={value} onChange={(value) => onChange(value)} />
            </div>
        );
    }
    return (
        <div className="space-y-2">
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <button className="btn btn-ghost btn-xs text-error" onClick={() => onChange(null)}>
                    Remove
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <AnimCoordOrNumberInput
                    label="blur"
                    value={value.blur}
                    onChange={(blur) => onChange({...value, blur: blur as AnimatableCoord})}
                />
                <AnimCoordOrNumberInput
                    label="offset"
                    value={value.offset}
                    onChange={(offset) => onChange({...value, offset: offset as AnimatableCoord})}
                />
                <AnimColor
                    palette={palette}
                    label="Color"
                    value={value.color}
                    onChange={(color) => onChange({...value, color: color as AnimatableColor})}
                />
            </div>
        </div>
    );
};
