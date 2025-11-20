import {Coord} from '../../../types';
import React from 'react';

export function ShowLabel({
    label,
    box,
    size,
    hover,
    setHover,
}: {
    label: {
        left: number;
        right: number;
        label: {angle?: string; lengths: {left: string; right: string}};
        pos: Coord;
    };
    box: {x: number; y: number; width: number; height: number};
    size: number;
    setHover: (h: number | null) => void;
    hover: number | null;
}) {
    const x = ((label.pos.x - box.x) / box.width) * size;
    const y = ((label.pos.y - box.y) / box.height) * size;
    return (
        <div
            key={label.left + ',' + label.right}
            style={{
                left: x,
                top: y,
                whiteSpace: 'nowrap',
                position: 'absolute',
                pointerEvents: 'none',
            }}
            className="bg-base-100 px-2 py-1 rounded opacity-80"
        >
            {label.label.angle ? label.label.angle + ' • ' : null}
            <span
                className={label.left === hover ? 'font-bold text-amber-300' : ''}
                onMouseEnter={() => setHover(label.left)}
                onMouseLeave={() => setHover(null)}
            >
                {' '}
                {label.label.lengths.left}{' '}
            </span>
            :
            <span
                className={label.right === hover ? 'font-bold text-amber-300' : ''}
                onMouseEnter={() => setHover(label.right)}
                onMouseLeave={() => setHover(null)}
            >
                {' '}
                {label.label.lengths.right}{' '}
            </span>
        </div>
    );
}
