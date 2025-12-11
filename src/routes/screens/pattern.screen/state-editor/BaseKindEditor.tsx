import React from 'react';
import {ShapeKind} from '../export-types';
import {DistanceEditor} from './DistanceEditor';
import {TextField} from './TextField';
import {NumberField} from './NumberField';

export const BaseKindEditor = ({
    value,
    onChange,
}: {
    value: ShapeKind;
    onChange: (next: ShapeKind) => void;
}) => {
    if (Array.isArray(value)) {
        return <div>itsan array</div>;
    }
    const type = value.type;
    return (
        <div className="flex flex-wrap">
            {value.type === 'distance' ? (
                <DistanceEditor value={value} onChange={(value) => onChange(value)} />
            ) : null}
            <div className="flex flex-wrap gap-2">
                <select
                    value={type}
                    onChange={(evt) => {
                        switch (evt.target.value) {
                            case 'everything':
                                onChange({type: 'everything'});
                                return;
                            case 'alternating':
                                onChange(
                                    value.type === 'alternating'
                                        ? value
                                        : {type: 'alternating', index: 0},
                                );
                                return;
                            case 'explicit':
                                onChange(
                                    value.type === 'explicit' ? value : {type: 'explicit', ids: {}},
                                );
                                return;
                            case 'shape':
                                onChange(
                                    value.type === 'shape'
                                        ? value
                                        : {type: 'shape', key: '', rotInvariant: false},
                                );
                                return;
                            case 'distance':
                                onChange(
                                    value.type === 'distance'
                                        ? value
                                        : {
                                              type: 'distance',
                                              corner: 0,
                                              distances: [0, 1],
                                              repeat: true,
                                          },
                                );
                                return;
                        }
                    }}
                >
                    {(['everything', 'alternating', 'explicit', 'shape', 'distance'] as const).map(
                        (t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ),
                    )}
                </select>
                {type === 'alternating' ? (
                    <NumberField
                        label="Index"
                        value={value.index}
                        onChange={(index) => onChange({...value, index})}
                    />
                ) : null}
                {type === 'explicit' ? (
                    <TextField
                        label="Ids (comma separated)"
                        value={Object.keys(value.ids).join(',')}
                        onChange={(text) => {
                            const ids = text
                                .split(',')
                                .map((t) => t.trim())
                                .filter(Boolean)
                                .reduce(
                                    (acc, key) => {
                                        acc[key] = true;
                                        return acc;
                                    },
                                    {} as Record<string, true>,
                                );
                            onChange({...value, ids});
                        }}
                    />
                ) : null}
                {type === 'shape' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <TextField
                            label="Shape key"
                            value={value.key}
                            onChange={(key) => onChange({...value, key})}
                        />
                        <label className="label cursor-pointer gap-2">
                            <span className="label-text text-sm">Rotation invariant</span>
                            <input
                                className="checkbox"
                                type="checkbox"
                                checked={value.rotInvariant}
                                onChange={(evt) =>
                                    onChange({...value, rotInvariant: evt.target.checked})
                                }
                            />
                        </label>
                    </div>
                ) : null}
            </div>
        </div>
    );
};
