import React, {useState} from 'react';
import {EyeInvisibleIcon, EyeIcon} from '../../../../icons/Eyes';
import {Color, ShapeStyle} from '../export-types';
import {createFill, createLine} from './createLayerTemplate';
import {NumberField} from './NumberField';
import {LineEditor} from './LineEditor';
import {FillEditor} from './FillEditor';
import {SubStyleList} from './SubStyleList';
import {BaseKindEditor} from './BaseKindEditor';

export const ShapeStyleCard = ({
    value,
    onChange,
    onRemove,
    palette,
}: {
    palette: Color[];
    value: ShapeStyle;
    onChange: (next: ShapeStyle, nextKey?: string) => void;
    onRemove: () => void;
}) => {
    const [show, setShow] = useState(false);
    return (
        <div className="bg-base-100 rounded-xl border border-base-300">
            <div className="p-3 space-y-3">
                <div className="flex flex-col gap-2">
                    <div
                        className="flex flex-row"
                        style={value.disabled ? {color: 'gray'} : undefined}
                    >
                        <button className="btn" onClick={() => setShow(!show)}>
                            {show ? '🔽' : '▶️'}
                        </button>
                        <NumberField
                            label="Order"
                            value={value.order}
                            onChange={(order) => onChange({...value, order})}
                        />
                        {value.t ? JSON.stringify(value.t) : ''}
                        <div className="flex-1" />
                        <button
                            className="btn btn-square btn-sm"
                            onClick={(evt) => {
                                evt.stopPropagation();
                                onChange({...value, disabled: !value.disabled});
                            }}
                        >
                            {value.disabled ? <EyeInvisibleIcon color="gray" /> : <EyeIcon />}
                        </button>
                        <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={(evt) => {
                                evt.stopPropagation();
                                onRemove();
                            }}
                        >
                            Remove
                        </button>
                    </div>
                    <BaseKindEditor
                        label="Kind"
                        value={value.kind}
                        onChange={(kind) => onChange({...value, kind})}
                    />
                </div>
                {show && (
                    <div className="flex flex-col gap-3">
                        <SubStyleList
                            label="Fills"
                            emptyLabel="No fills"
                            items={value.fills}
                            createItem={createFill}
                            render={(key, fill, update, remove) => (
                                <FillEditor
                                    value={fill}
                                    onChange={update}
                                    onRemove={remove}
                                    palette={palette}
                                />
                            )}
                            onChange={(fills) => onChange({...value, fills})}
                        />
                        <SubStyleList
                            label="Lines"
                            emptyLabel="No lines"
                            items={value.lines}
                            createItem={createLine}
                            render={(key, line, update, remove) => (
                                <LineEditor
                                    palette={palette}
                                    value={line}
                                    onChange={update}
                                    onRemove={remove}
                                />
                            )}
                            onChange={(lines) => onChange({...value, lines})}
                        />
                    </div>
                )}
                {/* <ModsEditor value={value.mods} onChange={(mods) => onChange({...value, mods})} /> */}
            </div>
        </div>
    );
};
