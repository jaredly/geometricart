import React from 'react';
import {Coord} from '../../../../types';
import {NumberField} from './NumberField';
import {BlurInput} from './BlurInput';
import {closeEnough} from '../../../../rendering/epsilonToZero';

const numOrZero = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

export const CoordOrNumberField = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value: Coord;
    onChange: (next: Coord) => void;
}) => {
    return (
        <BlurInput
            value={closeEnough(value.x, value.y) ? value.x.toString() : `${value.x},${value.y}`}
            onChange={(v) => {
                if (v.includes(',')) {
                    const [x, y] = v.split(',');
                    return onChange({x: numOrZero(x), y: numOrZero(y)});
                }
                const n = numOrZero(v);
                return onChange({x: n, y: n});
            }}
        />
    );
};

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
