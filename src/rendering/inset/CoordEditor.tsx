import * as React from 'react';
import {Coord} from '../../types';
import {maybeSnap} from './CoordPicker';
import {SvgGrid} from './SvgGrid';

const snapCoord = (coord: Coord, margin?: number) => {
    return margin ? {x: maybeSnap(coord.x, margin), y: maybeSnap(coord.y, margin)} : coord;
};

const CoordEditor = ({
    coords,
    onSet,
    onClick,
    constrain,
    margin,
}: {
    coords: Array<Coord>;
    onSet: (coord: Array<Coord>) => void;
    onClick?: (idx: number, evt: React.MouseEvent) => void;
    constrain?: (coord: Coord, idx: number) => Coord;
    margin?: number;
}) => {
    const [state, setState] = React.useState(null as null | {type: 'move'; idx: number});

    const ref = React.useRef(null as null | SVGGElement);
    const moved = React.useRef(false);

    React.useEffect(() => {
        if (!state) {
            return;
        }
        let svg = ref.current!.parentElement!;
        while (svg && svg.nodeName !== 'svg') {
            // console.log(svg.nodeName);
            svg = svg.parentElement!;
        }
        if (!svg) {
            return console.error(`No svg parent`);
        }

        moved.current = false;
        const fn = (evt: MouseEvent) => {
            moved.current = true;
            const box = svg.getBoundingClientRect();
            const nw = coords.slice();
            const coord = snapCoord(
                {
                    x: evt.clientX - box.left,
                    y: evt.clientY - box.top,
                },
                margin,
            );
            nw[state.idx] = constrain ? constrain(coord, state.idx) : coord;
            onSet(nw);
        };
        const up = () => setState(null);
        document.addEventListener('mousemove', fn);
        document.addEventListener('mouseup', up);
        return () => {
            document.removeEventListener('mousemove', fn);
            document.removeEventListener('mouseup', up);
        };
    }, [state]);

    return (
        <>
            <g ref={ref}>
                {coords.map(({x, y}, i) => (
                    <circle
                        key={i}
                        cx={x}
                        cy={y}
                        fill={'red'}
                        r={5}
                        onMouseDown={(evt) => {
                            evt.preventDefault();
                            setState({type: 'move', idx: i});
                        }}
                        onClick={
                            onClick ? (evt) => (moved.current ? null : onClick(i, evt)) : undefined
                        }
                        style={{
                            cursor: 'move',
                        }}
                    />
                ))}
            </g>
        </>
    );
};
