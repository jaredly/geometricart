import React from 'react';
import {BaseKind, ShapeKind} from '../export-types';
import {DistanceEditor} from './DistanceEditor';
import {TextField} from './TextField';
import {NumberField} from './NumberField';
import {Updater} from '../../../../json-diff/Updater';

export const ShapeKindEditor = ({
    value,
    update,
}: {
    value: ShapeKind;
    update: Updater<ShapeKind>;
}) => {
    if (Array.isArray(value)) {
        return <div>itsan array</div>;
    }
    const type = value.type;
    return (
        <div className="flex flex-wrap">
            {value.type === 'distance' ? (
                <DistanceEditor value={value} update={update.variant('distance')} />
            ) : null}
            <div className="flex flex-wrap gap-2">
                <select
                    value={type}
                    onChange={(evt) => {
                        switch (evt.target.value) {
                            case 'everything':
                                update.replace({type: 'everything'});
                                return;
                            case 'alternating':
                                update.replace(
                                    value.type === 'alternating'
                                        ? value
                                        : {type: 'alternating', index: 0},
                                );
                                return;
                            case 'explicit':
                                update.replace(
                                    value.type === 'explicit' ? value : {type: 'explicit', ids: {}},
                                );
                                return;
                            case 'shape':
                                update.replace(
                                    value.type === 'shape'
                                        ? value
                                        : {type: 'shape', key: '', rotInvariant: false},
                                );
                                return;
                            case 'distance':
                                update.replace(
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
                        onChange={update.variant('alternating').index}
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
                            update.variant('explicit').ids(ids);
                        }}
                    />
                ) : null}
                {type === 'shape' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <TextField
                            label="Shape key"
                            value={value.key}
                            onChange={update.variant('shape').key}
                        />
                        <label className="label cursor-pointer gap-2">
                            <span className="label-text text-sm">Rotation invariant</span>
                            <input
                                className="checkbox"
                                type="checkbox"
                                checked={value.rotInvariant}
                                onChange={(evt) =>
                                    update.variant('shape').rotInvariant(evt.target.checked)
                                }
                            />
                        </label>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export const BaseKindEditor = ({value, update}: {value: BaseKind; update: Updater<BaseKind>}) => {
    if (Array.isArray(value)) {
        return <div>itsan array</div>;
    }
    const type = value.type;
    return (
        <div className="flex flex-wrap">
            {value.type === 'distance' ? (
                <DistanceEditor value={value} update={update.variant('distance')} />
            ) : null}
            <div className="flex flex-wrap gap-2">
                <select
                    value={type}
                    onChange={(evt) => {
                        switch (evt.target.value) {
                            case 'everything':
                                update.replace({type: 'everything'});
                                return;
                            case 'alternating':
                                update.replace(
                                    value.type === 'alternating'
                                        ? value
                                        : {type: 'alternating', index: 0},
                                );
                                return;
                            case 'explicit':
                                update.replace(
                                    value.type === 'explicit' ? value : {type: 'explicit', ids: {}},
                                );
                                return;
                            case 'distance':
                                update.replace(
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
                    {(['everything', 'alternating', 'explicit', 'distance'] as const).map((t) => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </select>
                {type === 'alternating' ? (
                    <NumberField
                        label="Index"
                        value={value.index}
                        onChange={update.variant('alternating').index}
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
                            update.variant('explicit').ids(ids);
                        }}
                    />
                ) : null}
            </div>
        </div>
    );
};
