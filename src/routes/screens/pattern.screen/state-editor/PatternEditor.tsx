import React from 'react';
import {Color, Pattern} from '../export-types';
import {CoordField} from './CoordField';
import {NumberField} from './NumberField';
import {PatternContentsEditor} from './PatternContentsEditor';

export const PatternEditor = ({
    value,
    onChange,
    palette,
}: {
    palette: Color[];
    value: Pattern;
    onChange: (next: Pattern) => void;
}) => {
    return (
        <div className="space-y-3">
            {typeof value.psize === 'number' ? (
                <NumberField
                    label="Size"
                    value={value.psize}
                    onChange={(v) => onChange({...value, psize: v})}
                />
            ) : (
                <CoordField
                    label="Pattern size"
                    value={value.psize}
                    onChange={(psize) => onChange({...value, psize})}
                />
            )}
            {/* <ModsEditor
                value={value.mods}
                onChange={(mods) => (mods ? onChange({...value, mods}) : undefined)}
            /> */}
            <PatternContentsEditor
                palette={palette}
                value={value.contents}
                onChange={(contents) => onChange({...value, contents})}
            />
        </div>
    );
};
