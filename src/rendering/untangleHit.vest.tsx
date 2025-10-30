import * as React from 'react';
import {RenderSegmentBasic} from '../editor/RenderSegment';
import {Coord} from '../types';
import {register} from '../vest';
import {HitsInfo, intersectSegments, SegmentWithPrev} from './clipPathNew';
import {SegmentEditor} from './SegmentEditor';
import {useInitialState} from './SegmentEditor.useOnChange.related';
import {HitTransitions, untangleHit} from './untangleHit';
import {ShowHitIntersection2} from '../editor/ShowHitIntersection2';
import {arrow} from '../editor/arrow';
import {pointsList} from '../editor/pointsList';
import {coordsEqual} from './pathsAreIdentical';
import {angleForSegment} from './clipPath';

type Input = Array<SegmentWithPrev>;
type Output = {pair: HitTransitions; coord: Coord};

const getHit = (hits: HitsInfo['hits']) => {
    const keys = Object.keys(hits).sort((a, b) => hits[b].parties.length - hits[a].parties.length);
    if (!keys.length) {
        return null;
    }
    try {
        const hit = hits[keys[0]];
        return {pair: untangleHit(hit.parties), coord: hit.coord};
    } catch (e) {}
    return null;
};

const Editor = ({initial, onChange}: {initial: Input | null; onChange: (i: Input) => void}) => {
    const [current, setCurrent] = useInitialState<Array<SegmentWithPrev> | null>(initial);

    React.useEffect(() => {
        if (!current) return;
        const {hits} = intersectSegments(current);
        if (getHit(hits) != null) {
            onChange(current);
        }
    }, [current]);

    return (
        <div>
            <SegmentEditor
                key={current?.length || '0'}
                initial={null}
                onChange={(seg) => {
                    seg = {...seg, shape: 0};
                    const next = (current || []).concat([seg]);
                    setCurrent(next);
                }}
            >
                {(segment, rendered) => {
                    const {hits} = intersectSegments(
                        (current || []).concat(segment ? [segment] : []),
                    );
                    let hitt = getHit(hits);

                    return (
                        <>
                            {current?.map((current, i) => (
                                <React.Fragment key={i}>
                                    <RenderSegmentBasic
                                        prev={current.prev}
                                        segment={current.segment}
                                        inner={{
                                            stroke: ['red', 'green', 'blue'][current.shape],
                                            strokeWidth: 2,
                                        }}
                                        zoom={1}
                                    />
                                    <SegmentArrows
                                        color={['red', 'green', 'blue'][current.shape]}
                                        size={10}
                                        segment={current}
                                        coord={hitt?.coord || {x: 0, y: 0}}
                                    />
                                </React.Fragment>
                            ))}
                            {rendered}
                            {hitt ? (
                                <>
                                    {/* <ShowHitIntersection
                                        pair={hitt.pair}
                                        zoom={1}
                                        arrowSize={40}
                                        coord={hitt.coord}
                                    /> */}
                                    <ShowHitIntersection2
                                        pair={hitt.pair}
                                        zoom={1}
                                        arrowSize={40}
                                        coord={hitt.coord}
                                    />
                                </>
                            ) : null}
                        </>
                    );
                }}
            </SegmentEditor>
            <div style={{display: 'flex', flexWrap: 'wrap'}}>
                {current?.map((c, i) => (
                    <div key={i}>
                        <div>Shape {i}</div>
                        <input
                            type="number"
                            value={c.shape}
                            style={{width: 50}}
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
                <button onClick={() => setCurrent([])}>Clear</button>
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
                    <React.Fragment key={i}>
                        <RenderSegmentBasic
                            prev={current.prev}
                            segment={current.segment}
                            inner={{
                                stroke: ['red', 'green', 'blue'][current.shape],
                                strokeWidth: 2,
                            }}
                            zoom={1}
                        />
                        <SegmentArrows
                            color={['red', 'green', 'blue'][current.shape]}
                            size={10}
                            segment={current}
                            coord={output.coord}
                        />
                    </React.Fragment>
                ))}
                {/* <ShowHitIntersection
                    pair={output.pair}
                    zoom={1}
                    arrowSize={40}
                    coord={output.coord}
                    segments={input}
                /> */}
                <ShowHitIntersection2
                    pair={output.pair}
                    zoom={1}
                    arrowSize={40}
                    coord={output.coord}
                />
            </svg>
        </div>
    );
};

const SegmentArrows = ({
    coord,
    segment,
    size,
    color,
}: {
    color: string;
    size: number;
    coord: Coord;
    segment: SegmentWithPrev;
}) => {
    return (
        <>
            {coordsEqual(coord, segment.prev) ? null : (
                <polygon
                    points={pointsList(
                        arrow(
                            segment.prev,
                            angleForSegment(segment.prev, segment.segment, segment.prev).theta,
                            size,
                        ),
                    )}
                    fill={color}
                />
            )}
            {coordsEqual(coord, segment.segment.to) ? null : (
                <polygon
                    points={pointsList(
                        arrow(
                            segment.segment.to,
                            angleForSegment(segment.prev, segment.segment, segment.segment.to)
                                .theta,
                            size,
                        ),
                    )}
                    fill={color}
                />
            )}
        </>
    );
};

declare const __dirname: string;
register({
    id: 'untangleHit',
    dir: __dirname,
    transform: (segments: Input) => {
        const {hits} = intersectSegments(segments);
        const hit = getHit(hits);
        if (!hit) {
            throw new Error(`No valid intersection`);
        }
        return hit;
    },
    render: {
        editor: Editor,
        fixture: Fixture,
    },
});
