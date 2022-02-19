import * as React from 'react';
import { segmentsBounds } from '../src/editor/Export';
import { pathToPrimitives } from '../src/editor/findSelection';
import { calcPathD, pathSegs } from '../src/editor/RenderPath';
import { coordKey } from '../src/rendering/calcAllIntersections';
// import { clipPath } from '../src/rendering/clipPath';
import { clipPathNew } from '../src/rendering/clipPathNew';
import { ensureClockwise } from '../src/rendering/pathToPoints';
import {
    addPrevsToSegments,
    calculateSortedHitsForSegments,
} from '../src/rendering/segmentsToNonIntersectingSegments';
import { IntersectionError } from '../src/rendering/untangleHit';
import { Path, Segment } from '../src/types';
import { Drawing, useLocalStorage } from './Canvas';

type TestCase = { shape: Array<Segment>; clip: Array<Segment> };

export const Clip = () => {
    const [testCases, setTestCases] = useLocalStorage(
        'clip-test-cases',
        [] as Array<TestCase>,
    );

    const [testCase, setTestCase] = useLocalStorage('clip-test2', {
        shape: [],
        clip: [],
    } as TestCase);
    const [which, setWhich] = React.useState('shape' as 'shape' | 'clip');

    // testCases.concat([testCase]).forEach((kase, i) => {
    //     examineCase(kase, i);
    // });
    // examineCase(testCase, 0);

    const clipTwo = React.useMemo(() => {
        const cclip =
            testCase.clip.length > 2
                ? ensureClockwise(testCase.clip)
                : testCase.clip;
        const cshape =
            testCase.shape.length > 2
                ? ensureClockwise(testCase.shape)
                : testCase.shape;
        let clipTwo = null as null | Array<Path>;
        try {
            if (cshape.length > 2 && cclip.length > 2) {
                clipTwo = clipPathNew(
                    pathSegs(cshape),
                    cclip,
                    segmentsBounds(cclip),
                    true,
                );
            }
        } catch (err) {
            console.log('nope');
            if (err instanceof IntersectionError) {
                console.log(err.basic, err.entries);
            }
        }
        return clipTwo;
    }, [testCase]);

    const size = 500;
    return (
        <div>
            <button
                onClick={() => {
                    setTestCases((t) => t.concat([testCase]));
                    setTestCase({ shape: [], clip: [] });
                    setWhich('shape');
                }}
            >
                Add test case
            </button>
            <Drawing
                key={which}
                zoom={1}
                segments={testCase[which]}
                setSegments={(s) =>
                    setTestCase((segments) => ({
                        ...segments,
                        [which]: s(segments[which]),
                    }))
                }
                onComplete={() => {}}
                snap={20}
                render={(segs) => {
                    const other =
                        testCase[which === 'shape' ? 'clip' : 'shape'];
                    if (!other.length) {
                        return;
                    }
                    const cclip =
                        testCase.clip.length > 2
                            ? ensureClockwise(testCase.clip)
                            : testCase.clip;
                    const cshape =
                        testCase.shape.length > 2
                            ? ensureClockwise(testCase.shape)
                            : testCase.shape;
                    // const clipped =
                    //     cshape.length > 2 && cclip.length > 2
                    //         ? clipPath(
                    //               { ...pathSegs(cshape), debug: false },
                    //               cclip,
                    //               pathToPrimitives(cclip),
                    //           )
                    //         : null;

                    return (
                        <>
                            <path
                                stroke={'blue'}
                                strokeWidth={3}
                                fill="none"
                                d={calcPathD(pathSegs(other), 1)}
                            />
                            {/* {clipped
                                ? clipped.map((segs, i) => (
                                      <path
                                          stroke={'white'}
                                          strokeWidth={1}
                                          fill="#aaa"
                                          opacity={0.5}
                                          key={i}
                                          d={calcPathD(segs, 1)}
                                      />
                                  ))
                                : null} */}
                            {clipTwo
                                ? clipTwo.map((pathPart, i) => (
                                      <path
                                          stroke={'magenta'}
                                          strokeWidth={1}
                                          fill="#faa"
                                          opacity={0.5}
                                          key={i}
                                          d={calcPathD(pathPart, 1)}
                                      />
                                  ))
                                : null}
                        </>
                    );
                }}
            />
            <button
                disabled={which === 'shape'}
                onClick={() => setWhich('shape')}
            >
                Shape
            </button>
            <button
                disabled={which === 'clip'}
                onClick={() => setWhich('clip')}
            >
                Clip
            </button>
            <button onClick={() => setTestCase({ shape: [], clip: [] })}>
                Clear
            </button>
            <div
                style={{
                    padding: 24,
                    display: 'flex',
                    flexWrap: 'wrap',
                }}
            >
                {testCases.map((tc, i) => (
                    <svg
                        width={200}
                        height={200}
                        key={i}
                        viewBox={`-${size / 2} -${size / 2} ${size} ${size}`}
                        onClick={() => setTestCase(tc)}
                    >
                        <path
                            stroke="red"
                            strokeWidth={3}
                            d={calcPathD(pathSegs(tc.shape), 1)}
                        />
                        <path
                            stroke="blue"
                            strokeWidth={3}
                            fill="none"
                            d={calcPathD(pathSegs(tc.clip), 1)}
                        />
                        {clipPathTry(
                            pathSegs(ensureClockwise(tc.shape)),
                            ensureClockwise(tc.clip),
                            // pathToPrimitives(ensureClockwise(tc.clip)),
                        ).map((clip, i) => (
                            <path
                                stroke="white"
                                strokeWidth={1}
                                fill="#aaa"
                                opacity={0.5}
                                d={calcPathD(clip, 1)}
                                key={i}
                            />
                        ))}
                    </svg>
                ))}
            </div>
        </div>
    );
};

const clipPathTry = (path: Path, clip: Array<Segment>) => {
    try {
        return clipPathNew(path, clip, segmentsBounds(clip));
    } catch (err) {
        return [];
    }
};

function examineCase(kase: TestCase, i: number) {
    const allSegs = addPrevsToSegments(ensureClockwise(kase.shape)).concat(
        addPrevsToSegments(kase.clip),
    );
    // console.log('ok', i, allSegs);
    const { sorted, allHits } = calculateSortedHitsForSegments(allSegs, true);
    const seen: { [key: string]: boolean } = {};
    allHits.forEach((h) => {
        const k = coordKey(h.coord);
        if (seen[k]) {
            console.log('DUP', k);
        }
        seen[k] = true;
    });
    console.log(allHits);
    try {
        console.log(
            'good news',
            clipPathNew(
                pathSegs(ensureClockwise(kase.shape)),
                ensureClockwise(kase.clip),
                segmentsBounds(kase.clip),
            ),
        );
    } catch (err) {
        console.log('No dice');
        if (err instanceof IntersectionError) {
            console.log(err.basic, err.entries);
        }
    }
}
