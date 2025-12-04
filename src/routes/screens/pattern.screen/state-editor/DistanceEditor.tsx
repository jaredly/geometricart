import React from 'react';
import {BlurInt} from '../../../../editor/Forms';
import {BaseKind} from '../export-types';
import {BlurInput} from './BlurInput';

export const DistanceEditor = ({
    value,
    onChange,
}: {
    value: BaseKind & {type: 'distance'};
    onChange: (v: BaseKind) => void;
}) => {
    return (
        <div>
            <label>
                Corner
                <BlurInt
                    className="input input-sm w-10 mx-2"
                    value={value.corner}
                    onChange={(corner) =>
                        corner != null ? onChange({...value, corner}) : undefined
                    }
                />
                Dist
                <BlurInput
                    className="w-15 mx-2"
                    value={value.distances.map((m) => m.toString()).join(',')}
                    onChange={(dist) => {
                        if (!dist) return;
                        const t = dist.split(',').map((n) => Number(n));
                        if (!t.length || !t.every((n) => Number.isFinite(n))) return;
                        onChange({...value, distances: t});
                    }}
                />
            </label>
        </div>
    );
};
