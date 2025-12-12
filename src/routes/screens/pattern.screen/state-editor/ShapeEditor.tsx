import React from 'react';
import {BarePath, Coord} from '../../../../types';
import {useEditState, usePendingState} from '../editState';
import {JsonEditor} from './JsonEditor';

export const ShapeEditor = ({
    shape,
    id,
    onChange,
    onHover,
    onDup,
    onCrop,
}: {
    shape: BarePath;
    id: string;
    onHover: (v: {type: 'shape'; id: string} | null) => void;
    onChange: (v: BarePath | null) => void;
    onCrop(): void;
    onDup: (p: Coord) => void;
}) => {
    const es = usePendingState();
    return (
        <div
            className="p-4 cursor-pointer hover:bg-base-300"
            onMouseEnter={() => onHover({type: 'shape', id})}
            onMouseLeave={() => onHover(null)}
        >
            Shape
            <button
                className="btn btn-sm"
                onClick={() =>
                    es.update.pending.replace({
                        type: 'dup-shape',
                        id,
                        onDone(point) {
                            onDup(point);
                        },
                    })
                }
            >
                Dup
            </button>
            <button onClick={onCrop} className="btn">
                Crop
            </button>
            <button className="btn btn-sm" onClick={() => onChange(null)}>
                &times;
            </button>
            <details>
                <summary>JSON</summary>

                <JsonEditor label="json" onChange={() => {}} value={shape} />
            </details>
        </div>
    );
};
