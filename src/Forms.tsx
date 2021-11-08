/* @jsx jsx */
import { jsx } from '@emotion/react';
import * as React from 'react';
import { Mirror } from './types';

export const Int = ({
    value,
    onChange,
}: {
    value: number;
    onChange: (v: number) => unknown;
}) => {
    return (
        <input
            value={value}
            onChange={(evt) => onChange(+evt.target.value)}
            step="1"
            type="number"
        />
    );
};

export const Label = ({ text }: { text: string }) => (
    <div
        css={{
            fontWeight: 'bold',
        }}
    >
        {text}
    </div>
);

export const MirrorForm = ({
    mirror,
    onChange,
}: {
    mirror: Mirror;
    onChange: (m: Mirror) => unknown;
}) => {
    return (
        <div>
            Mirror
            <div>
                <Label text="rotations" />
                <Int
                    value={mirror.rotational.length}
                    onChange={(number) => {
                        let rotational = mirror.rotational;
                        if (number < mirror.rotational.length) {
                            rotational = rotational.slice(0, number);
                        } else {
                            rotational = rotational.slice();
                            for (let i = rotational.length; i < number; i++) {
                                rotational.push(true);
                            }
                        }
                        onChange({ ...mirror, rotational });
                    }}
                />
            </div>
        </div>
    );
};
