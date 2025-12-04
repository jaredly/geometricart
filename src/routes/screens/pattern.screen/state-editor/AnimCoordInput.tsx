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
    const isCoord = value && typeof value === 'object' && 'x' in value && 'y' in value;
    const [mode, setMode] = useState<'coord' | 'raw'>(isCoord ? 'coord' : 'raw');

    useEffect(() => {
        if (isCoord && mode !== 'coord') {
            setMode('coord');
        }
        if (!isCoord && mode !== 'raw') {
            setMode('raw');
        }
    }, [isCoord, mode]);

    return (
        <div className="form-control">
            <div className="label flex gap-2 items-center">
                <span className="label-text text-sm font-semibold">{label}</span>
                <div className="join join-vertical md:join-horizontal">
                    <button
                        className={`btn btn-xs join-item ${mode === 'coord' ? 'btn-active' : ''}`}
                        onClick={(evt) => {
                            evt.preventDefault();
                            setMode('coord');
                            if (!isCoord) {
                                onChange({x: 0, y: 0});
                            }
                        }}
                    >
                        x/y
                    </button>
                    <button
                        className={`btn btn-xs join-item ${mode === 'raw' ? 'btn-active' : ''}`}
                        onClick={(evt) => {
                            evt.preventDefault();
                            setMode('raw');
                            if (isCoord) {
                                onChange(`({x: ${(value as Coord).x}, y: ${(value as Coord).y}})`);
                            }
                        }}
                    >
                        Raw
                    </button>
                </div>
            </div>
            {mode === 'coord' ? (
                <CoordField
                    label=""
                    value={isCoord ? (value as Coord) : {x: 0, y: 0}}
                    onChange={(coord) => onChange(coord)}
                />
            ) : (
                <BlurInput
                    value={value != null && !isCoord ? String(value) : ''}
                    placeholder="expression"
                    onChange={(value) => onChange(value)}
                />
            )}
        </div>
    );
};
