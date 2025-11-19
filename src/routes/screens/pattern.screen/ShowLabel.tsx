import {Coord} from '../../../types';

export function ShowLabel({
    label,
    boxSize,
    size,
    hover,
}: {
    label: {
        i: number;
        j: number;
        label: {angle?: string; lengths: {left: string; right: string}};
        pos: Coord;
    };
    boxSize: number;
    size: number;
    hover: number | null;
}) {
    const x = ((label.pos.x + boxSize / 2) / boxSize) * size;
    const y = ((label.pos.y + boxSize / 2) / boxSize) * size;
    return (
        <div
            key={label.i + ',' + label.j}
            style={{
                left: x,
                top: y,
                position: 'absolute',
                pointerEvents: 'none',
            }}
            className="bg-base-100 px-2 py-1 rounded opacity-80"
        >
            {label.label.angle ? label.label.angle + ' • ' : null}
            <span className={label.i === hover ? 'font-bold text-amber-300' : ''}>
                {' '}
                {label.label.lengths.left}{' '}
            </span>
            :
            <span className={label.j === hover ? 'font-bold text-amber-300' : ''}>
                {' '}
                {label.label.lengths.right}{' '}
            </span>
        </div>
    );
}
