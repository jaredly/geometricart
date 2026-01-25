import React from 'react';
import {parseColor, colorToString} from '../utils/colors';
import {AnimatableColor, Color} from '../export-types';
import {BlurInput} from './BlurInput';
import {parseAnimatable} from './createLayerTemplate';
import {ColorInput} from './ColorInput';
import {ApplyTiming} from '../../../../json-diff/helper2';

// const ModsEditor = ({
//     value,
//     onChange,
// }: {
//     value?: Mods;
//     onChange: (next: Mods | undefined) => void;
// }) => {
//     const mods = value ?? {};
//     const setField = (key: keyof Mods, val: Mods[typeof key]) => {
//         const next = {...mods, [key]: val};
//         // const cleaned = Object.entries(next).reduce((acc, [k, v]) => {
//         //     if (v !== undefined && v !== '') acc[k as keyof Mods] = v as Mods[keyof Mods];
//         //     return acc;
//         // }, {} as Mods);
//         // onChange(Object.keys(cleaned).length ? cleaned : undefined);
//     };
//     return (
//         <details className="bg-base-200 rounded-lg border border-base-300 p-3 space-y-2">
//             <summary className="font-semibold text-sm">Mods</summary>
//             {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
//                 <AnimInput
//                     label="Inset"
//                     value={mods.inset}
//                     onChange={(v) => setField('inset', v)}
//                 />
//                 <AnimCoordInput
//                     label="Scale"
//                     value={mods.scale}
//                     onChange={(v) => setField('scale', v as AnimatableCoord | AnimatableNumber)}
//                 />
//                 <AnimCoordInput
//                     label="Scale origin"
//                     value={mods.scaleOrigin}
//                     onChange={(v) => setField('scaleOrigin', v)}
//                 />
//                 <AnimCoordInput
//                     label="Offset"
//                     value={mods.offset}
//                     onChange={(v) => setField('offset', v)}
//                 />
//                 <AnimInput
//                     label="Rotation"
//                     value={mods.rotation}
//                     onChange={(v) => setField('rotation', v)}
//                 />
//                 <AnimCoordInput
//                     label="Rotation origin"
//                     value={mods.rotationOrigin}
//                     onChange={(v) => setField('rotationOrigin', v)}
//                 />
//                 <AnimInput
//                     label="Opacity"
//                     value={mods.opacity}
//                     onChange={(v) => setField('opacity', v)}
//                 />
//                 <AnimInput label="Tint" value={mods.tint} onChange={(v) => setField('tint', v)} />
//                 <AnimInput
//                     label="Thickness"
//                     value={mods.thickness}
//                     onChange={(v) => setField('thickness', v)}
//                 />
//             </div> */}
//             {value && Object.keys(value).length ? (
//                 <button className="btn btn-ghost btn-xs" onClick={() => onChange(undefined)}>
//                     Clear mods
//                 </button>
//             ) : null}
//         </details>
//     );
// };

export const AnimColor = ({
    label,
    value,
    onChange,
    palette,
    placeholder = 'Color',
}: {
    label: string;
    value?: AnimatableColor;
    onChange: (next?: AnimatableColor, when?: ApplyTiming) => void;
    palette: Color[];
    placeholder?: string;
}) => {
    const colorV =
        typeof value === 'string'
            ? parseColor(value)
            : typeof value === 'object'
              ? value
              : typeof value === 'number'
                ? palette[value]
                : null;
    return (
        <label className="form-control">
            <div className="label">
                <span className="label-text text-sm font-semibold">{label}</span>
                {colorV ? (
                    <ColorInput
                        value={colorV}
                        onChange={(color) => onChange(color)}
                        onPreview={(color) => onChange(color, 'preview')}
                    />
                ) : null}
            </div>
            <BlurInput
                value={
                    value != null
                        ? typeof value === 'string' || typeof value === 'number'
                            ? '' + value
                            : colorToString(value)
                        : ''
                }
                className="w-80 font-mono"
                placeholder={placeholder}
                onChange={(value) => {
                    const parsed = parseAnimatable(value);
                    onChange(value.trim() ? parsed : undefined);
                }}
            />
        </label>
    );
};
