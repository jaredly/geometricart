import React, {useState, useEffect} from 'react';
import {Color, Entity} from '../export-types';
import {JsonEditor} from './JsonEditor';
import {PatternEditor} from './PatternEditor';
import {GroupEditor} from './GroupEditor';

export const EntityEditor = ({
    palette,
    value,
    onChange,
    onRemove,
}: {
    palette: Color[];
    value: Entity;
    onChange: (next: Entity, nextKey?: string) => void;
    onRemove: () => void;
}) => {
    const [type, setType] = useState<Entity['type']>(value.type);

    useEffect(() => {
        setType(value.type);
    }, [value.type]);

    return (
        <details className="rounded border border-base-300 bg-base-100 p-3 space-y-3">
            <summary className="cursor-pointer hover:text-accent">
                <div className="inline-flex">
                    {value.type}
                    <div className="flex-1" />

                    <button className="btn btn-ghost btn-xs text-error" onClick={onRemove}>
                        Remove
                    </button>
                </div>
            </summary>

            {value.type === 'Group' ? (
                <GroupEditor value={value} onChange={(next) => onChange(next)} />
            ) : null}
            {value.type === 'Pattern' ? (
                <PatternEditor
                    palette={palette}
                    value={value}
                    onChange={(next) => onChange(next)}
                />
            ) : null}
            {value.type === 'Object' ? (
                <div className="space-y-2">
                    <label className="form-control">
                        <div className="label">
                            <span className="label-text font-semibold">Open</span>
                        </div>
                        {/* <input
                        className="toggle toggle-primary"
                        type="checkbox"
                        checked={value.open ?? false}
                        onChange={(evt) => onChange({...value, open: evt.target.checked})}
                    /> */}
                    </label>
                    {/* <JsonEditor
                        label="Segments"
                        value={value.segments}
                        onChange={(segments) =>
                            onChange({...value, segments: segments as Segment[]})
                        }
                    /> */}
                    <JsonEditor
                        label="Style"
                        value={value.style}
                        onChange={(style) => onChange({...value, style})}
                    />
                </div>
            ) : null}
        </details>
    );
};
