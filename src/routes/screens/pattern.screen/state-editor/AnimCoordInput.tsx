import React, {useState, useEffect} from 'react';
import {Coord} from '../../../../types';
import {AnimatableCoord} from '../export-types';
import {CoordField} from './CoordField';
import {BlurInput} from './BlurInput';

export const AnimCoordInput = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value?: AnimatableCoord;
    onChange: (next?: AnimatableCoord) => void;
}) => {
    return (
        <div className="form-control">
            <div className="label flex gap-2 items-center">
                <span className="label-text text-sm font-semibold">{label}</span>
            </div>
            <BlurInput
                value={value != null ? String(value) : ''}
                placeholder="expression"
                onChange={(value) => onChange(value)}
            />
        </div>
    );
};
