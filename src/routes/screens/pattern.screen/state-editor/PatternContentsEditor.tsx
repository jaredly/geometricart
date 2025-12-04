import React, {useState, useEffect} from 'react';
import {Color, PatternContents, AnimatableCoord} from '../export-types';
import {AnimCoordInput} from './AnimCoordInput';
import {JsonEditor} from './JsonEditor';
import {NumberField} from './NumberField';
import {ShapeStylesEditor} from './ShapeStylesEditor';

export const PatternContentsEditor = ({
    value,
    palette,
    onChange,
}: {
    palette: Color[];
    value: PatternContents;
    onChange: (next: PatternContents) => void;
}) => {
    const [type, setType] = useState<PatternContents['type']>(value.type);

    useEffect(() => {
        setType(value.type);
    }, [value.type]);

    const swapType = (nextType: PatternContents['type']) => {
        setType(nextType);
        if (nextType === value.type) return;
        switch (nextType) {
            case 'shapes':
                onChange({type: 'shapes', styles: {}});
                break;
            case 'weave':
                onChange({type: 'weave', orderings: {}, styles: {}});
                break;
            case 'lines':
                onChange({type: 'lines', styles: {}});
                break;
            case 'layers':
                onChange({type: 'layers', origin: {x: 0, y: 0}, reverse: false, styles: {}});
                break;
        }
    };

    return (
        <div className="rounded border border-base-300 p-3 bg-base-100 space-y-3">
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <div className="font-semibold text-sm">Contents</div>
                <select
                    className="select select-bordered w-full md:w-auto"
                    value={type}
                    onChange={(evt) => swapType(evt.target.value as PatternContents['type'])}
                >
                    <option value="shapes">Shapes</option>
                    <option value="weave">Weave</option>
                    <option value="lines">Lines</option>
                    <option value="layers">Layers</option>
                </select>
            </div>
            {value.type === 'layers' ? (
                <div className="space-y-2">
                    <AnimCoordInput
                        label="Origin"
                        value={value.origin}
                        onChange={(origin: AnimatableCoord | undefined | null) =>
                            origin != null ? onChange({...value, origin}) : undefined
                        }
                    />
                    <label className="label cursor-pointer gap-2">
                        <span className="label-text text-sm">Reverse</span>
                        <input
                            className="checkbox"
                            type="checkbox"
                            checked={!!value.reverse}
                            onChange={(evt) => onChange({...value, reverse: evt.target.checked})}
                        />
                    </label>
                    {/* <JsonEditor
                        label="Styles"
                        value={value.styles}
                        onChange={(styles) =>
                            onChange({
                                ...value,
                                styles: styles as typeof value.styles,
                            })
                        }
                    /> */}
                </div>
            ) : null}
            {value.type === 'weave' ? (
                <div className="space-y-2">
                    <NumberField
                        label="Flip"
                        value={value.flip ?? 0}
                        onChange={(flip) => onChange({...value, flip})}
                    />
                    <JsonEditor
                        label="Orderings"
                        value={value.orderings}
                        onChange={(orderings) =>
                            onChange({...value, orderings: orderings as Record<string, number[]>})
                        }
                    />
                    <JsonEditor
                        label="Styles"
                        value={value.styles}
                        onChange={(styles) =>
                            onChange({...value, styles: styles as typeof value.styles})
                        }
                    />
                </div>
            ) : null}
            {value.type === 'shapes' ? (
                <ShapeStylesEditor
                    palette={palette}
                    styles={value.styles}
                    onChange={(styles) =>
                        onChange({
                            ...value,
                            styles,
                        })
                    }
                />
            ) : null}
            {value.type === 'lines' ? (
                <JsonEditor
                    label="Styles"
                    value={value.styles}
                    onChange={(styles) =>
                        onChange({
                            ...value,
                            styles: styles as typeof value.styles,
                        })
                    }
                />
            ) : null}
        </div>
    );
};
