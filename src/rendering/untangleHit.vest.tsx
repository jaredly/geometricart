import * as React from 'react';
import { ShowHitIntersection } from '../editor/DebugOrigPath';
import { RenderSegmentBasic } from '../editor/RenderSegment';
import { Coord } from '../types';
import { register } from '../vest';
import { intersectSegments, SegmentWithPrev } from './clipPathNew';
import { SegmentEditor, useInitialState } from './SegmentEditor';
import { HitTransitions, untangleHit } from './untangleHit';

type Input = Array<SegmentWithPrev>;
type Output = { pair: HitTransitions; coord: Coord };

const Editor = ({
    initial,
    onChange,
}: {
    initial: Input | null;
    onChange: (i: Input) => void;
}) => {
    const [current, setCurrent] =
        useInitialState<Array<SegmentWithPrev> | null>(initial);

    React.useEffect(() => {
        if (!current) return;
        const { hits } = intersectSegments(current);
        if (Object.keys(hits).length === 1) {
            onChange(current);
        }
    }, [current]);

    return (
        <div>
            <SegmentEditor
                key={current?.length || '0'}
                initial={null}
                onChange={(seg) => {
                    seg = { ...seg, shape: 0 };
                    const next = (current || []).concat([seg]);
                    setCurrent(next);
                }}
            >
                {(segment, rendered) => {
                    const { hits } = intersectSegments(
                        (current || []).concat(segment ? [segment] : []),
                    );
                    let hitt = null;
                    if (Object.keys(hits).length === 1) {
                        const k = Object.keys(hits);
                        try {
                            hitt = untangleHit(hits[k[0]].parties);
                        } catch (e) {}
                    }

                    return (
                        <>
                            {current?.map((current, i) => (
                                <RenderSegmentBasic
                                    key={i}
                                    prev={current.prev}
                                    segment={current.segment}
                                    inner={{
                                        stroke: ['red', 'green', 'blue'][
                                            current.shape
                                        ],
                                        strokeWidth: 2,
                                    }}
                                    zoom={1}
                                />
                            ))}
                            {rendered}
                            {hitt ? (
                                <ShowHitIntersection
                                    pair={hitt}
                                    zoom={1}
                                    arrowSize={40}
                                    coord={hits[Object.keys(hits)[0]].coord}
                                />
                            ) : null}
                        </>
                    );
                }}
            </SegmentEditor>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {current?.map((c, i) => (
                    <div key={i}>
                        <div>Shape {i}</div>
                        <input
                            type="number"
                            value={c.shape}
                            style={{ width: 50 }}
                            onChange={(evt) =>
                                setCurrent((c) => {
                                    c = c!.slice();
                                    c[i] = {
                                        ...c[i],
                                        shape: +evt.target.value,
                                    };
                                    return c;
                                })
                            }
                        />
                        <button
                            onClick={() => {
                                setCurrent((c) => {
                                    c = c!.slice();
                                    c.splice(i, 1);
                                    return c;
                                });
                            }}
                        >
                            x
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Fixture = ({
    input,
    output,
    previous,
}: {
    input: Input;
    output: Output;
    previous: {
        output: Output | null;
        isPassing: boolean;
    };
}) => {
    return (
        <div>
            Fixture
            <svg width={300} height={300}>
                {input.map((current, i) => (
                    <RenderSegmentBasic
                        key={i}
                        prev={current.prev}
                        segment={current.segment}
                        inner={{
                            stroke: ['red', 'green', 'blue'][current.shape],
                            strokeWidth: 2,
                        }}
                        zoom={1}
                    />
                ))}
                <ShowHitIntersection
                    pair={output.pair}
                    zoom={1}
                    arrowSize={40}
                    coord={output.coord}
                />
            </svg>
        </div>
    );
};

register({
    id: 'untangleHit',
    dir: __dirname,
    transform: (segments: Input) => {
        const { hits } = intersectSegments(segments);
        const k = Object.keys(hits);
        if (k.length !== 1) {
            throw new Error(`Must have only one intersection`);
        }
        return {
            pair: untangleHit(hits[k[0]].parties),
            coord: hits[k[0]].coord,
        };
    },
    render: {
        editor: Editor,
        fixture: Fixture,
    },
});
