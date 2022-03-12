import * as React from 'react';
// import { RenderSegmentBasic } from '../../editor/RenderSegment';
import { Coord, Segment } from '../../types';
import { register } from '../../vest';
import { addPrevsToSegments, SegmentWithPrev } from '../clipPathNew';
import { useInitialState } from '../SegmentEditor';
// import { ShapeEditor } from '../ShapeEditor';
import { RenderDebugInsetSegment } from '../ShowDebugInsetSegment';
import { CoordPicker } from './CoordPicker';
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
            segments={insetLineLine([a, b, c], inset)}
        />
    );
};

register({
    id: 'lineLine',
    dir: __dirname,
    transform: (args) => {
        return insetLineLine(...args);
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
                                {coords.length >= 3 ? (
                                    <ShowDebug
                                        coords={
                                            coords.slice(0, 3) as [
                                                Coord,
                                                Coord,
                                                Coord,
                                            ]
                                        }
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
