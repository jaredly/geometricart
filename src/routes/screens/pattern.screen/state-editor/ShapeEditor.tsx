import React from 'react';
import {BarePath, Coord} from '../../../../types';
import {useEditState, usePendingState} from '../editState';
import {JsonEditor} from './JsonEditor';
import {Updater} from '../../../../json-diff/Updater';

export const ShapeEditor = ({
    shape,
    id,
    update,
    onHover,
    onDup,
    onCrop,
}: {
    shape: BarePath & {multiply?: boolean};
    id: string;
    onHover: (v: {type: 'shape'; id: string} | null) => void;
    update: Updater<BarePath & {multiply?: boolean}>;
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
            <div>
                <label>
                    Mulitply
                    <input
                        className="checkbox"
                        checked={!!shape.multiply}
                        type="checkbox"
                        onChange={(evt) => update.multiply.replace(!shape.multiply)}
                    />
                </label>
                <button className="btn btn-sm" onClick={() => update.remove()}>
                    &times;
                </button>
            </div>
        </div>
    );
};
