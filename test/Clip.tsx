import * as React from 'react';
import { ShowHitIntersection } from '../src/editor/ShowHitIntersection';
import { segmentsBounds } from '../src/editor/Bounds';
import { pathToPrimitives } from '../src/editor/findSelection';
import { calcPathD, pathSegs } from '../src/editor/RenderPath';
import { coordKey } from '../src/rendering/calcAllIntersections';
// import { clipPath } from '../src/rendering/clipPath';
import {
    addPrevsToSegments,
    clipPathNew,
    getSomeHits,
    HitsInfo,
} from '../src/rendering/clipPathNew';
import { simplifyPath } from '../src/rendering/simplifyPath';
import { ensureClockwise } from '../src/rendering/pathToPoints';
import { calculateSortedHitsForSegments } from '../src/rendering/segmentsToNonIntersectingSegments';
import { IntersectionError } from '../src/rendering/untangleHit';
import { Path, Segment } from '../src/types';
import { Drawing, useLocalStorage, validSegments } from './Canvas';

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

    const clipTwo = React.useMemo((): null | [Array<Path>, HitsInfo] => {
        console.log(testCase);
        const cclip = validSegments(testCase.clip)
            ? ensureClockwise(testCase.clip)
            : testCase.clip;
        const cshape = validSegments(testCase.shape)
            ? ensureClockwise(testCase.shape)
            : testCase.shape;
        let clipTwo = null as null | Array<Path>;
        let clipData = null as null | HitsInfo;
        try {
            if (validSegments(cshape) && validSegments(cclip)) {
                clipData = getSomeHits(
                    addPrevsToSegments(cshape, 0).concat(
                        addPrevsToSegments(cclip, 1),
                    ),
                );
                clipTwo = clipPathNew(
                    pathSegs(simplifyPath(cshape)),
                    cclip,
                    segmentsBounds(cclip),
                    true,
                );
            }
        } catch (err) {
            console.log('nope', err);
            if (err instanceof IntersectionError) {
                console.log(err.basic, err.entries);
            }
        }
        return clipTwo && clipData ? [clipTwo, clipData] : null;
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
                    // const cclip =
                    //     testCase.clip.length > 2
                    //         ? ensureClockwise(testCase.clip)
                    //         : testCase.clip;
                    // const cshape =
                    //     testCase.shape.length > 2
                    //         ? ensureClockwise(testCase.shape)
                    //         : testCase.shape;
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
                                ? clipTwo[0].map((pathPart, i) => (
                                      <React.Fragment key={i}>
                                          <path
                                              stroke={'magenta'}
                                              strokeWidth={1}
                                              fill="#faa"
                                              opacity={0.5}
                                              key={i}
                                              d={calcPathD(pathPart, 1)}
                                          />
                                          {pathPart.segments.map((p, i) => (
                                              <circle
                                                  key={i}
                                                  cx={p.to.x}
                                                  cy={p.to.y}
                                                  r={2}
                                                  fill="yellow"
                                              />
                                          ))}
                                      </React.Fragment>
                                  ))
                                : null}
                            {clipTwo
                                ? Object.keys(clipTwo[1].hits).map((k) => {
                                      const zoom = 1;
                                      const coord = clipTwo[1].hits[k].coord;
                                      const type = clipTwo[1].hitPairs[k].type;
                                      const colors = {
                                          straight: 'red',
                                          cross: 'green',
                                          ambiguous: 'magenta',
                                      };
                                      return (
                                          <React.Fragment key={k}>
                                              {/* <circle
                                                  cx={coord.x * zoom}
                                                  cy={coord.y * zoom}
                                                  r={3}
                                                  fill={colors[type]}
                                              /> */}
                                              <ShowHitIntersection
                                                  coord={coord}
                                                  pair={clipTwo[1].hitPairs[k]}
                                                  zoom={zoom}
                                                  arrowSize={10}
                                              />
                                          </React.Fragment>
                                      );
                                  })
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
                    <div
                        key={i}
                        className="hover"
                        style={{ position: 'relative' }}
                    >
                        <svg
                            width={200}
                            height={200}
                            viewBox={`-${size / 2} -${
                                size / 2
                            } ${size} ${size}`}
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
                        <button
                            className="hovershow"
                            onClick={() => {
                                const cases = testCases.slice();
                                cases.splice(i, 1);
                                setTestCases(cases);
                            }}
                            style={{
                                cursor: 'pointer',
                                position: 'absolute',
                                top: 0,
                                right: 0,
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

const clipPathTry = (path: Path, clip: Array<Segment>) => {
    try {
        return clipPathNew(path, clip, segmentsBounds(clip));
    } catch (err) {
        return [];
    }
};

function examineCase(kase: TestCase, i: number) {
    const allSegs = addPrevsToSegments(ensureClockwise(kase.shape), 0).concat(
        addPrevsToSegments(kase.clip, 1),
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
