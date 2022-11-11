import * as React from 'react';
import { calcSegmentsD } from '../editor/RenderPath';
import { Segment } from '../types';
import { register } from '../vest';
import { coordKey } from './coordKey';
import {
    addPrevsToSegments,
    collectRegions,
    getSomeHits,
    prevSegmentsToShape,
    SegmentWithPrev,
} from './clipPathNew';
import {
    cleanUpInsetSegments2,
    removeContainedRegions,
} from './findInternalRegions';
import { insetSegments } from './insetPath';
import { coordsEqual } from './pathsAreIdentical';
import {
    angleDifferences,
    isClockwise,
    pathToPoints,
    pointsAngles,
    totalAngle,
} from './pathToPoints';
import { ShapeEditor } from './ShapeEditor';

type Input = [Array<SegmentWithPrev>, number];
type Output = Array<Array<Segment>>;

// const firstMethod = ([shape, inset]: [Array<SegmentWithPrev>, number]) => {
//     const seg = prevSegmentsToShape(shape);
//     if (!seg) {
//         throw new Error('no shape');
//     }
//     const [insetSeg, corners] = insetSegments(seg, inset);
//     return cleanUpInsetSegments2(insetSeg, corners);
// };

// const secondMethod = ([shape, inset]: [Array<SegmentWithPrev>, number]) => {
//     const seg = prevSegmentsToShape(shape);
//     if (!seg) {
//         throw new Error('no shape');
//     }
//     const [insetSeg, corners] = insetSegments(seg, inset);
//     const withprev = addPrevsToSegments(insetSeg, -1);
//     const hitsResults = getSomeHits(withprev);
//     const regions = collectRegions(withprev, hitsResults!);

//     return removeContainedRegions(
//         regions
//             .map((r) => prevSegmentsToShape(r.segments)!)
//             .filter(isClockwise),
//     );
// };

// const testFn = (
//     fx: Array<{ input: Input }>,
//     fn: (i: Input) => unknown,
//     n: number,
// ) => {
//     const at = performance.now();
//     for (let i = 0; i < n; i++) {
//         // @ts-ignore
//         fx.forEach((fx, i) => {
//             fn(fx.input);
//         });
//     }
//     console.log((performance.now() - at) / n);
// };

// // @ts-ignore
// window.testOne = (n: number, fx: Array<{ input: Input }>) =>
//     testFn(fx, firstMethod, n);
// // @ts-ignore
// window.testTwo = (n: number, fx: Array<{ input: Input }>) =>
//     testFn(fx, secondMethod, n);

const ShowDebug = ({
    shape,
    inset,
}: {
    inset: number;
    shape: Array<SegmentWithPrev>;
}) => {
    const seg = prevSegmentsToShape(shape);
    if (!seg) {
        return null;
    }
    const [insetSeg, corners] = insetSegments(seg, inset);
    const regions = cleanUpInsetSegments2(insetSeg, corners);

    const withprev = addPrevsToSegments(insetSeg, -1);
    const hitsResults = getSomeHits(withprev);
    // TODO: Maybe do the "remove known corners" thing?
    let newInset = [insetSeg];
    if (hitsResults) {
        // const corn: { [key: string]: true } = {};
        // corners.forEach((k) => (corn[coordKey(k)] = true));
        const regions = collectRegions(withprev, hitsResults);
        // OOOH ok, so I think the way to remove internal ones is:
        // find shared corners between regions, and then it'll be easy to
        // spot (using isExit between the enter/exit of the other)
        // which one is the inside one.
        // Will that be faster than what I'm doing now? Maybe? At least
        // that doesn't require a collision check all over the place?

        // You know I bet collectRegions could keep a handle on touchpoints
        // between regions. And even know .. whether .... one is obviously
        // internal or external .. to the other. wait. hmmm. wait.

        newInset = removeContainedRegions(
            regions
                // .filter((region) => region.isInternal !== true)
                // .filter(
                //     (region) =>
                //         !region.segments.some((s) => corn[coordKey(s.segment.to)]),
                // )
                .map((r) => prevSegmentsToShape(r.segments)!)
                .filter(isClockwise),
        );
    }

    return (
        <>
            {shape.map((seg, i) =>
                seg.segment.type === 'Arc' ? (
                    <circle
                        key={i}
                        r={4}
                        fill="white"
                        opacity={0.5}
                        cx={seg.segment.center.x}
                        cy={seg.segment.center.y}
                    />
                ) : null,
            )}
            <path
                d={calcSegmentsD(seg, seg[seg.length - 1].to, undefined, 1)}
                stroke="white"
                opacity={0.2}
                strokeWidth={2}
                fill="none"
            />
            <path
                d={calcSegmentsD(
                    insetSeg,
                    insetSeg[insetSeg.length - 1].to,
                    undefined,
                    1,
                )}
                stroke="green"
                opacity={0.2}
                strokeWidth={2}
                fill="none"
            />
            {regions.map((region, i) => (
                <path
                    key={i}
                    stroke="red"
                    fill="none"
                    strokeWidth={2}
                    d={calcSegmentsD(
                        region,
                        region[region.length - 1].to,
                        false,
                        1,
                    )}
                />
            ))}
            {newInset?.map((region, i) => (
                <path
                    key={i}
                    stroke="white"
                    fill="none"
                    strokeWidth={1}
                    strokeDasharray={'1 5'}
                    d={calcSegmentsD(
                        region,
                        region[region.length - 1].to,
                        false,
                        1,
                    )}
                />
            ))}
        </>
    );
};

register({
    id: 'inset',
    dir: __dirname,
    transform: ([segments, size]) => {
        const seg = prevSegmentsToShape(segments);
        if (!seg) {
            throw new Error(`Not a shape`);
        }
        const [inset, corners] = insetSegments(seg, size);
        return cleanUpInsetSegments2(inset, corners);
    },
    render: {
        editor: ({
            initial,
            onChange,
        }: {
            initial: Input | null;
            onChange: (i: Input) => void;
        }) => {
            const [inset, setInset] = React.useState(null as null | number);
            return (
                <div>
                    <ShapeEditor
                        initial={initial ? initial[0] : null}
                        onChange={(v) =>
                            onChange([v, initial ? initial[1] : 10])
                        }
                    >
                        {(shape, rendered) => (
                            <>
                                {rendered}
                                {shape?.length ? (
                                    <ShowDebug
                                        inset={
                                            inset != null
                                                ? inset
                                                : initial
                                                ? initial[1]
                                                : 10
                                        }
                                        shape={shape}
                                    />
                                ) : null}
                            </>
                        )}
                    </ShapeEditor>
                    <button onClick={() => onChange([[], 10])}>Clear</button>
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
                                    onChange([initial![0], inset!]);
                                    setInset(null);
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
                        <ShowDebug inset={input[1]} shape={input[0]} />
                    </svg>
                </div>
            );
        },
    },
});
