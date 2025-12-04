import React from 'react';
import {Coord} from '../../../../types';
import {NumberField} from './NumberField';

export const CoordField = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value: Coord;
    onChange: (next: Coord) => void;
}) => {
    return (
        <div className="bg-base-200 rounded-lg p-3 border border-base-300 space-y-2 flex gap-2 items-center">
            {label ? <div className="font-semibold text-sm p-0 m-0">{label}</div> : null}
            <div className="grid grid-cols-2 gap-2">
                <NumberField
                    label="X"
                    value={value.x}
                    step={0.01}
                    onChange={(x) => onChange({...value, x})}
                />
                <NumberField
                    label="Y"
                    value={value.y}
                    step={0.01}
                    onChange={(y) => onChange({...value, y})}
                />
            </div>
        </div>
    );
};
