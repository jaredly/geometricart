import React, {useState} from 'react';
import {colorToRgbString, parseColor} from '../colors';
import {Color} from '../export-types';

export const ColorInput = ({
    value,
    onChange,
    onPreview,
}: {
    value: Color;
    onChange: (v: Color) => void;
    onPreview: (v: Color) => void;
}) => {
    const [tmp, setTmp] = useState(null as null | Color);

    return (
        <input
            type="color"
            value={colorToRgbString(tmp ?? value)}
            onBlur={() => (tmp ? (onChange(tmp), setTmp(null)) : null)}
            onChange={(evt) => {
                const color = parseColor(evt.target.value);
                if (color) {
                    setTmp(color);
                    onPreview(color);
                }
            }}
        />
    );
};
