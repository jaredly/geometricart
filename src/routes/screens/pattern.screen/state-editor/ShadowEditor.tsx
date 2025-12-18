import React from 'react';
import {Color, Shadow, AnimatableCoord, AnimatableColor} from '../export-types';
import {AnimColor} from './AnimColor';
import {AnimCoordOrNumberInput} from './AnimCoordOrNumberInput';
import {BlurInput} from './BlurInput';
import {Updater} from '../../../../json-diff/Updater';

export const ShadowEditor = ({
    palette,
    value,
    update,
}: {
    palette: Color[];
    value: Shadow | null;
    update: Updater<Shadow>;
}) => {
    if (!value) {
        return (
            <div>
                <button
                    className="btn btn-sm"
                    onClick={() =>
                        update({
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
                        onClick={() => update.remove()}
                    >
                        Remove
                    </button>
                </div>
                <BlurInput value={value} onChange={(value) => update(value)} />
            </div>
        );
    }
    return (
        <div className="space-y-2">
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <button className="btn btn-ghost btn-xs text-error" onClick={() => update.remove()}>
                    Remove
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <AnimCoordOrNumberInput
                    label="blur"
                    value={value.blur}
                    onChange={(blur) => update({...value, blur: blur as AnimatableCoord})}
                />
                <AnimCoordOrNumberInput
                    label="offset"
                    value={value.offset}
                    onChange={(offset) => update({...value, offset: offset as AnimatableCoord})}
                />
                <AnimColor
                    palette={palette}
                    label="Color"
                    value={value.color}
                    onChange={(color, when) =>
                        update({...value, color: color as AnimatableColor}, when)
                    }
                />
                <label>
                    Inner
                    <input
                        type="checkbox"
                        checked={!!value.inner}
                        className="checkbox"
                        onChange={(evt) => update({...value, inner: evt.target.checked})}
                    />
                </label>
            </div>
        </div>
    );
};
