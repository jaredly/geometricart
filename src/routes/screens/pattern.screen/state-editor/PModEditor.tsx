import React from 'react';
import {Color, PMods, AnimatableNumber, AnimatableCoord} from '../export-types';
import {AnimInput, AnimValueInput} from './AnimInput';
import {AnimCoordInput} from './AnimCoordInput';
import {AnimCoordOrNumberInput} from './AnimCoordOrNumberInput';
import {useExportState} from '../ExportHistory';
import {EyeIcon, EyeInvisibleIcon} from '../../../../icons/Eyes';
import {Updater} from '../../../../json-diff/Updater';

const Disableable = ({
    children,
    remove,
    toggle,
    disabled,
}: {
    children: React.ReactNode;
    toggle(): void;
    remove(): void;
    disabled?: boolean;
}) => (
    <div className="flex flex-row gap-2 items-center" style={disabled ? {opacity: 0.6} : undefined}>
        <button
            onClick={toggle}
            className="cursor-pointer p-3 text-gray-600 hover:text-gray-900"
            aria-label={disabled ? 'Enable mod' : 'Disable mod'}
        >
            {disabled ? <EyeInvisibleIcon color="gray" /> : <EyeIcon />}
        </button>
        <button onClick={remove} className="cursor-pointer p-3 text-gray-600 hover:text-red-500">
            &times;
        </button>
        {children}
    </div>
);

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
    const cropIds = ctx.use((v) => Object.keys(v?.crops ?? {}), false);
    // const cropIds = Object.keys(ctx.latest().crops);

    switch (value.type) {
        case 'inset':
            return (
                <Disableable
                    disabled={value.disabled}
                    toggle={() => update.variant(value.type).disabled((v, u) => u(!v))}
                    remove={update.remove}
                >
                    <span className="mr-2">{value.type}</span>
                    <AnimInput
                        label="v"
                        value={value.v}
                        // biome-ignore lint: this one is fine
                        onChange={update.variant(value.type).v as Updater<any>}
                    />
                </Disableable>
            );
        case 'translate':
            return (
                <Disableable
                    disabled={value.disabled}
                    toggle={() => update.variant(value.type).disabled((v, u) => u(!v))}
                    remove={update.remove}
                >
                    translate
                    <AnimCoordInput
                        label="v"
                        value={value.v}
                        // biome-ignore lint: this one is fine
                        onChange={update.variant('translate').v as Updater<any>}
                    />
                </Disableable>
            );
        case 'crop':
            return (
                <Disableable
                    disabled={value.disabled}
                    toggle={() => update.variant(value.type).disabled((v, u) => u(!v))}
                    remove={update.remove}
                >
                    {value.type}
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
                    Rough
                    <input
                        type="checkbox"
                        className="checkbox"
                        checked={value.mode === 'rough'}
                        onChange={() =>
                            value.mode === undefined
                                ? update.variant('crop').mode.add('rough')
                                : update.variant('crop').mode.remove()
                        }
                    />
                    Hole
                    <input
                        type="checkbox"
                        className="checkbox"
                        checked={value.hole}
                        onChange={(evt) => update.variant('crop').hole(evt.target.checked)}
                    />
                </Disableable>
            );
        case 'scale':
            return (
                <Disableable
                    disabled={value.disabled}
                    toggle={() => update.variant(value.type).disabled((v, u) => u(!v))}
                    remove={update.remove}
                >
                    {value.type}
                    <AnimCoordOrNumberInput
                        label="v"
                        value={value.v}
                        // biome-ignore lint: this one is fine
                        onChange={update.variant('scale').v as Updater<any>}
                    />
                    <AnimCoordInput
                        label="origin"
                        value={value.origin}
                        onChange={update.variant('scale').origin}
                    />
                </Disableable>
            );
        case 'rotate':
            return (
                <Disableable
                    disabled={value.disabled}
                    toggle={() => update.variant(value.type).disabled((v, u) => u(!v))}
                    remove={update.remove}
                >
                    {value.type}
                    <AnimInput
                        label="v"
                        value={value.v}
                        // biome-ignore lint: this one is fine
                        onChange={update.variant('rotate').v as Updater<any>}
                    />
                    <AnimCoordInput
                        label="origin"
                        value={value.origin}
                        onChange={update.variant('rotate').origin}
                    />
                </Disableable>
            );
        case 'stroke':
            return (
                <Disableable
                    disabled={value.disabled}
                    toggle={() => update.variant(value.type).disabled((v, u) => u(!v))}
                    remove={update.remove}
                >
                    {value.type}
                    <AnimInput
                        label="width"
                        value={value.width}
                        // biome-ignore lint: this one is fine
                        onChange={update.variant(value.type).width as Updater<any>}
                    />
                    <AnimValueInput
                        label="round"
                        value={value.round + ''}
                        onChange={(v) => update.variant(value.type).round(v ?? false)}
                    />
                </Disableable>
            );
    }
};
