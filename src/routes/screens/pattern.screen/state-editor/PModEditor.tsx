import React from 'react';
import {Color, PMods, AnimatableNumber, AnimatableCoord} from '../export-types';
import {AnimInput} from './AnimInput';
import {AnimCoordInput} from './AnimCoordInput';
import {AnimCoordOrNumberInput} from './AnimCoordOrNumberInput';
import {Updater} from '../../../../json-diff/helper2';
import {useExportState} from '../pattern-export';

export const PModEditor = ({
    palette,
    value,
    update,
}: {
    palette: Color[];
    value: PMods;
    update: Updater<PMods>;
}) => {
    const ctx = useExportState();
    const cropIds = ctx.use((v) => Object.keys(v.crops), false);

    switch (value.type) {
        case 'inset':
            return (
                <div>
                    <button
                        onClick={update.remove}
                        className="cursor-pointer p-3 text-gray-600 hover:text-red-500"
                    >
                        &times;
                    </button>
                    <span className="mr-2">{value.type}</span>
                    <AnimInput
                        label="v"
                        value={value.v}
                        onChange={update.variant('inset').v as Updater<any>}
                    />
                </div>
            );
        case 'translate':
            return (
                <div>
                    <button
                        onClick={update.remove}
                        className="cursor-pointer p-3 text-gray-600 hover:text-red-500"
                    >
                        &times;
                    </button>
                    translate
                    <AnimCoordInput
                        label="v"
                        value={value.v}
                        onChange={update.variant('translate').v as Updater<any>}
                    />
                </div>
            );
        case 'crop':
            return (
                <div>
                    <button
                        onClick={update.remove}
                        className="cursor-pointer p-3 text-gray-600 hover:text-red-500"
                    >
                        &times;
                    </button>
                    {value.type}:{value.id}
                    <select
                        value={value.id}
                        onChange={(evt) => update.variant('crop').id(evt.target.value)}
                    >
                        <option disabled value="">
                            Select an id
                        </option>
                        {cropIds.map((id) => (
                            <option key={id} value={id}>
                                {id}
                            </option>
                        ))}
                    </select>
                    <input
                        type="checkbox"
                        className="checkbox"
                        checked={value.hole}
                        onChange={(evt) => update.variant('crop').hole(evt.target.checked)}
                    />
                </div>
            );
        case 'scale':
            return (
                <div className="flex flex-row gap-2 items-center">
                    <button
                        onClick={update.remove}
                        className="cursor-pointer p-3 text-gray-600 hover:text-red-500"
                    >
                        &times;
                    </button>
                    {value.type}
                    <AnimCoordOrNumberInput
                        label="v"
                        value={value.v}
                        onChange={update.variant('scale').v as Updater<any>}
                    />
                    <AnimCoordInput
                        label="origin"
                        value={value.origin}
                        onChange={update.variant('scale').origin}
                    />
                </div>
            );
        case 'rotate':
            return (
                <div className="flex flex-row gap-2 items-center">
                    <button
                        onClick={update.remove}
                        className="cursor-pointer p-3 text-gray-600 hover:text-red-500"
                    >
                        &times;
                    </button>
                    {value.type}
                    <AnimInput
                        label="v"
                        value={value.v}
                        onChange={update.variant('rotate').v as Updater<any>}
                    />
                    <AnimCoordInput
                        label="origin"
                        value={value.origin}
                        onChange={update.variant('rotate').origin}
                    />
                </div>
            );
    }
};
