import * as React from 'react';
import { segmentToPrimitive } from '../editor/findSelection';
import { RenderSegmentBasic } from '../editor/RenderSegment';
import { Coord } from '../types';
import { register } from '../vest';
import { atCircleBottomOrSomething } from './atCircleBottomOrSomething';
import { atLineBottom } from './clipPath';
import { SegmentWithPrev } from './clipPathNew';
import { angleTo, dist, push } from './getMirrorTransforms';
import {
    Circle,
    lineCircle,
    lineLine,
    lineToSlope,
    SlopeIntercept,
    withinLimit,
} from './intersect';
import { SegmentEditor, useInitialState, useOnChange } from './SegmentEditor';

type Pair = [SegmentWithPrev, Coord];
type Which = 'segment' | 'coord';

const Editor = ({
    initial,
    onChange,
}: {
    initial: Pair | null;
    onChange: (pair: Pair) => void;
}) => {
    const [current, setCurrent] = useInitialState<
        [SegmentWithPrev | null, Coord | null] | null
    >(initial);
    const segment = current ? current[0] : null;
    const coord = current ? current[1] : null;

    const [edit, setEdit] = React.useState('segment' as Which);

    useOnChange(initial, (initial) =>
        initial !== current ? setEdit('segment') : null,
    );
    // React.useEffect(() => {
    //     setEdit('segment');
    // }, [initial]);

    const buttons = (
        <div>
            <button
                disabled={edit === 'segment'}
                onClick={() => setEdit('segment')}
            >
                Segment
            </button>
            <button
                disabled={edit === 'coord' || segment === null}
                onClick={() => setEdit('coord')}
            >
                Coord
            </button>
        </div>
    );

    if (edit === 'segment') {
        return (
            <div>
                <SegmentEditor
                    onChange={(p) => setCurrent([p, null])}
                    initial={segment}
                >
                    {(segment, rendered) => (
                        <>
                            {rendered}
                            {coord && segment ? (
                                <circle
                                    cx={coord.x}
                                    cy={coord.y}
                                    fill={
                                        isAtBottom(segment, coord)
                                            ? 'green'
                                            : 'red'
                                    }
                                    r={5}
                                />
                            ) : null}
                        </>
                    )}
                </SegmentEditor>
                {buttons}
            </div>
        );
    } else {
        return (
            <div>
                <CoordPlacer
                    segment={segment!}
                    coord={coord}
                    onSet={(coord) => {
                        setCurrent([segment!, coord]);
                        onChange([segment!, coord]);
                    }}
                />
                {buttons}
            </div>
        );
    }
};

const CoordPlacer = ({
    segment,
    coord,
    onSet,
}: {
    segment: SegmentWithPrev;
    coord: Coord | null;
    onSet: (coord: Coord) => void;
}) => {
    const [cursor, setCursor] = React.useState(null as null | Coord);

    const clean = (coord: Coord): Coord | null => {
        const margin = 5;
        if (dist(coord, segment.prev) < margin) {
            return segment.prev;
        }
        if (dist(coord, segment.segment.to) < margin) {
            return segment.segment.to;
        }
        if (segment.segment.type === 'Line') {
            const si = lineToSlope(segment.prev, segment.segment.to, true);
            const other: SlopeIntercept =
                si.m === 0
                    ? { type: 'line', m: Infinity, b: coord.x }
                    : { type: 'line', m: 0, b: coord.y };
            const int = lineLine(si, other);
            return int;
        }
        const prim = segmentToPrimitive(
            segment.prev,
            segment.segment,
        ) as Circle;
        const theta = angleTo(prim.center, coord);
        const out = push(prim.center, theta, prim.radius * 2);
        const int = lineCircle(prim, lineToSlope(prim.center, out, true));
        // if (withinLimit(prim.limit!, theta)) {
        //     return push(prim.center, theta, prim.radius);
        // }
        // return null;
        return int.length === 1 ? int[0] : null;
    };

    return (
        <svg
            width={300}
            height={300}
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
                if (coord) {
                    onSet(coord);
                }
            }}
        >
            {segment ? (
                <RenderSegmentBasic
                    zoom={1}
                    prev={segment.prev}
                    segment={segment.segment}
                    inner={{
                        stroke: 'blue',
                        strokeWidth: 4,
                    }}
                />
            ) : null}
            {cursor ? (
                <circle
                    cx={cursor.x}
                    cy={cursor.y}
                    fill={isAtBottom(segment, cursor) ? 'green' : 'red'}
                    r={5}
                />
            ) : null}
            {coord ? (
                <circle
                    cx={coord.x}
                    cy={coord.y}
                    fill={isAtBottom(segment, coord) ? 'green' : 'red'}
                    r={5}
                />
            ) : null}
        </svg>
    );
};

const Fixture = ({
    input,
    output,
    previous,
}: {
    input: Pair;
    output: boolean;
    previous: { output: boolean | null; isPassing: boolean };
}) => {
    return (
        <div>
            <svg width={300} height={300}>
                <RenderSegmentBasic
                    zoom={1}
                    prev={input[0].prev}
                    segment={input[0].segment}
                    inner={{
                        stroke: 'blue',
                        strokeWidth: 4,
                    }}
                />
                <circle
                    cx={input[1].x}
                    cy={input[1].y}
                    r={5}
                    fill={output ? 'green' : 'red'}
                />
            </svg>
        </div>
    );
};

const isAtBottom = (segment: SegmentWithPrev, coord: Coord) => {
    return segment.segment.type === 'Line'
        ? atLineBottom(
              coord,
              segmentToPrimitive(
                  segment.prev,
                  segment.segment,
              ) as SlopeIntercept,
          )
        : atCircleBottomOrSomething(
              coord,
              segmentToPrimitive(segment.prev, segment.segment) as Circle,
          );
};

declare const __dirname: string;

register<Pair, boolean>({
    id: 'atBottom',
    dir: __dirname,
    transform: ([segment, coord]) => isAtBottom(segment, coord),
    render: {
        editor: Editor,
        fixture: Fixture,
    },
});
