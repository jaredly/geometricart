import {useState} from 'react';
import {CogIcon} from '../../../../icons/Icon';
import {Updater} from '../../../../json-diff/Updater';
import {AnimatableColor, Color, FillOrLine, PMods} from '../export-types';
import {AnimColor} from './AnimColor';
import {addMod} from './createLayerTemplate';
import {BooleanInput, ExpandableEditor, Labeled, NumberInput} from './ExpandableEditor';
import {PModEditor} from './PModEditor';
import {ShadowEditor} from './ShadowEditor';

export const FillEditor = ({
    value,
    update,
    palette,
    reId,
}: {
    palette: Color[];
    value: FillOrLine;
    update: Updater<FillOrLine>;
    reId(newKey: string): void;
}) => {
    const [showAll, setShowAll] = useState(false);
    return (
        <div className="space-y-2 relative">
            <div className="flex flex-wrap gap-2 items-center">
                <button className="btn btn-ghost btn-xs text-error " onClick={update.$remove}>
                    &times;
                </button>
                <ExpandableEditor value={value.id} onChange={reId} />
                <button className="btn btn-ghost btn-xs " onClick={() => setShowAll(!showAll)}>
                    <CogIcon />
                </button>
                {[
                    <Labeled text="Enabled" key="enabled">
                        <BooleanInput
                            value={value.enabled}
                            onChange={(enabled) => update.enabled(enabled)}
                        />
                    </Labeled>,
                    <Labeled text="Opacity" key="opacity">
                        <NumberInput
                            value={value.opacity}
                            onChange={(opacity) => update.opacity(opacity)}
                        />
                    </Labeled>,
                    <Labeled text="zIndex" key="zIndex">
                        <NumberInput
                            value={value.zIndex}
                            onChange={(zIndex) => update.zIndex(zIndex)}
                        />
                    </Labeled>,
                    <AnimColor
                        key="color"
                        palette={palette}
                        label="Color"
                        value={value.color}
                        // biome-ignore lint: this one is fine
                        onChange={update.color.$replace}
                    />,
                    <AnimColor
                        key="tint"
                        palette={palette}
                        label="Tint"
                        value={value.tint}
                        placeholder="rgb or hsl"
                        onChange={(tint, when) => update.tint(tint as AnimatableColor, when)}
                    />,
                    <Labeled text="Rounded" key="rounded">
                        <NumberInput
                            value={value.rounded}
                            onChange={(rounded) => update.rounded(rounded)}
                        />
                    </Labeled>,
                    <Labeled text="shadow" key="shadow" className="bg-base-100 p-2 relative">
                        <ShadowEditor
                            value={value.shadow ?? null}
                            update={update.shadow}
                            palette={palette}
                        />
                    </Labeled>,
                    <ModsEditor
                        key="mods"
                        palette={palette}
                        mods={value.mods}
                        update={update.mods}
                    />,
                ].map((node) =>
                    showAll || nonNullArray(value[node.key as keyof typeof value]) ? node : null,
                )}
                {value.line ? (
                    <>
                        <Labeled text="Width" key="width">
                            <NumberInput
                                value={value.line.width}
                                onChange={(width) => update.line.width(width)}
                            />
                        </Labeled>
                        <Labeled text="Sharp" key="sharp">
                            <BooleanInput
                                value={value.line.sharp}
                                onChange={update.line.sharp.$replace}
                            />
                        </Labeled>
                        <button className="btn btn-disabled">line</button>
                        <button onClick={() => update.line.$remove()} className="btn">
                            fill
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => update.line({width: 1})} className="btn">
                            line
                        </button>
                        <button className="btn btn-disabled">fill</button>
                    </>
                )}
            </div>
        </div>
    );
};

export const nonNullArray = (value: unknown) =>
    Array.isArray(value) ? value.length : value != null;

export const ModsEditor = ({
    mods,
    update,
    palette,
}: {
    palette: Color[];
    mods: PMods[];
    update: Updater<PMods[]> | Updater<PMods[] | undefined>;
}) => (
    <div>
        <div className="font-semibold text-sm flex flex-row gap-4 items-center">
            Mods
            <select
                className="select select-sm w-50"
                value=""
                onChange={(evt) => {
                    (update as Updater<PMods[] | undefined>).$update((a, u) =>
                        a
                            ? u.$push(addMod(evt.target.value as PMods['type']))
                            : u([addMod(evt.target.value as PMods['type'])]),
                    );
                    // update.push(addMod(evt.target.value));
                }}
            >
                <option disabled value="">
                    Add
                </option>
                {['inset', 'translate', 'crop', 'scale', 'rotate', 'stroke'].map((type) => (
                    <option value={type} key={type}>
                        {type}
                    </option>
                ))}
            </select>
        </div>

        {mods.map((mod, i) => (
            <PModEditor key={i} value={mod} palette={palette} update={update[i]} />
        ))}
    </div>
);
