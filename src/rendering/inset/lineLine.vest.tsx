import * as React from 'react';
// import { RenderSegmentBasic } from '../../editor/RenderSegment';
import { Coord, Segment } from '../../types';
import { register } from '../../vest';
import { addPrevsToSegments, SegmentWithPrev } from '../clipPathNew';
import { useInitialState } from '../SegmentEditor';
// import { ShapeEditor } from '../ShapeEditor';
import { RenderDebugInsetSegment } from '../ShowDebugInsetSegment';
import { insetLineLine } from './lineLine';

type Input = [[Coord, Coord, Coord], number];
type Output = Array<Segment>;

const lineWithPrev = (a: Coord, b: Coord): SegmentWithPrev => ({
    shape: -1,
    prev: a,
    segment: { type: 'Line', to: b },
});

const ShowDebug = ({
    coords: [a, b, c],
    inset,
}: {
    coords: [Coord, Coord, Coord];
    inset: number;
}) => {
    const one: Segment = { type: 'Line', to: b };
    const two: Segment = { type: 'Line', to: c };

    return (
        <RenderDebugInsetSegment
            one={lineWithPrev(a, b)}
            two={lineWithPrev(b, c)}
            inset={inset}
            segments={insetLineLine(a, one, two, inset)}
        />
    );
};

export const maybeSnap = (v: number, snap?: number) =>
    snap ? Math.round(v / snap) * snap : v;

export const CoordPicker = ({
    coords,
    onSet,
    children,
}: {
    coords: Array<Coord>;
    onSet: (coord: Array<Coord>) => void;
    children: (rendered: React.ReactChild, coords: Array<Coord>) => JSX.Element;
}) => {
    const [cursor, setCursor] = React.useState(null as null | Coord);

    const clean = (coord: Coord): Coord => {
        const margin = 15;
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

register({
    id: 'lineLine',
    dir: __dirname,
    transform: ([[a, b, c], size]) => {
        return insetLineLine(
            a,
            { type: 'Line', to: b },
            { type: 'Line', to: c },
            size,
        );
    },
    render: {
        editor: ({
            initial,
            onChange,
        }: {
            initial: Input | null;
            onChange: (i: Input) => void;
        }) => {
            const [inset, setInset] = useInitialState(
                initial ? initial[1] : 10,
            );
            const [coords, setCoords] = React.useState(
                initial ? (initial[0] as Coord[]) : [],
            );
            React.useEffect(() => {
                if (coords.length === 3) {
                    onChange([coords as Input[0], inset ?? 10]);
                }
            }, [coords]);
            return (
                <div>
                    <CoordPicker coords={coords} onSet={setCoords}>
                        {(rendered, coords) => (
                            <>
                                {rendered}
                                {coords.length === 3 ? (
                                    <ShowDebug
                                        coords={coords as [Coord, Coord, Coord]}
                                        inset={inset ?? 10}
                                    />
                                ) : null}
                            </>
                        )}
                    </CoordPicker>
                    <button onClick={() => setCoords((c) => c.slice(0, -1))}>
                        Back
                    </button>
                    {initial != null ? (
                        <>
                            <input
                                type="range"
                                min={-100}
                                max={100}
                                value={inset || initial[1]}
                                onChange={(evt) => {
                                    setInset(+evt.target.value);
                                }}
                                onMouseUp={() => {
                                    if (inset != null) {
                                        onChange([initial[0]!, inset!]);
                                        // setInset(null);
                                    } else {
                                    }
                                }}
                            />
                            {inset || initial[1]}
                        </>
                    ) : null}
                </div>
            );
        },
        fixture: ({ input, output }: { input: Input; output: Output }) => {
            return (
                <div>
                    <svg width={300} height={300}>
                        <ShowDebug coords={input[0]} inset={input[1]} />
                    </svg>
                </div>
            );
        },
    },
});
