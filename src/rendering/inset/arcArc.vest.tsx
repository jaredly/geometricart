import * as React from 'react';
// import { RenderSegmentBasic } from '../../editor/RenderSegment';
import { ArcSegment, Coord, Segment } from '../../types';
import { register } from '../../vest';
import { addPrevsToSegments, SegmentWithPrev } from '../clipPathNew';
import { useInitialState } from '../SegmentEditor';
import { ShapeEditor } from '../ShapeEditor';
// import { ShapeEditor } from '../ShapeEditor';
import { RenderDebugInsetSegment } from '../ShowDebugInsetSegment';
import { insetArcArc } from './arcArc';
import { CoordPicker } from './CoordPicker';
import { insetLineLine } from './lineLine';
import { SvgGrid } from './SvgGrid';

type Input = [[Coord, ArcSegment, ArcSegment], number];
type Output = Array<Segment>;

const ShowDebug = ({ input: [[prev, one, two], inset] }: { input: Input }) => {
    return (
        <RenderDebugInsetSegment
            one={{ prev, segment: one, shape: -1 }}
            two={{ prev: one.to, segment: two, shape: -1 }}
            inset={inset}
            segments={insetArcArc(prev, one, two, inset)}
        />
    );
};

register({
    id: 'arcArc',
    dir: __dirname,
    transform: ([[prev, one, two], size]) => {
        return insetArcArc(prev, one, two, size);
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
                    <ShapeEditor
                        initial={
                            initial
                                ? [
                                      {
                                          prev: initial[0][0],
                                          segment: initial[0][1],
                                          shape: -1,
                                      },
                                      {
                                          prev: initial[0][1].to,
                                          segment: initial[0][2],
                                          shape: -1,
                                      },
                                  ]
                                : null
                        }
                        allowOpen
                        onChange={(v) => {
                            if (
                                v.length === 2 &&
                                v[0].segment.type === 'Arc' &&
                                v[1].segment.type === 'Arc'
                            ) {
                                onChange([
                                    [v[0].prev, v[0].segment, v[1].segment],
                                    initial ? initial[1] : 10,
                                ]);
                            }
                        }}
                    >
                        {(shape, rendered) => (
                            <>
                                {rendered}
                                {shape?.length === 2 &&
                                shape[0].segment.type === 'Arc' &&
                                shape[1].segment.type === 'Arc' ? (
                                    <ShowDebug
                                        input={[
                                            [
                                                shape[0].prev,
                                                shape[0].segment,
                                                shape[1].segment,
                                            ],
                                            inset,
                                            // initial ? initial[1] : 10,
                                        ]}
                                    />
                                ) : null}
                            </>
                        )}
                    </ShapeEditor>

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
                        <SvgGrid size={15} />
                        <ShowDebug input={input} />
                    </svg>
                </div>
            );
        },
    },
});
