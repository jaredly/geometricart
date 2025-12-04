import React, {useState} from 'react';
import {EyeInvisibleIcon, EyeIcon} from '../../../../icons/Eyes';
import {Color, ShapeStyle, TChunk} from '../export-types';
import {createFill, createLine} from './createLayerTemplate';
import {NumberField} from './NumberField';
import {LineEditor} from './LineEditor';
import {FillEditor} from './FillEditor';
import {SubStyleList} from './SubStyleList';
import {BaseKindEditor} from './BaseKindEditor';
import {BlurInput} from './BlurInput';
import {easeFunctions} from '../evalEase';

// const serializeChunk = (chunk?: TChunk) => chunk ? `${chunk.chunk}/${chunk.total} ${chunk.ease}` : ''
// const parseChunk = (text: string) => {
//     const match = text.trim().match(/(\d+)\s*\/\s*(\d+)[\s,:=]*(\w+)/)
// }

const ChunkEditor = ({chunk, onChange}: {chunk?: TChunk; onChange: (v?: TChunk) => void}) => {
    return (
        <div>
            <BlurInput
                className="input input-sm w-15 text-center"
                placeholder="chunk"
                value={chunk ? `${chunk.chunk}/${chunk.total}` : ''}
                onChange={(value) => {
                    const [left, right] = value
                        .trim()
                        .split('/')
                        .map((n) => Number(n));
                    if (
                        Number.isFinite(left) &&
                        Number.isInteger(left) &&
                        Number.isFinite(right) &&
                        Number.isInteger(right)
                    ) {
                        onChange(
                            chunk
                                ? {...chunk, chunk: left, total: right}
                                : {chunk: left, total: right, ease: ''},
                        );
                    } else {
                        onChange(undefined);
                    }
                }}
            />
            {chunk && (
                <select
                    className="select select-sm w-20"
                    value={chunk.ease}
                    onChange={(evt) => onChange({...chunk, ease: evt.target.value})}
                >
                    <option value="">straight</option>
                    {Object.keys(easeFunctions).map((name) => (
                        <option key={name} value={name}>
                            {name}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );
};

export const ShapeStyleCard = ({
    value,
    onChange,
    onRemove,
    palette,
}: {
    palette: Color[];
    value: ShapeStyle;
    onChange: (next: ShapeStyle) => void;
    onRemove: () => void;
}) => {
    const [show, setShow] = useState(false);
    return (
        <div className="bg-base-100 rounded-xl border border-base-300">
            <div className="p-3 space-y-3">
                <div className="flex flex-col gap-2">
                    <div
                        className="flex flex-row items-center gap-4"
                        style={value.disabled ? {color: 'gray'} : undefined}
                    >
                        <button className="btn" onClick={() => setShow(!show)}>
                            {show ? '🔽' : '▶️'}
                        </button>
                        <input
                            className="input input-sm input-bordered w-10"
                            type="number"
                            value={value.order}
                            step={1}
                            onChange={(evt) => onChange({...value, order: +evt.target.value})}
                        />

                        <ChunkEditor chunk={value.t} onChange={(t) => onChange({...value, t})} />
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
