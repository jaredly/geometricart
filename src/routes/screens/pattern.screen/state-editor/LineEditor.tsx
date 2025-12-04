import React from 'react';
import {Color, Line, AnimatableNumber, AnimatableColor, AnimatableBoolean} from '../export-types';
import {ShadowEditor} from './ShadowEditor';
import {AnimColor} from './AnimColor';
import {AnimInput} from './AnimInput';

export const LineEditor = ({
    palette,
    value,
    onChange,
    onRemove,
}: {
    palette: Color[];
    value: Line;
    onChange: (next: Line) => void;
    onRemove: () => void;
}) => {
    return (
        <div className="space-y-2">
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <span>{value.id}</span>
                <div className="flex-1" />
                <button className="btn btn-ghost btn-xs text-error" onClick={onRemove}>
                    Remove
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <AnimInput
                    label="zIndex"
                    value={value.zIndex}
                    onChange={(zIndex) => onChange({...value, zIndex: zIndex as AnimatableNumber})}
                />
                <AnimColor
                    palette={palette}
                    label="Color"
                    value={value.color}
                    onChange={(color) => onChange({...value, color: color as AnimatableColor})}
                />
                <AnimInput
                    label="Width"
                    value={value.width}
                    onChange={(width) => onChange({...value, width: width as AnimatableNumber})}
                />
                <AnimInput
                    label="Sharp"
                    value={value.sharp}
                    onChange={(sharp) => onChange({...value, sharp: sharp as AnimatableBoolean})}
                />
                <ShadowEditor
                    value={value.shadow ?? null}
                    onChange={(shadow) => onChange({...value, shadow: shadow ?? undefined})}
                    palette={palette}
                />
            </div>
            {/* <ModsEditor value={value.mods} onChange={(mods) => onChange({...value, mods})} /> */}
        </div>
    );
};
