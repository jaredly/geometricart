import * as React from 'react';
import { calcSegmentsD } from '../editor/calcPathD';
import { Segment } from '../types';
import { register } from '../vest';
import { prevSegmentsToShape, SegmentWithPrev } from './clipPathNew';
import { coordsEqual } from './pathsAreIdentical';
import {
    angleDifferences,
    isClockwise,
    pathToPoints,
    pointsAngles,
    rasterSegPoints,
    totalAngle,
} from './pathToPoints';
import { ShapeEditor } from './ShapeEditor';

type Input = Array<SegmentWithPrev>;
type Output = boolean;

const ShowDebug = ({ shape }: { shape: Array<SegmentWithPrev> }) => {
    const last = shape[shape.length - 1].segment.to;
    const segs = shape
        .map((s) => s.segment)
        .concat(
            coordsEqual(last, shape[0].prev)
                ? []
                : [{ type: 'Line', to: shape[0].prev }],
        );
    const points = rasterSegPoints(pathToPoints(segs, true));
    const angles = pointsAngles(points);
    const diffs = angleDifferences(angles);
    calcSegmentsD;
    return (
        <>
            <path
                d={calcSegmentsD(segs, segs[segs.length - 1].to, undefined, 1)}
                stroke="white"
                opacity={0.2}
                strokeWidth={2}
                fill="none"
            />
            <polygon
                points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                stroke={isClockwise(segs) ? 'green' : 'red'}
                strokeWidth={1}
                fill="none"
            />
            {points.map((p, i) => (
                <React.Fragment key={i}>
                    <circle cx={p.x} cy={p.y} r={2} fill="white" />
                    <text
                        x={points[i === 0 ? points.length - 1 : i - 1].x + 10}
                        y={points[i === 0 ? points.length - 1 : i - 1].y}
                        fill="red"
                    >
                        {/* {((angles[i] * 180) / Math.PI).toFixed(0)}, */}
                        {((diffs[i] * 180) / Math.PI).toFixed(0)}
                    </text>
                </React.Fragment>
            ))}
            <text x={last.x + 10} y={last.y + 30} fill="white">
                {((totalAngle(segs) * 180) / Math.PI).toFixed(2)}
            </text>
        </>
    );
};

register({
    id: 'isClockwise',
    dir: __dirname,
    transform: (segments) => {
        const seg = prevSegmentsToShape(segments);
        if (!seg) {
            throw new Error(`Not a shape`);
        }
        return isClockwise(seg);
    },
    render: {
        editor: ({
            initial,
            onChange,
        }: {
            initial: Input | null;
            onChange: (i: Input) => void;
        }) => {
            return (
                <div>
                    <ShapeEditor initial={initial} onChange={onChange}>
                        {(shape, rendered) => {
                            if (!shape || !shape.length) {
                                return rendered;
                            }
                            return (
                                <>
                                    {rendered}
                                    <ShowDebug shape={shape} />
                                </>
                            );
                        }}
                    </ShapeEditor>
                </div>
            );
        },
        fixture: ({ input, output }: { input: Input; output: Output }) => {
            return (
                <div>
                    {output + ''}
                    <svg width={300} height={300}>
                        <ShowDebug shape={input} />
                    </svg>
                </div>
            );
        },
    },
});
