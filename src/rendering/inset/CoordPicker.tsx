import * as React from 'react';
import { Coord } from '../../types';
import { SvgGrid } from './SvgGrid';

export const CoordPicker = ({
    coords,
    onSet,
    children,
    constrain,
}: {
    coords: Array<Coord>;
    onSet: (coord: Array<Coord>) => void;
    children: (rendered: JSX.Element, coords: Array<Coord>) => JSX.Element;
    constrain?: (coord: Coord) => Coord;
}) => {
    const [cursor, setCursor] = React.useState(null as null | Coord);

    const clean = (coord: Coord): Coord => {
        const margin = 15;
        if (constrain) {
            return constrain(coord);
        }
        return { x: maybeSnap(coord.x, margin), y: maybeSnap(coord.y, margin) };
    };

    return (
        <svg
            width={300}
            height={300}
            style={{ outline: '1px solid magenta', margin: 1 }}
            onMouseMove={(evt) => {
                const box = evt.currentTarget.getBoundingClientRect();
                setCursor(
                    clean({
                        x: evt.clientX - box.left,
                        y: evt.clientY - box.top,
                    }),
                );
            }}
            onMouseLeave={() => setCursor(null)}
            onClick={(evt) => {
                const box = evt.currentTarget.getBoundingClientRect();
                const coord = clean({
                    x: evt.clientX - box.left,
                    y: evt.clientY - box.top,
                });
                onSet(coords.concat([coord]));
            }}
        >
            <SvgGrid size={15} />
            {children(
                <>
                    {coords.map(({ x, y }, i) => (
                        <circle cx={x} cy={y} fill={'red'} r={5} />
                    ))}
                    {cursor ? (
                        <circle
                            cx={cursor.x}
                            cy={cursor.y}
                            fill={'white'}
                            r={5}
                        />
                    ) : null}
                </>,
                cursor ? coords.concat([cursor]) : coords,
            )}
        </svg>
    );
};

export const maybeSnap = (v: number, snap?: number) =>
    snap ? Math.round(v / snap) * snap : v;
